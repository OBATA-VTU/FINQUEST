
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { AuthContext } from '../contexts/AuthContext';

const GOOGLE_DRIVE_CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const GOOGLE_DRIVE_CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

declare global {
  interface Window {
    google?: any;
  }
}

export const AdminSettingsPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const isSuperAdmin = auth?.user?.role === 'admin';
  const { showNotification } = useNotification();

  const [socialLinks, setSocialLinks] = useState({ facebook: '', twitter: '', instagram: '', whatsapp: '', telegram: '', tiktok: '' });
  const [siteSettings, setSiteSettings] = useState({ session: '2025/2026', showExecutives: true, uploadService: 'dropbox' });
  
  const [driveSettings, setDriveSettings] = useState({ folder_id: '', connected_email: '' });
  const [tokenClient, setTokenClient] = useState<any>(null);

  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
        try {
            const [sDoc, sSetDoc, driveDoc] = await Promise.all([
                getDoc(doc(db, 'content', 'social_links')),
                getDoc(doc(db, 'content', 'site_settings')),
                getDoc(doc(db, 'config', 'google_drive_settings')),
            ]);
            
            if (sDoc.exists()) setSocialLinks(sDoc.data() as any);
            if (sSetDoc.exists()) {
                const data = sSetDoc.data();
                setSiteSettings({ session: data.session || '2025/2026', showExecutives: data.showExecutives !== undefined ? data.showExecutives : true, uploadService: data.uploadService || 'dropbox' });
            }
            if (driveDoc.exists()) setDriveSettings(driveDoc.data() as any);
        } catch (e: any) { console.error("Failed to fetch settings:", e); }
    };
    fetchSettings();

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
        if (window.google) {
            const client = window.google.accounts.oauth2.initCodeClient({
                client_id: GOOGLE_DRIVE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive',
                callback: handleGoogleAuthCallback,
            });
            setTokenClient(client);
        } else {
            showNotification("Could not load Google Sign-In script.", "error");
        }
    };
    document.body.appendChild(script);

    return () => { document.body.removeChild(script); };
  }, []);

  const handleGoogleAuthCallback = async (response: any) => {
      showNotification("Authorization code received. Exchanging for tokens...", "info");
      try {
          if (!GOOGLE_DRIVE_CLIENT_SECRET) {
              throw new Error("Google Client Secret is not configured in Vercel environment variables.");
          }

          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                  code: response.code,
                  client_id: GOOGLE_DRIVE_CLIENT_ID,
                  client_secret: GOOGLE_DRIVE_CLIENT_SECRET,
                  redirect_uri: 'postmessage', 
                  grant_type: 'authorization_code',
              }),
          });
          
          const tokens = await tokenResponse.json();
          if (!tokenResponse.ok) throw new Error(tokens.error_description || "Token exchange failed.");
          if (!tokens.refresh_token) {
              showNotification("Re-authentication required. Please disconnect and reconnect your Google account to grant offline access.", "warning");
          }

          const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          const profile = await profileResponse.json();

          const settingsRef = doc(db, 'config', 'google_drive_settings');
          await setDoc(settingsRef, {
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              expires_at: Date.now() + (tokens.expires_in * 1000),
              folder_id: driveSettings.folder_id,
              connected_email: profile.email,
          }, { merge: true });

          setDriveSettings(prev => ({...prev, connected_email: profile.email}));
          showNotification(`Successfully connected to Google Drive as ${profile.email}.`, "success");
      } catch (error: any) {
          console.error("Google Connection Error:", error);
          showNotification(error.message || "Failed to connect Google Drive.", "error"); 
      }
  };

  const handleGoogleConnect = () => {
      if (!driveSettings.folder_id) {
          showNotification("Please enter a Google Drive Folder ID first.", "error");
          return;
      }
      if (tokenClient) {
          tokenClient.requestCode({ prompt: 'consent' });
      } else {
          showNotification("Google Auth is not ready. Please wait.", "info");
      }
  };

  const handleGoogleDisconnect = async () => {
      if (!window.confirm("Disconnect Google Drive? This will stop new uploads.")) return;
      try {
          await deleteDoc(doc(db, 'config', 'google_drive_settings'));
          setDriveSettings({ folder_id: '', connected_email: '' });
          showNotification("Google Drive disconnected.", "success");
      } catch (e) { showNotification("Failed to disconnect.", "error"); }
  };


  const handleSaveSettings = async () => {
      try {
          await setDoc(doc(db, 'content', 'social_links'), socialLinks);
          await setDoc(doc(db, 'content', 'site_settings'), { 
              session: siteSettings.session, 
              showExecutives: siteSettings.showExecutives,
              uploadService: siteSettings.uploadService
          }, { merge: true });

          await setDoc(doc(db, 'config', 'google_drive_settings'), { folder_id: driveSettings.folder_id }, { merge: true });
          
          showNotification("Settings saved successfully", "success");
      } catch (e) { showNotification("Failed to save settings", "error"); }
  };
  
  const handleWipeRecords = async () => {
    if (wipeConfirmText !== 'FINSA WIPE') {
        showNotification("Confirmation text does not match.", "error");
        return;
    }
    setIsProcessing(true);

    // Corrected list of collections to wipe
    const collectionsToWipe = ['test_results', 'community_messages'];

    try {
        // --- Step 1: Wipe specified collections ---
        for (const coll of collectionsToWipe) {
            const q = query(collection(db, coll));
            const snapshot = await getDocs(q);
            if (snapshot.empty) continue;
            
            let batch = writeBatch(db);
            let count = 0;
            for (const doc of snapshot.docs) {
                batch.delete(doc.ref);
                count++;
                if (count === 499) { // Commit batch every 499 deletes to stay under limits
                    await batch.commit();
                    batch = writeBatch(db);
                    count = 0;
                }
            }
            if (count > 0) {
                await batch.commit();
            }
        }
        
        // --- Step 2: Reset user contribution points to wipe leaderboard ---
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        if (!usersSnapshot.empty) {
            let userBatch = writeBatch(db);
            let userCount = 0;
            for (const userDoc of usersSnapshot.docs) {
                userBatch.update(userDoc.ref, { contributionPoints: 0 });
                userCount++;
                if (userCount === 499) {
                    await userBatch.commit();
                    userBatch = writeBatch(db);
                    userCount = 0;
                }
            }
            if (userCount > 0) {
                await userBatch.commit();
            }
        }

        showNotification("Session data has been wiped successfully.", "success");
    } catch (e) {
        console.error(e);
        showNotification("An error occurred during wipe.", "error");
    } finally {
        setIsProcessing(false);
        setIsWipeModalOpen(false);
        setWipeConfirmText('');
    }
  };
  
  const handleAdvanceLevels = async () => {
    setIsProcessing(true);
    try {
        const q = query(collection(db, 'users'), where('role', '==', 'student'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            showNotification("No student records to advance.", "info");
            setIsProcessing(false);
            setIsAdvanceModalOpen(false);
            return;
        }

        let batch = writeBatch(db);
        let count = 0;
        for (const userDoc of snapshot.docs) {
            const user = userDoc.data();
            const currentLevel = user.level;
            if (currentLevel === 400) {
                batch.update(userDoc.ref, { role: 'alumni', level: 'General' });
            } else if ([100, 200, 300].includes(currentLevel)) {
                batch.update(userDoc.ref, { level: currentLevel + 100 });
            }
            count++;
            if (count === 499) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
            }
        }
        if (count > 0) {
            await batch.commit();
        }

        showNotification("All student levels have been advanced for the new session.", "success");
    } catch (e) {
        console.error(e);
        showNotification("An error occurred during level advancement.", "error");
    } finally {
        setIsProcessing(false);
        setIsAdvanceModalOpen(false);
    }
  };

  const inputStyles = "w-full border border-slate-300 p-2 rounded bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none";
  const labelStyles = "block text-xs font-bold uppercase mb-1 text-slate-600 dark:text-slate-400";
  const sectionStyles = "bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-8";
  const headingStyles = "text-xl font-bold text-slate-800 dark:text-white mb-6";

  return (
    <>
    <div className="animate-fade-in max-w-3xl pb-20">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Platform Settings</h1>
        
        <div className={sectionStyles}>
            <h3 className={headingStyles}>File Upload Service</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Select the primary service for document uploads.</p>
            <div className="space-y-2">
                <label className="flex items-center gap-3 p-4 border dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <input type="radio" name="uploadService" value="dropbox" checked={siteSettings.uploadService === 'dropbox'} onChange={e => setSiteSettings({...siteSettings, uploadService: e.target.value})} className="h-4 w-4 text-indigo-600" />
                    <span className="font-bold dark:text-slate-200">Dropbox</span>
                </label>
                <label className="flex items-center gap-3 p-4 border dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <input type="radio" name="uploadService" value="google_drive" checked={siteSettings.uploadService === 'google_drive'} onChange={e => setSiteSettings({...siteSettings, uploadService: e.target.value})} className="h-4 w-4 text-indigo-600" />
                    <span className="font-bold dark:text-slate-200">Google Drive</span>
                </label>
            </div>
            
            {siteSettings.uploadService === 'google_drive' && (
                <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg space-y-4">
                    <h4 className="font-bold text-indigo-800 dark:text-indigo-300">Google Drive Configuration</h4>
                    <div>
                        <label className={labelStyles}>Google Drive Folder ID</label>
                        <input className={inputStyles} placeholder="Paste Folder ID from URL" value={driveSettings.folder_id} onChange={e => setDriveSettings({...driveSettings, folder_id: e.target.value})} />
                    </div>
                    {driveSettings.connected_email ? (
                        <div className="flex items-center justify-between bg-green-100 dark:bg-green-900/40 p-3 rounded-lg">
                            <p className="text-sm text-green-800 dark:text-green-300">Connected as: <strong>{driveSettings.connected_email}</strong></p>
                            <button onClick={handleGoogleDisconnect} className="text-xs font-bold text-red-600 hover:underline">Disconnect</button>
                        </div>
                    ) : (
                        <button onClick={handleGoogleConnect} className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg flex items-center justify-center gap-2">
                           <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                           Connect Google Drive
                        </button>
                    )}
                </div>
            )}
        </div>

        <div className={sectionStyles}>
             <h3 className={headingStyles}>General Configuration</h3>
             <div><label className={labelStyles}>Current Academic Session</label><input className={inputStyles} value={siteSettings.session} onChange={e => setSiteSettings({...siteSettings, session: e.target.value})} /></div>
        </div>

        <div className={sectionStyles}>
             <h3 className={headingStyles}>Module Visibility</h3>
             <div className="flex items-center justify-between">
                 <div><h4 className="font-bold dark:text-white">Show Executives Page</h4><p className="text-xs text-slate-500 dark:text-slate-400">Toggle to hide the executive list from the public.</p></div>
                 <button onClick={() => setSiteSettings({...siteSettings, showExecutives: !siteSettings.showExecutives})} className={`w-14 h-8 rounded-full p-1 ${siteSettings.showExecutives ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}><div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${siteSettings.showExecutives ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
             </div>
        </div>

        <div className={sectionStyles}>
             <h3 className={headingStyles}>Social Media & Community Links</h3>
             <div className="space-y-4">
                 <div><label className={labelStyles}>WhatsApp</label><input className={inputStyles} value={socialLinks.whatsapp} onChange={e => setSocialLinks({...socialLinks, whatsapp: e.target.value})} /></div>
                 <div><label className={labelStyles}>Telegram</label><input className={inputStyles} value={socialLinks.telegram} onChange={e => setSocialLinks({...socialLinks, telegram: e.target.value})} /></div>
                 <div><label className={labelStyles}>Facebook</label><input className={inputStyles} value={socialLinks.facebook} onChange={e => setSocialLinks({...socialLinks, facebook: e.target.value})} /></div>
                 <div><label className={labelStyles}>Instagram</label><input className={inputStyles} value={socialLinks.instagram} onChange={e => setSocialLinks({...socialLinks, instagram: e.target.value})} /></div>
                 <div><label className={labelStyles}>Twitter / X</label><input className={inputStyles} value={socialLinks.twitter} onChange={e => setSocialLinks({...socialLinks, twitter: e.target.value})} /></div>
                 <div><label className={labelStyles}>TikTok</label><input className={inputStyles} value={socialLinks.tiktok} onChange={e => setSocialLinks({...socialLinks, tiktok: e.target.value})} /></div>
             </div>
        </div>

        <button onClick={handleSaveSettings} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700">Save All Settings</button>

        {isSuperAdmin && (
            <div className="bg-rose-50 dark:bg-rose-900/20 p-8 rounded-2xl border-2 border-dashed border-rose-200 dark:border-rose-500/30 mt-12">
                <h3 className="text-xl font-bold text-rose-800 dark:text-rose-200 mb-4">Danger Zone</h3>
                <div className="space-y-6">
                    <div><h4 className="font-bold text-rose-700 dark:text-rose-300">Advance Academic Session</h4><p className="text-sm text-rose-600 dark:text-rose-400 mb-3">Promote all students to the next level. 400L students become Alumni. This cannot be undone.</p><button onClick={() => setIsAdvanceModalOpen(true)} className="px-5 py-2 bg-rose-500 text-white font-bold rounded-lg">Advance Levels</button></div>
                    <div className="pt-6 border-t border-rose-200 dark:border-rose-500/30"><h4 className="font-bold text-rose-700 dark:text-rose-300">Wipe Session Records</h4><p className="text-sm text-rose-600 dark:text-rose-400 mb-3">Permanently delete Leaderboard, test results, and community chat. This is irreversible.</p><button onClick={() => setIsWipeModalOpen(true)} className="px-5 py-2 bg-rose-700 text-white font-bold rounded-lg">Wipe Session Data</button></div>
                </div>
            </div>
        )}
    </div>

    {isWipeModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setIsWipeModalOpen(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg text-rose-700 dark:text-rose-300">Confirm Data Wipe</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 my-4">This will permanently delete all test results, leaderboard entries, and community messages. To proceed, type <strong className="font-mono text-rose-500">FINSA WIPE</strong> below.</p>
                <input value={wipeConfirmText} onChange={e => setWipeConfirmText(e.target.value)} className={`${inputStyles} font-mono`} />
                <div className="flex gap-2 mt-4"><button onClick={() => setIsWipeModalOpen(false)} className="flex-1 py-2 border border-slate-300 text-slate-700 dark:text-slate-300 dark:border-slate-600 rounded">Cancel</button><button onClick={handleWipeRecords} disabled={isProcessing || wipeConfirmText !== 'FINSA WIPE'} className="flex-1 py-2 bg-rose-600 text-white rounded disabled:opacity-50">{isProcessing ? 'Wiping...' : 'Confirm'}</button></div>
            </div>
        </div>
    )}

    {isAdvanceModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setIsAdvanceModalOpen(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg text-rose-700 dark:text-rose-300">Confirm Level Advancement</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 my-4">This will move all students to their next level (100 to 200, 400 to Alumni). This action cannot be undone and signifies the start of a new session.</p>
                <div className="flex gap-2 mt-4"><button onClick={() => setIsAdvanceModalOpen(false)} className="flex-1 py-2 border border-slate-300 text-slate-700 dark:text-slate-300 dark:border-slate-600 rounded">Cancel</button><button onClick={handleAdvanceLevels} disabled={isProcessing} className="flex-1 py-2 bg-rose-600 text-white rounded disabled:opacity-50">{isProcessing ? 'Processing...' : 'Advance Session'}</button></div>
            </div>
        </div>
    )}
    </>
  );
};

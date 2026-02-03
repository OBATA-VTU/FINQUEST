
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { AuthContext } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { uploadToImgBB } from '../utils/api';

const GOOGLE_DRIVE_CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const GOOGLE_DRIVE_CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

declare global {
  interface Window {
    google?: any;
  }
}

export const AdminSettingsPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const settings = useSettings();
  const isSuperAdmin = auth?.user?.role === 'admin';
  const { showNotification } = useNotification();

  const [socialLinks, setSocialLinks] = useState({ facebook: '', twitter: '', instagram: '', whatsapp: '', telegram: '', tiktok: '' });
  const [siteSettings, setSiteSettings] = useState({ session: '2025/2026', showExecutives: true, uploadService: 'dropbox', googleDriveFolderId: '', googleDriveConnectedEmail: '' });
  const [tokenClient, setTokenClient] = useState<any>(null);

  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
        try {
            const [sDoc, sSetDoc] = await Promise.all([
                getDoc(doc(db, 'content', 'social_links')),
                getDoc(doc(db, 'content', 'site_settings')),
            ]);
            
            if (sDoc.exists()) setSocialLinks(sDoc.data() as any);
            if (sSetDoc.exists()) {
                const data = sSetDoc.data();
                setSiteSettings({
                    session: data.session || '2025/2026',
                    showExecutives: data.showExecutives !== undefined ? data.showExecutives : true,
                    uploadService: data.uploadService || 'dropbox',
                    googleDriveFolderId: data.googleDriveFolderId || '',
                    googleDriveConnectedEmail: data.googleDriveConnectedEmail || ''
                });
            }
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
                redirect_uri: window.location.origin,
                grant_type: 'authorization_code',
              }),
          });
          
          const tokens = await tokenResponse.json();
          if (!tokenResponse.ok) throw new Error(tokens.error_description || "Token exchange failed.");

          const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          const userProfile = await userResponse.json();
          
          // Write secret tokens to a protected location
          await setDoc(doc(db, 'config', 'google_drive_settings'), {
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              expires_at: Date.now() + (tokens.expires_in * 1000),
          }, { merge: true });

          // Write public email and AUTOMATICALLY set upload service to public settings
          await updateDoc(doc(db, 'content', 'site_settings'), {
              googleDriveConnectedEmail: userProfile.email,
              uploadService: 'google_drive'
          });

          showNotification(`Google Drive connected for ${userProfile.email}. Upload service set to Google Drive.`, "success");
          setSiteSettings(prev => ({ ...prev, googleDriveConnectedEmail: userProfile.email, uploadService: 'google_drive' }));

      } catch (error: any) {
          console.error("Google Auth Error:", error);
          showNotification(`Connection failed: ${error.message}`, "error");
      }
  };

  const handleSaveSocial = async () => {
      try {
          await setDoc(doc(db, 'content', 'social_links'), socialLinks);
          showNotification("Social links updated", "success");
      } catch(e) { showNotification("Update failed", "error"); }
  };

  const handleSaveSite = async () => {
      try {
          await updateDoc(doc(db, 'content', 'site_settings'), {
              session: siteSettings.session,
              showExecutives: siteSettings.showExecutives,
              uploadService: siteSettings.uploadService, // Now includes 'mega'
              googleDriveFolderId: siteSettings.googleDriveFolderId
          });
          showNotification("Site settings updated", "success");
      } catch(e) { showNotification("Update failed", "error"); }
  };

  const handleAdvanceSession = async () => {
      setIsProcessing(true);
      try {
          const batch = writeBatch(db);
          
          const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
          usersSnap.forEach(userDoc => {
              const user = userDoc.data();
              if (user.level === 400) {
                  batch.update(userDoc.ref, { role: 'alumni' });
              } else if (typeof user.level === 'number' && user.level < 400) {
                  batch.update(userDoc.ref, { level: user.level + 100 });
              }
          });

          const settingsRef = doc(db, 'content', 'site_settings');
          const oldSettingsSnap = await getDoc(settingsRef);
          const oldSettings = oldSettingsSnap.data() || {};
          const [current, next] = (oldSettings.session || '2025/2026').split('/').map(Number);
          const newSession = `${current + 1}/${next + 1}`;

          batch.update(settingsRef, {
              session: newSession,
              secondToLastSessionEndTimestamp: oldSettings.lastSessionEndTimestamp || new Date('2026-01-10T12:00:00+01:00').toISOString(),
              lastSessionEndTimestamp: new Date().toISOString(),
          });

          batch.update(settingsRef, { showExecutives: false });
          
          await batch.commit();
          
          setSiteSettings(prev => ({...prev, session: newSession, showExecutives: false}));
          showNotification(`Session advanced to ${newSession}. Students promoted.`, "success");
      } catch (e) {
          console.error(e);
          showNotification("Failed to advance session.", "error");
      } finally {
          setIsAdvanceModalOpen(false);
          setIsProcessing(false);
      }
  };

  const handleWipeData = async () => {
      if (wipeConfirmText !== 'WIPE DATA') {
          showNotification("Confirmation text is incorrect.", "error");
          return;
      }
      setIsProcessing(true);
      showNotification("Wipe process started...", "info");
      try {
          const collectionsToWipe = ['test_results', 'community_messages', 'notes', 'lost_items'];
          for (const colName of collectionsToWipe) {
              const collectionRef = collection(db, colName);
              const snapshot = await getDocs(collectionRef);
              
              if (snapshot.empty) continue;

              const batchSize = 500;
              const batches = [];
              let currentBatch = writeBatch(db);
              
              snapshot.docs.forEach((doc, index) => {
                  currentBatch.delete(doc.ref);
                  if ((index + 1) % batchSize === 0) {
                      batches.push(currentBatch);
                      currentBatch = writeBatch(db);
                  }
              });

              if (snapshot.size % batchSize !== 0 || snapshot.size < batchSize) {
                  const lastBatchOps = snapshot.docs.slice(batches.length * batchSize);
                  if (lastBatchOps.length > 0) {
                      const finalBatch = writeBatch(db);
                      lastBatchOps.forEach(doc => finalBatch.delete(doc.ref));
                      batches.push(finalBatch);
                  }
              }
              
              await Promise.all(batches.map(batch => batch.commit()));
              showNotification(`Wiped ${snapshot.size} items from ${colName}.`, "success");
          }
          showNotification("All user-generated data has been wiped.", "success");
      } catch (e: any) { 
          console.error("Wipe failed:", e);
          showNotification(`Wipe failed: ${e.message}`, "error"); 
      }
      finally {
          setIsWipeModalOpen(false);
          setIsProcessing(false);
          setWipeConfirmText('');
      }
  };


  const inputStyles = "w-full border-0 rounded-xl p-3 shadow-sm dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none";
  if (!isSuperAdmin) return <div>Access Denied.</div>;

  return (
    <div className="animate-fade-in pb-20 max-w-4xl mx-auto space-y-8">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Settings</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage global configurations for the portal.</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
             <h3 className="font-bold text-slate-800 dark:text-white mb-4">General & File Uploads</h3>
             <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1 block">Academic Session</label><input className={inputStyles} value={siteSettings.session} onChange={e => setSiteSettings({...siteSettings, session: e.target.value})} /></div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 block">File Upload Service</label>
                      <select className={`${inputStyles} bg-white`} value={siteSettings.uploadService} onChange={e => setSiteSettings({...siteSettings, uploadService: e.target.value})}>
                          <option value="dropbox">Dropbox</option>
                          <option value="google_drive">Google Drive</option>
                          <option value="mega">Mega.nz (BETA)</option> {/* NEW: Mega option */}
                      </select>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl"><input type="checkbox" id="showExecs" checked={siteSettings.showExecutives} onChange={e => setSiteSettings({...siteSettings, showExecutives: e.target.checked})} className="h-4 w-4 rounded" /><label htmlFor="showExecs" className="text-sm font-medium dark:text-slate-300">Show Executives Page</label></div>
                
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                    <h4 className="font-bold text-slate-600 dark:text-slate-300 mb-2">Google Drive Integration</h4>
                    {siteSettings.googleDriveConnectedEmail ? <p className="text-sm text-emerald-600 mb-4">Connected as: {siteSettings.googleDriveConnectedEmail}</p> : <p className="text-sm text-amber-600 mb-4">Not Connected. Connect to enable Google Drive as the storage option.</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-slate-500 mb-1 block">Folder ID</label><input className={inputStyles} placeholder="Enter Google Drive Folder ID" value={siteSettings.googleDriveFolderId} onChange={e => setSiteSettings({...siteSettings, googleDriveFolderId: e.target.value})} /></div>
                        <button onClick={() => tokenClient?.requestCode()} className="bg-white border border-slate-300 text-slate-700 py-2 rounded-lg font-bold self-end flex items-center justify-center gap-2" disabled={!tokenClient}><img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google"/> Connect Drive</button>
                    </div>
                </div>
             </div>
             <button onClick={handleSaveSite} className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-lg font-bold">Save General Settings</button>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
             <h3 className="font-bold text-slate-800 dark:text-white mb-4">Social Media Links</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className={inputStyles} placeholder="Facebook URL" value={socialLinks.facebook} onChange={e => setSocialLinks({...socialLinks, facebook: e.target.value})} />
                <input className={inputStyles} placeholder="Twitter/X URL" value={socialLinks.twitter} onChange={e => setSocialLinks({...socialLinks, twitter: e.target.value})} />
                <input className={inputStyles} placeholder="Instagram URL" value={socialLinks.instagram} onChange={e => setSocialLinks({...socialLinks, instagram: e.target.value})} />
                <input className={inputStyles} placeholder="WhatsApp Channel" value={socialLinks.whatsapp} onChange={e => setSocialLinks({...socialLinks, whatsapp: e.target.value})} />
             </div>
             <button onClick={handleSaveSocial} className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg font-bold">Save Social Links</button>
        </div>

        <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-2xl border-2 border-dashed border-rose-300 dark:border-rose-800">
            <h3 className="font-bold text-rose-800 dark:text-rose-200 mb-4">Danger Zone</h3>
            <div className="space-y-4">
                <button onClick={() => setIsAdvanceModalOpen(true)} className="w-full bg-amber-500 text-white py-3 rounded-lg font-bold">Advance Academic Session</button>
                <button onClick={() => setIsWipeModalOpen(true)} className="w-full bg-rose-600 text-white py-3 rounded-lg font-bold">Wipe User-Generated Data</button>
            </div>
        </div>
        
        {isAdvanceModalOpen && <ConfirmationModal title="Confirm Session Advancement" onConfirm={handleAdvanceSession} onCancel={() => setIsAdvanceModalOpen(false)} isProcessing={isProcessing}>This will promote all students to the next level (400L become Alumni), set the executives page to hidden, and trigger the "Session Wrap" for all users on their next login. This is irreversible.</ConfirmationModal>}
        {isWipeModalOpen && <ConfirmationModal title="Confirm Data Wipe" onConfirm={handleWipeData} onCancel={() => setIsWipeModalOpen(false)} isProcessing={isProcessing} needsTextInput={true} confirmText={wipeConfirmText} onTextChange={setWipeConfirmText}>This will permanently delete all user-generated data has been wiped.</ConfirmationModal>}
    </div>
  );
};


const ConfirmationModal: React.FC<any> = ({ title, onConfirm, onCancel, isProcessing, children, needsTextInput, confirmText, onTextChange }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-sm">
            <h3 className="font-bold text-lg dark:text-white">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-4">{children}</p>
            {needsTextInput && <input value={confirmText} onChange={e => onTextChange(e.target.value)} className="w-full border p-2 rounded mb-4 dark:bg-slate-700 dark:border-slate-600" placeholder="Type WIPE DATA to confirm" />}
            <div className="flex gap-3"><button onClick={onCancel} className="flex-1 py-2 rounded border dark:border-slate-600 dark:text-slate-300">Cancel</button><button onClick={onConfirm} disabled={isProcessing} className="flex-1 py-2 bg-rose-600 text-white rounded font-bold disabled:opacity-50">{isProcessing ? 'Processing...' : 'Confirm'}</button></div>
        </div>
    </div>
);
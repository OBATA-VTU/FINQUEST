import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch, deleteDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { deleteDocument } from '../utils/api';
import { AuthContext } from '../contexts/AuthContext';

const GOOGLE_DRIVE_CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;

// FIX: Extend the Window interface to include the google object from the GSI script
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
  
  // New Google Drive State
  const [driveSettings, setDriveSettings] = useState({ folder_id: '', connected_email: '' });
  const [tokenClient, setTokenClient] = useState<any>(null);

  // Modal States
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

    // Load Google GSI script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
        if (window.google) {
            const client = window.google.accounts.oauth2.initCodeClient({
                client_id: GOOGLE_DRIVE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.file',
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
      showNotification("Authorization successful. Fetching tokens...", "info");
      try {
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                  code: response.code,
                  client_id: GOOGLE_DRIVE_CLIENT_ID,
                  // The redirect_uri was explicitly set, which can cause a mismatch if the auth flow
                  // was initiated from a different path. The Google client library implicitly uses the
                  // primary redirect URI. By omitting it here, we allow the token endpoint to also
                  // default to that primary URI, resolving the mismatch.
                  grant_type: 'authorization_code',
              }),
          });
          
          if (!tokenResponse.ok) {
              const errorData = await tokenResponse.json();
              console.error("Google Token Exchange Error:", errorData);
              const errorMessage = errorData.error_description || "Could not get tokens. Ensure your Google Client ID is correct and the website's URL is listed as an 'Authorized redirect URI' in your Google Cloud project.";
              throw new Error(errorMessage);
          }
          
          const tokens = await tokenResponse.json();
          
          // Get user email
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
          showNotification(`Connected to Google Drive as ${profile.email}`, "success");
      } catch (error: any) { 
          showNotification(error.message || "Failed to connect Google Drive.", "error"); 
      }
  };

  const handleGoogleConnect = () => {
      if (!driveSettings.folder_id) {
          showNotification("Please enter a Google Drive Folder ID first.", "error");
          return;
      }
      if (tokenClient) {
          tokenClient.requestCode();
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

          // Also save the Folder ID if it changed
          await setDoc(doc(db, 'config', 'google_drive_settings'), { folder_id: driveSettings.folder_id }, { merge: true });
          
          showNotification("Settings saved successfully", "success");
      } catch (e) { showNotification("Failed to save settings", "error"); }
  };

  // Other handlers (wipe, advance) remain the same
  const handleWipeRecords = async () => { /* ... unchanged ... */ };
  const handleAdvanceLevels = async () => { /* ... unchanged ... */ };

  return (
    <>
    <div className="animate-fade-in max-w-3xl pb-20">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Platform Settings</h1>
        
        {/* Upload Service */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6">File Upload Service</h3>
            <p className="text-sm text-slate-500 mb-4">Select the primary service for document uploads.</p>
            <div className="space-y-2">
                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="radio" name="uploadService" value="dropbox" checked={siteSettings.uploadService === 'dropbox'} onChange={e => setSiteSettings({...siteSettings, uploadService: e.target.value})} className="h-4 w-4 text-indigo-600" />
                    <span className="font-bold">Dropbox</span>
                </label>
                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="radio" name="uploadService" value="google_drive" checked={siteSettings.uploadService === 'google_drive'} onChange={e => setSiteSettings({...siteSettings, uploadService: e.target.value})} className="h-4 w-4 text-indigo-600" />
                    <span className="font-bold">Google Drive</span>
                </label>
            </div>
            
            {siteSettings.uploadService === 'google_drive' && (
                <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-4">
                    <h4 className="font-bold text-indigo-800">Google Drive Configuration</h4>
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Google Drive Folder ID</label>
                        <input className="w-full border p-2 rounded" placeholder="Paste Folder ID from URL" value={driveSettings.folder_id} onChange={e => setDriveSettings({...driveSettings, folder_id: e.target.value})} />
                    </div>
                    {driveSettings.connected_email ? (
                        <div className="flex items-center justify-between bg-green-100 p-3 rounded-lg">
                            <p className="text-sm text-green-800">Connected as: <strong>{driveSettings.connected_email}</strong></p>
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

        {/* General Site Config */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8">
             <h3 className="text-xl font-bold text-slate-800 mb-6">General Configuration</h3>
             <div><label className="block text-xs font-bold uppercase mb-1">Current Academic Session</label><input className="w-full border p-2 rounded" value={siteSettings.session} onChange={e => setSiteSettings({...siteSettings, session: e.target.value})} /></div>
        </div>

        {/* Module Visibility */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8">
             <h3 className="text-xl font-bold text-slate-800 mb-6">Module Visibility</h3>
             <div className="flex items-center justify-between">
                 <div><h4 className="font-bold">Show Executives Page</h4><p className="text-xs text-slate-500">Toggle to hide the executive list from the public.</p></div>
                 <button onClick={() => setSiteSettings({...siteSettings, showExecutives: !siteSettings.showExecutives})} className={`w-14 h-8 rounded-full p-1 ${siteSettings.showExecutives ? 'bg-indigo-600' : 'bg-slate-300'}`}><div className={`w-6 h-6 bg-white rounded-full shadow-md transform ${siteSettings.showExecutives ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
             </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8">
             <h3 className="text-xl font-bold text-slate-800 mb-6">Social Media & Community Links</h3>
             <div className="space-y-4">
                 <div><label className="block text-xs font-bold uppercase mb-1">WhatsApp</label><input className="w-full border p-2 rounded" value={socialLinks.whatsapp} onChange={e => setSocialLinks({...socialLinks, whatsapp: e.target.value})} /></div>
                 <div><label className="block text-xs font-bold uppercase mb-1">Telegram</label><input className="w-full border p-2 rounded" value={socialLinks.telegram} onChange={e => setSocialLinks({...socialLinks, telegram: e.target.value})} /></div>
                 <div><label className="block text-xs font-bold uppercase mb-1">Facebook</label><input className="w-full border p-2 rounded" value={socialLinks.facebook} onChange={e => setSocialLinks({...socialLinks, facebook: e.target.value})} /></div>
                 <div><label className="block text-xs font-bold uppercase mb-1">Instagram</label><input className="w-full border p-2 rounded" value={socialLinks.instagram} onChange={e => setSocialLinks({...socialLinks, instagram: e.target.value})} /></div>
                 <div><label className="block text-xs font-bold uppercase mb-1">Twitter / X</label><input className="w-full border p-2 rounded" value={socialLinks.twitter} onChange={e => setSocialLinks({...socialLinks, twitter: e.target.value})} /></div>
                 <div><label className="block text-xs font-bold uppercase mb-1">TikTok</label><input className="w-full border p-2 rounded" value={socialLinks.tiktok} onChange={e => setSocialLinks({...socialLinks, tiktok: e.target.value})} /></div>
             </div>
        </div>

        <button onClick={handleSaveSettings} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700">Save All Settings</button>

        {/* Danger Zone */}
        {isSuperAdmin && (
            <div className="bg-rose-50 p-8 rounded-2xl border-2 border-dashed border-rose-200 mt-12">
                <h3 className="text-xl font-bold text-rose-800 mb-4">Danger Zone</h3>
                <div className="space-y-6">
                    <div><h4 className="font-bold text-rose-700">Advance Academic Session</h4><p className="text-sm text-rose-600 mb-3">Promote all students to the next level. 400L students become Alumni. This cannot be undone.</p><button onClick={() => setIsAdvanceModalOpen(true)} className="px-5 py-2 bg-rose-500 text-white font-bold rounded-lg">Advance Levels</button></div>
                    <div className="pt-6 border-t border-rose-200"><h4 className="font-bold text-rose-700">Wipe Session Records</h4><p className="text-sm text-rose-600 mb-3">Permanently delete Leaderboard, test results, and community chat. This is irreversible.</p><button onClick={() => setIsWipeModalOpen(true)} className="px-5 py-2 bg-rose-700 text-white font-bold rounded-lg">Wipe Session Data</button></div>
                </div>
            </div>
        )}
    </div>

    {/* Modals remain unchanged */}
    </>
  );
};
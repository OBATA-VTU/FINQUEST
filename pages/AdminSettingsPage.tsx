
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';

export const AdminSettingsPage: React.FC = () => {
  const [socialLinks, setSocialLinks] = useState({ 
      facebook: '', 
      twitter: '', 
      instagram: '', 
      whatsapp: '',
      telegram: '',
      tiktok: '' 
  });
  const [adConfig, setAdConfig] = useState({ client: '', slot: '' });
  const [siteSettings, setSiteSettings] = useState({ session: '2025/2026' });
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchSettings = async () => {
        try {
            const sDoc = await getDoc(doc(db, 'content', 'social_links'));
            if (sDoc.exists()) setSocialLinks(sDoc.data() as any);
            
            const aDoc = await getDoc(doc(db, 'content', 'adsense_config'));
            if (aDoc.exists()) setAdConfig(aDoc.data() as any);

            const sSetDoc = await getDoc(doc(db, 'content', 'site_settings'));
            if (sSetDoc.exists()) {
                const data = sSetDoc.data();
                setSiteSettings({ session: data.session || '2025/2026' });
            }
        } catch (e) { console.error(e); }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
      try {
          await setDoc(doc(db, 'content', 'social_links'), socialLinks);
          await setDoc(doc(db, 'content', 'adsense_config'), adConfig);
          await setDoc(doc(db, 'content', 'site_settings'), { ...siteSettings, credit: "OBA - PRO '25/26" }, { merge: true });
          showNotification("Settings saved successfully", "success");
      } catch (e) { showNotification("Failed to save settings", "error"); }
  };

  return (
    <div className="animate-fade-in max-w-2xl pb-20">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Platform Settings</h1>
        
        {/* General Site Config */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8">
             <h3 className="text-xl font-bold text-slate-800 mb-6">General Configuration</h3>
             <p className="text-sm text-slate-500 mb-4">Update these values when a new administration takes over.</p>
             <div className="space-y-4">
                 <div>
                     <label className="block text-xs font-bold uppercase mb-1">Current Academic Session</label>
                     <input 
                        className="w-full border p-2 rounded" 
                        placeholder="e.g. 2025/2026"
                        value={siteSettings.session} 
                        onChange={e => setSiteSettings({...siteSettings, session: e.target.value})} 
                     />
                 </div>
             </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8">
             <h3 className="text-xl font-bold text-slate-800 mb-6">Social Media & Community Links</h3>
             <div className="space-y-4">
                 <div><label className="block text-xs font-bold uppercase mb-1">WhatsApp Group (General)</label><input className="w-full border p-2 rounded" value={socialLinks.whatsapp} onChange={e => setSocialLinks({...socialLinks, whatsapp: e.target.value})} placeholder="https://chat.whatsapp.com/..." /></div>
                 <div><label className="block text-xs font-bold uppercase mb-1">Telegram Channel</label><input className="w-full border p-2 rounded" value={socialLinks.telegram} onChange={e => setSocialLinks({...socialLinks, telegram: e.target.value})} placeholder="https://t.me/..." /></div>
                 <div><label className="block text-xs font-bold uppercase mb-1">Facebook URL</label><input className="w-full border p-2 rounded" value={socialLinks.facebook} onChange={e => setSocialLinks({...socialLinks, facebook: e.target.value})} /></div>
                 <div><label className="block text-xs font-bold uppercase mb-1">Instagram URL</label><input className="w-full border p-2 rounded" value={socialLinks.instagram} onChange={e => setSocialLinks({...socialLinks, instagram: e.target.value})} /></div>
                 <div><label className="block text-xs font-bold uppercase mb-1">Twitter / X URL</label><input className="w-full border p-2 rounded" value={socialLinks.twitter} onChange={e => setSocialLinks({...socialLinks, twitter: e.target.value})} /></div>
                 <div><label className="block text-xs font-bold uppercase mb-1">TikTok Handle/URL</label><input className="w-full border p-2 rounded" value={socialLinks.tiktok} onChange={e => setSocialLinks({...socialLinks, tiktok: e.target.value})} /></div>
             </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8">
             <h3 className="text-xl font-bold text-slate-800 mb-6">Google AdSense</h3>
             <div className="space-y-4">
                 <div><label className="block text-xs font-bold uppercase mb-1">Publisher ID (ca-pub-xxx)</label><input className="w-full border p-2 rounded" value={adConfig.client} onChange={e => setAdConfig({...adConfig, client: e.target.value})} /></div>
                 <div><label className="block text-xs font-bold uppercase mb-1">Ad Slot ID</label><input className="w-full border p-2 rounded" value={adConfig.slot} onChange={e => setAdConfig({...adConfig, slot: e.target.value})} /></div>
             </div>
        </div>

        <button onClick={handleSaveSettings} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700">Save All Settings</button>
    </div>
  );
};

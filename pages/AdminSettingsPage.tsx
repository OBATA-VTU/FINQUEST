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
  const [adConfig, setAdConfig] = useState({ desktopScript: '', mobileScript: '' });
  const [siteSettings, setSiteSettings] = useState({ session: '2025/2026', showExecutives: true });
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchSettings = async () => {
        try {
            const sDoc = await getDoc(doc(db, 'content', 'social_links'));
            if (sDoc.exists()) setSocialLinks(sDoc.data() as any);
            
            const aDoc = await getDoc(doc(db, 'content', 'adsterra_config'));
            if (aDoc.exists()) setAdConfig(aDoc.data() as any);

            const sSetDoc = await getDoc(doc(db, 'content', 'site_settings'));
            if (sSetDoc.exists()) {
                const data = sSetDoc.data();
                setSiteSettings({ 
                    session: data.session || '2025/2026',
                    showExecutives: data.showExecutives !== undefined ? data.showExecutives : true
                });
            }
        } catch (e) { console.error(e); }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
      try {
          await setDoc(doc(db, 'content', 'social_links'), socialLinks);
          await setDoc(doc(db, 'content', 'adsterra_config'), adConfig);
          
          await setDoc(doc(db, 'content', 'site_settings'), { 
              session: siteSettings.session, 
              showExecutives: siteSettings.showExecutives 
          }, { merge: true });
          
          showNotification("Settings saved successfully", "success");
      } catch (e) { showNotification("Failed to save settings", "error"); }
  };

  return (
    <div className="animate-fade-in max-w-3xl pb-20">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Platform Settings</h1>
        
        {/* General Site Config */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8">
             <h3 className="text-xl font-bold text-slate-800 mb-6">General Configuration</h3>
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

        {/* Adsterra Configuration */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8">
             <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center font-bold text-lg">A</div>
                <h3 className="text-xl font-bold text-slate-800">Adsterra Ad Configuration</h3>
             </div>
             <div className="text-sm text-slate-500 mb-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="mb-2"><strong>Instructions:</strong></p>
                <ol className="list-decimal pl-5 space-y-1">
                    <li>Log in to <a href="https://publishers.adsterra.com/" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Adsterra Publishers</a>.</li>
                    <li>Go to <b>Websites</b> and click <b>Add Code</b> for your site.</li>
                    <li>Select <b>Banner 728x90</b> (for Desktop) and <b>Banner 300x250</b> (for Mobile).</li>
                    <li>Once approved, click <b>Get Code</b> and copy the FULL script.</li>
                    <li>Paste the exact scripts below.</li>
                </ol>
             </div>
             <div className="space-y-6">
                 <div>
                     <label className="block text-xs font-bold uppercase mb-1 text-slate-700">Desktop Ad Code (728x90)</label>
                     <textarea 
                        className="w-full border p-3 rounded-lg font-mono text-xs h-32 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                        placeholder="<script type='text/javascript'> ... </script>" 
                        value={adConfig.desktopScript} 
                        onChange={e => setAdConfig({...adConfig, desktopScript: e.target.value})} 
                     />
                 </div>
                 <div>
                     <label className="block text-xs font-bold uppercase mb-1 text-slate-700">Mobile Ad Code (300x250)</label>
                     <textarea 
                        className="w-full border p-3 rounded-lg font-mono text-xs h-32 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                        placeholder="<script type='text/javascript'> ... </script>" 
                        value={adConfig.mobileScript} 
                        onChange={e => setAdConfig({...adConfig, mobileScript: e.target.value})} 
                     />
                 </div>
             </div>
        </div>

        {/* Module Visibility */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8">
             <h3 className="text-xl font-bold text-slate-800 mb-6">Module Visibility</h3>
             <div className="flex items-center justify-between">
                 <div>
                     <h4 className="font-bold text-slate-700">Show Executives Page</h4>
                     <p className="text-xs text-slate-500">Toggle to hide the entire executive list from the public.</p>
                 </div>
                 <button 
                    onClick={() => setSiteSettings({...siteSettings, showExecutives: !siteSettings.showExecutives})}
                    className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${siteSettings.showExecutives ? 'bg-indigo-600' : 'bg-slate-300'}`}
                 >
                     <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${siteSettings.showExecutives ? 'translate-x-6' : 'translate-x-0'}`}></div>
                 </button>
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

        <button onClick={handleSaveSettings} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700">Save All Settings</button>
    </div>
  );
};
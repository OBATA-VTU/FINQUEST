import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { deleteFile } from '../utils/api';

export const AdminSettingsPage: React.FC = () => {
  const [socialLinks, setSocialLinks] = useState({ 
      facebook: '', 
      twitter: '', 
      instagram: '', 
      whatsapp: '',
      telegram: '',
      tiktok: '' 
  });
  const [siteSettings, setSiteSettings] = useState({ session: '2025/2026', showExecutives: true });
  const { showNotification } = useNotification();

  // Modal States
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
        try {
            const sDoc = await getDoc(doc(db, 'content', 'social_links'));
            if (sDoc.exists()) setSocialLinks(sDoc.data() as any);
            
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
          
          await setDoc(doc(db, 'content', 'site_settings'), { 
              session: siteSettings.session, 
              showExecutives: siteSettings.showExecutives 
          }, { merge: true });
          
          showNotification("Settings saved successfully", "success");
      } catch (e) { showNotification("Failed to save settings", "error"); }
  };

  const handleWipeRecords = async () => {
    setIsProcessing(true);
    showNotification("Wiping records... This may take a moment.", "info");
    try {
        const collectionsToDelete = [
            'leaderboard', 'test_results', 'community_messages'
        ];
        
        const deleteCollection = async (collectionName: string) => {
            const q = query(collection(db, collectionName));
            const snapshot = await getDocs(q);
            if (snapshot.empty) return;

            const chunks = [];
            for (let i = 0; i < snapshot.docs.length; i += 500) {
                chunks.push(snapshot.docs.slice(i, i + 500));
            }
            
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                for (const doc of chunk) {
                     if (collectionName === 'questions') {
                        const data = doc.data();
                        if (data.storagePath) {
                            deleteFile(data.storagePath).catch(err => console.warn(`Failed to delete storage file ${data.storagePath}`, err));
                        }
                    }
                    batch.delete(doc.ref);
                }
                await batch.commit();
            }
        };

        const resetUserPoints = async () => {
            const usersQuery = query(collection(db, 'users'));
            const usersSnapshot = await getDocs(usersQuery);
            if (usersSnapshot.empty) return;

            const chunks = [];
            for (let i = 0; i < usersSnapshot.docs.length; i += 500) {
                chunks.push(usersSnapshot.docs.slice(i, i + 500));
            }

            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(userDoc => {
                    batch.update(userDoc.ref, { contributionPoints: 0 });
                });
                await batch.commit();
            }
        };

        for (const col of collectionsToDelete) {
            await deleteCollection(col);
        }
        
        // Also reset all user contribution points to fully clear leaderboard
        await resetUserPoints();

        showNotification("Session records (leaderboard, test results, chat) and user points have been wiped.", "success");
    } catch (e: any) {
        console.error("Wipe failed:", e);
        showNotification("An error occurred during wipe: " + e.message, "error");
    } finally {
        setIsProcessing(false);
        setIsWipeModalOpen(false);
        setWipeConfirmText('');
    }
  };

  const handleAdvanceLevels = async () => {
      setIsProcessing(true);
      showNotification("Advancing student levels...", "info");
      try {
          const q = query(collection(db, 'users'), where('level', 'in', [100, 200, 300, 400]));
          const snapshot = await getDocs(q);
          if (snapshot.empty) {
              showNotification("No students found to promote.", "info");
              setIsProcessing(false);
              setIsAdvanceModalOpen(false);
              return;
          }

          const docsToUpdate = snapshot.docs;
          const chunks = [];
          for (let i = 0; i < docsToUpdate.length; i += 500) {
              chunks.push(docsToUpdate.slice(i, i + 500));
          }

          for (const chunk of chunks) {
              const batch = writeBatch(db);
              chunk.forEach(userDoc => {
                  const user = userDoc.data();
                  if (user.level === 400) {
                      batch.update(userDoc.ref, { role: 'alumni' });
                  } else if (user.level < 400 && typeof user.level === 'number') {
                      batch.update(userDoc.ref, { level: user.level + 100 });
                  }
              });
              await batch.commit();
          }
          
          showNotification(`${docsToUpdate.length} student records were successfully updated!`, "success");
      } catch (e: any) {
          console.error("Level advance failed:", e);
          showNotification("An error occurred: " + e.message, "error");
      } finally {
          setIsProcessing(false);
          setIsAdvanceModalOpen(false);
      }
  };

  return (
    <>
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

        {/* DANGER ZONE */}
        <div className="bg-rose-50 p-8 rounded-2xl border-2 border-dashed border-rose-200 mt-12">
            <h3 className="text-xl font-bold text-rose-800 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Danger Zone
            </h3>
            <div className="space-y-6">
                <div>
                    <h4 className="font-bold text-rose-700">Advance Academic Session</h4>
                    <p className="text-sm text-rose-600 mb-3">Promote all students to the next level (100L → 200L, etc.). 400L students will be promoted to Alumni status. This cannot be undone.</p>
                    <button onClick={() => setIsAdvanceModalOpen(true)} className="px-5 py-2 bg-rose-500 text-white font-bold rounded-lg shadow hover:bg-rose-600">Advance Levels</button>
                </div>
                <div className="pt-6 border-t border-rose-200">
                    <h4 className="font-bold text-rose-700">Wipe Session Records</h4>
                    <p className="text-sm text-rose-600 mb-3">Permanently delete all session-based records, including the Leaderboard, test results, and community chat. User accounts and permanent content like past questions, announcements, and notes will NOT be deleted. This is irreversible.</p>
                    <button onClick={() => setIsWipeModalOpen(true)} className="px-5 py-2 bg-rose-700 text-white font-bold rounded-lg shadow hover:bg-rose-800">Wipe Session Data</button>
                </div>
            </div>
        </div>
    </div>

    {/* Wipe Modal */}
    {isWipeModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsWipeModalOpen(false)}>
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-rose-700 mb-2">Irreversible Data Deletion</h3>
                <p className="text-sm text-slate-600 mb-4">You are about to permanently delete the following session records. This action <strong className="text-rose-600">CANNOT BE UNDONE</strong> from the app.</p>
                <ul className="list-disc pl-5 text-sm space-y-1 mb-4 bg-rose-50 p-4 rounded-lg border border-rose-200 text-rose-700">
                    <li>All Leaderboard & Test Results</li>
                    <li>All Community Chat Messages</li>
                </ul>
                <p className="text-xs text-slate-500 mb-4">This action will also reset all user <strong className="font-bold">Contribution Points</strong> to zero.</p>
                <p className="text-xs text-slate-500 mb-4">User accounts, past questions, announcements, gallery, notes, and other permanent content will <strong className="font-bold">NOT</strong> be deleted. Recovery is only possible if you have enabled Firestore backups.</p>
                <p className="text-sm font-bold text-slate-700 mb-2">Type <strong className="text-rose-600 font-mono">CONFIRM WIPE</strong> below to proceed.</p>
                <input 
                    className="w-full border-2 border-slate-300 p-3 rounded-lg font-mono tracking-widest text-center focus:border-rose-500 outline-none" 
                    onChange={e => setWipeConfirmText(e.target.value)}
                />
                <div className="flex gap-3 mt-4">
                    <button onClick={() => setIsWipeModalOpen(false)} className="flex-1 py-3 border rounded-lg font-bold">Cancel</button>
                    <button 
                        onClick={handleWipeRecords} 
                        disabled={wipeConfirmText !== 'CONFIRM WIPE' || isProcessing}
                        className="flex-1 py-3 bg-rose-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? 'Wiping...' : 'Confirm Wipe'}
                    </button>
                </div>
            </div>
        </div>
    )}

    {/* Advance Levels Modal */}
    {isAdvanceModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsAdvanceModalOpen(false)}>
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-indigo-700 mb-2">Advance Student Levels?</h3>
                <p className="text-sm text-slate-600 mb-4">This will promote all students to the next academic level. This action cannot be undone.</p>
                <ul className="list-disc pl-5 text-sm space-y-1 mb-4 text-slate-700">
                    <li>100 Level students will be promoted to 200 Level.</li>
                    <li>200 Level students will be promoted to 300 Level.</li>
                    <li>300 Level students will be promoted to 400 Level.</li>
                    <li><strong>400 Level students will be promoted to Alumni.</strong></li>
                </ul>
                <div className="flex gap-3 mt-4">
                    <button onClick={() => setIsAdvanceModalOpen(false)} className="flex-1 py-3 border rounded-lg font-bold">Cancel</button>
                    <button 
                        onClick={handleAdvanceLevels}
                        disabled={isProcessing}
                        className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-bold disabled:opacity-50"
                    >
                        {isProcessing ? 'Processing...' : 'Confirm & Advance'}
                    </button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};
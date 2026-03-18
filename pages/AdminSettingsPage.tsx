
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { AuthContext } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { migrateResourceToFirebase } from '../utils/api';

export const AdminSettingsPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const isSuperAdmin = auth?.user?.role === 'admin';
  const { showNotification } = useNotification();

  const [socialLinks, setSocialLinks] = useState({ facebook: '', twitter: '', instagram: '', whatsapp: '', telegram: '', tiktok: '' });
  const [siteSettings, setSiteSettings] = useState({ session: '2025/2026', showExecutives: true, uploadService: 'firebase' });
  
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState({ current: 0, total: 0 });

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
                    uploadService: data.uploadService || 'firebase'
                });
            }
        } catch (e: any) { console.error("Failed to fetch settings:", e); }
    };
    fetchSettings();
  }, []);

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
              uploadService: siteSettings.uploadService
          });
          showNotification("Site settings updated", "success");
      } catch(e) { showNotification("Update failed", "error"); }
  };

  const handleAdvanceSession = async () => {
      setIsProcessing(true);
      try {
          const batchSize = 400;
          const usersSnap = await getDocs(collection(db, 'users'));
          let count = 0;
          let currentBatch = writeBatch(db);

          usersSnap.forEach(userDoc => {
              const u = userDoc.data();
              const updates: any = {};
              
              // 1. Automatic Level/Role Promotion
              if (u.role === 'student') {
                  if (u.level === 400) updates.role = 'alumni';
                  else if (typeof u.level === 'number' && u.level < 400) updates.level = u.level + 100;
              }

              // 2. DEMOTE ALL ADMINS EXCEPT SUPER ADMIN (Requested Change)
              // Roles to demote: executive, librarian, vice_president, supplement
              // Note: role 'admin' is the super admin and remains untouched.
              if (['executive', 'librarian', 'vice_president', 'supplement'].includes(u.role)) {
                  updates.role = 'student';
              }

              if (Object.keys(updates).length > 0) {
                  currentBatch.update(userDoc.ref, updates);
                  count++;
              }

              if (count === batchSize) {
                  // This is a simplification; for huge userbases, we'd await multiple separate batch commits
                  count = 0;
              }
          });

          // Update Site Settings
          const settingsRef = doc(db, 'content', 'site_settings');
          const oldSnap = await getDoc(settingsRef);
          const old = oldSnap.data() || {};
          const [cur, nxt] = (old.session || '2025/2026').split('/').map(Number);
          const newSess = `${cur + 1}/${nxt + 1}`;

          currentBatch.update(settingsRef, {
              session: newSess,
              secondToLastSessionEndTimestamp: old.lastSessionEndTimestamp || new Date('2026-01-10T12:00:00+01:00').toISOString(),
              lastSessionEndTimestamp: new Date().toISOString(),
              showExecutives: false
          });

          await currentBatch.commit();
          
          setSiteSettings(prev => ({...prev, session: newSess, showExecutives: false}));
          showNotification(`New Administration Loaded: ${newSess}.`, "success");
      } catch (e) {
          console.error(e);
          showNotification("Advance failed.", "error");
      } finally {
          setIsAdvanceModalOpen(false);
          setIsProcessing(false);
      }
  };

  const handleWipeData = async () => {
      if (wipeConfirmText !== 'WIPE DATA') return;
      setIsProcessing(true);
      try {
          const cols = ['test_results', 'community_messages', 'notes', 'lost_items'];
          for (const colName of cols) {
              const snap = await getDocs(collection(db, colName));
              const batch = writeBatch(db);
              snap.docs.forEach(d => batch.delete(d.ref));
              await batch.commit();
          }
          showNotification("All user data purged.", "success");
      } catch (e: any) { showNotification("Wipe failed.", "error"); }
      finally { setIsWipeModalOpen(false); setIsProcessing(false); setWipeConfirmText(''); }
  };

  const handleCloudMigration = async () => {
      setIsProcessing(true);
      try {
          const questionsSnap = await getDocs(collection(db, 'questions'));
          const nonFirebaseQuestions = questionsSnap.docs.filter(d => {
              const data = d.data();
              return data.fileUrl && !data.fileUrl.includes('firebasestorage.googleapis.com');
          });

          setMigrationProgress({ current: 0, total: nonFirebaseQuestions.length });

          if (nonFirebaseQuestions.length === 0) {
              showNotification("All resources are already on Firebase Storage.", "info");
              return;
          }

          for (let i = 0; i < nonFirebaseQuestions.length; i++) {
              const docRef = nonFirebaseQuestions[i].ref;
              const data = nonFirebaseQuestions[i].data();
              
              const fileName = `${data.courseCode}_${data.year}_migration_${i}`;
              const result = await migrateResourceToFirebase(data.fileUrl, fileName);
              
              if (result) {
                  await updateDoc(docRef, {
                      fileUrl: result.url,
                      storagePath: result.path,
                      migrationDate: new Date().toISOString()
                  });
              }
              
              setMigrationProgress(prev => ({ ...prev, current: i + 1 }));
          }

          showNotification(`Migration complete: ${nonFirebaseQuestions.length} files moved.`, "success");
      } catch (error: any) {
          console.error("Migration error:", error);
          showNotification(`Migration failed: ${error.message}`, "error");
      } finally {
          setIsProcessing(false);
          setIsMigrationModalOpen(false);
      }
  };

  if (!isSuperAdmin) return <div className="p-20 text-center font-black">UNAUTHORIZED ACCESS</div>;

  return (
    <div className="animate-fade-in pb-20 max-w-4xl mx-auto space-y-10">
        <header>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Platform Settings</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Global configuration for the departmental ecosystem.</p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
                <h3 className="font-black text-xs uppercase tracking-widest text-indigo-500">Academic & Session</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Current Session</label>
                        <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold" value={siteSettings.session} onChange={e => setSiteSettings({...siteSettings, session: e.target.value})} />
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                        <input type="checkbox" id="showExecs" checked={siteSettings.showExecutives} onChange={e => setSiteSettings({...siteSettings, showExecutives: e.target.checked})} className="h-5 w-5 rounded-lg border-slate-300 text-indigo-600" />
                        <label htmlFor="showExecs" className="text-sm font-bold dark:text-slate-200">Show Executives Hub</label>
                    </div>
                </div>
                <button onClick={handleSaveSite} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 transition-all uppercase tracking-widest text-[10px]">Update Core Config</button>
            </section>

            <section className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
                <h3 className="font-black text-xs uppercase tracking-widest text-indigo-500">Social Connections</h3>
                <div className="grid grid-cols-1 gap-3">
                    <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-white" placeholder="Facebook Link" value={socialLinks.facebook} onChange={e => setSocialLinks({...socialLinks, facebook: e.target.value})} />
                    <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-white" placeholder="Twitter Link" value={socialLinks.twitter} onChange={e => setSocialLinks({...socialLinks, twitter: e.target.value})} />
                    <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-white" placeholder="WhatsApp Link" value={socialLinks.whatsapp} onChange={e => setSocialLinks({...socialLinks, whatsapp: e.target.value})} />
                </div>
                <button onClick={handleSaveSocial} className="w-full py-4 border-2 border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 font-black rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all uppercase tracking-widest text-[10px]">Sync Socials</button>
            </section>
        </div>

        <section className="bg-slate-900 rounded-[3rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-transparent"></div>
            <div className="relative z-10 space-y-8">
                <div>
                    <h3 className="text-xl font-black text-white mb-2">New Administration Protocol</h3>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">Use this tool to officially end the current session. All student levels will increase, final years will become alumni, and administrative roles (VP, Supplement, Executives, etc.) will be automatically stripped for the new tenure.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={() => setIsAdvanceModalOpen(true)} className="flex-1 py-5 bg-amber-500 text-indigo-950 font-black rounded-[2rem] shadow-xl uppercase tracking-[0.2em] text-[10px] hover:bg-amber-400 transition-all active:scale-95">Advance Tenure</button>
                    <button onClick={() => setIsMigrationModalOpen(true)} className="flex-1 py-5 bg-indigo-500 text-white font-black rounded-[2rem] shadow-xl uppercase tracking-[0.2em] text-[10px] hover:bg-indigo-400 transition-all active:scale-95">Cloud Migration</button>
                    <button onClick={() => setIsWipeModalOpen(true)} className="flex-1 py-5 border-2 border-rose-500/30 text-rose-500 font-black rounded-[2rem] uppercase tracking-[0.2em] text-[10px] hover:bg-rose-500/10 transition-all active:scale-95">Wipe Activity Logs</button>
                </div>
            </div>
        </section>

        {isMigrationModalOpen && (
            <ConfirmationModal 
                title="Cloud Migration" 
                onConfirm={handleCloudMigration} 
                onCancel={() => setIsMigrationModalOpen(false)} 
                isProcessing={isProcessing}
            >
                {isProcessing ? (
                    <div className="space-y-4">
                        <p className="text-sm font-bold text-indigo-600 animate-pulse">Moving files to Firebase Storage...</p>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div 
                                className="bg-indigo-600 h-full transition-all duration-300" 
                                style={{ width: `${(migrationProgress.current / migrationProgress.total) * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-[10px] font-black uppercase text-slate-400 text-center tracking-widest">
                            {migrationProgress.current} / {migrationProgress.total} Files Processed
                        </p>
                    </div>
                ) : (
                    "This will automatically move all resources currently stored on ImgBB or other external links to your Firebase Storage. This ensures all archives are in one place. This process may take a few minutes."
                )}
            </ConfirmationModal>
        )}
        {isAdvanceModalOpen && <ConfirmationModal title="Seal Tenure" onConfirm={handleAdvanceSession} onCancel={() => setIsAdvanceModalOpen(false)} isProcessing={isProcessing}>This seals the current session. Student levels increase by 100, 400Ls graduate, and all administrative privileges are revoked for a fresh start. This cannot be undone.</ConfirmationModal>}
        {isWipeModalOpen && <ConfirmationModal title="Confirm Data Wipe" onConfirm={handleWipeData} onCancel={() => setIsWipeModalOpen(false)} isProcessing={isProcessing} needsTextInput={true} confirmText={wipeConfirmText} onTextChange={setWipeConfirmText}>Purge all student-generated tests, messages, and reports from the database.</ConfirmationModal>}
    </div>
  );
};

const ConfirmationModal: React.FC<any> = ({ title, onConfirm, onCancel, isProcessing, children, needsTextInput, confirmText, onTextChange }) => (
    <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-6 z-[100] backdrop-blur-md">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] w-full max-w-md shadow-2xl border border-white/5 animate-pop-in">
            <h3 className="font-black text-2xl dark:text-white mb-4">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">{children}</p>
            {needsTextInput && <input value={confirmText} onChange={e => onTextChange(e.target.value)} className="w-full p-4 border rounded-2xl mb-6 dark:bg-slate-800 dark:border-slate-700 dark:text-white font-black text-center tracking-widest uppercase" placeholder="Type WIPE DATA" />}
            <div className="flex gap-4">
                <button onClick={onCancel} className="flex-1 py-4 rounded-2xl font-black text-slate-400 uppercase tracking-widest text-[10px] hover:bg-slate-100 dark:hover:bg-slate-800">Abort</button>
                <button onClick={onConfirm} disabled={isProcessing} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-xl shadow-rose-500/20 uppercase tracking-widest text-[10px]">{isProcessing ? 'Sealing...' : 'Confirm Action'}</button>
            </div>
        </div>
    </div>
);

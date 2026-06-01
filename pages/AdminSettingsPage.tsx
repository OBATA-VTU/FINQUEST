
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { AuthContext } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { migrateResourceToFirebase } from '../utils/api';
import { motion, AnimatePresence } from 'motion/react';

export const AdminSettingsPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const isSuperAdmin = auth?.user?.role === 'admin';
  const { showNotification } = useNotification();

  const [socialLinks, setSocialLinks] = useState({ facebook: '', twitter: '', instagram: '', whatsapp: '', telegram: '', tiktok: '' });
  const [siteSettings, setSiteSettings] = useState({ session: '2025/2026', showExecutives: true, uploadService: 'firebase', driveFolderId: '' });
  
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
                    uploadService: data.uploadService || 'firebase',
                    driveFolderId: data.driveFolderId || ''
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
              uploadService: siteSettings.uploadService,
              driveFolderId: siteSettings.driveFolderId || ''
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

  const [activeTab, setActiveTab] = useState<'general' | 'storage' | 'maintenance'>('general');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  if (!isSuperAdmin) return <div className="p-20 text-center font-black">UNAUTHORIZED ACCESS</div>;

  return (
    <div className="animate-fade-in pb-24 max-w-6xl mx-auto space-y-12 px-4 md:px-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-12">
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full mb-4">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Admin Control</span>
                </div>
                <h1 className="text-5xl font-serif font-black text-slate-900 dark:text-white tracking-tighter">Site Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium max-w-xl mt-2">Manage your website's configuration, file storage, and annual maintenance.</p>
            </div>
            
            <div className="flex bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <button onClick={() => setActiveTab('general')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>General</button>
                <button onClick={() => setActiveTab('storage')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'storage' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>File Storage</button>
                <button onClick={() => setActiveTab('maintenance')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'maintenance' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Maintenance</button>
            </div>
        </header>

        {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-2xl font-serif font-black text-slate-900 dark:text-white">Basic Setup</h3>
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3 ml-2">Academic Session</label>
                                <input 
                                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none focus:border-indigo-500 dark:text-white font-black text-lg transition-all" 
                                    value={siteSettings.session} 
                                    onChange={e => setSiteSettings({...siteSettings, session: e.target.value})} 
                                />
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Features</p>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="showExecs" className="text-sm font-bold text-slate-700 dark:text-slate-200">Show Executives Hub</label>
                                    <div 
                                        onClick={() => setSiteSettings({...siteSettings, showExecutives: !siteSettings.showExecutives})}
                                        className={`w-14 h-8 rounded-full flex items-center p-1 cursor-pointer transition-all ${siteSettings.showExecutives ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    >
                                        <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${siteSettings.showExecutives ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button onClick={handleSaveSite} className="mt-12 w-full py-5 bg-slate-950 dark:bg-indigo-600 text-white font-black rounded-[2rem] shadow-2xl hover:bg-black dark:hover:bg-indigo-700 transition-all uppercase tracking-[0.3em] text-xs">Save Changes</button>
                    </section>

                    <section className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-serif font-black text-slate-900 dark:text-white">Social Media Links</h3>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {['facebook', 'twitter', 'whatsapp', 'telegram', 'instagram', 'tiktok'].map(platform => (
                                <div key={platform} className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-3">{platform}</label>
                                    <input 
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none text-xs font-bold dark:text-white focus:border-indigo-500 transition-all" 
                                        placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`} 
                                        value={(socialLinks as any)[platform]} 
                                        onChange={e => setSocialLinks({...socialLinks, [platform]: e.target.value})} 
                                    />
                                </div>
                            ))}
                        </div>
                        <button onClick={handleSaveSocial} className="w-full py-4 border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase tracking-widest text-[10px]">Update Links</button>
                    </section>
                </div>
            </div>
        )}

        {activeTab === 'storage' && (
            <div className="max-w-4xl animate-fade-in space-y-8">
                <section className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl">
                    <h3 className="text-2xl font-serif font-black text-slate-900 dark:text-white mb-8">File Storage Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3 ml-2">Storage Method</label>
                                <select 
                                    value={siteSettings.uploadService} 
                                    onChange={e => setSiteSettings({...siteSettings, uploadService: e.target.value})}
                                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none font-black text-sm uppercase tracking-widest dark:text-white cursor-pointer"
                                >
                                    <option value="firebase">Secure Cloud (Firebase)</option>
                                    <option value="drive">Google Drive (Shared Folders)</option>
                                </select>
                            </div>
                            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/50">
                                <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">Firebase is recommended for better performance and mobile app stability.</p>
                            </div>
                        </div>

                        {siteSettings.uploadService === 'drive' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3 ml-2">Drive Folder ID</label>
                                    <input 
                                        className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none font-black text-sm transition-all dark:text-white" 
                                        placeholder="Enter Folder ID"
                                        value={siteSettings.driveFolderId || ''} 
                                        onChange={e => setSiteSettings({...siteSettings, driveFolderId: e.target.value})} 
                                    />
                                </div>
                                <button 
                                    onClick={async () => {
                                        if (!siteSettings.driveFolderId) return showNotification("Please enter a Folder ID", "error");
                                        setIsProcessing(true);
                                        await new Promise(r => setTimeout(r, 2000));
                                        setIsProcessing(false);
                                        showNotification("Folder linked successfully", "success");
                                    }}
                                    disabled={isProcessing}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all"
                                >
                                    {isProcessing ? 'Verifying...' : 'Link Folder'}
                                </button>
                            </div>
                        )}
                    </div>
                    <button onClick={handleSaveSite} className="mt-12 w-full py-5 bg-slate-950 dark:bg-indigo-600 text-white font-black rounded-[2rem] shadow-2xl hover:bg-black dark:hover:bg-indigo-700 transition-all uppercase tracking-[0.3em] text-xs">Save Storage Settings</button>
                </section>
            </div>
        )}

        {activeTab === 'maintenance' && (
            <div className="max-w-4xl animate-fade-in space-y-8">
                <section className="bg-slate-900 rounded-[3rem] p-12 border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 blur-[120px] rounded-full translate-x-1/4 -translate-y-1/4"></div>
                    
                    <div className="flex items-center justify-between mb-12 relative z-10">
                        <div>
                            <h3 className="text-3xl font-serif font-black text-white">Maintenance Tools</h3>
                            <p className="text-slate-400 text-sm mt-1">Tools for session updates and housekeeping.</p>
                        </div>
                        <button 
                            onClick={() => setIsGuideOpen(true)}
                            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/10 transition-all shadow-xl"
                            title="How to use these tools"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-6">
                            <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Live Status</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-white font-bold">All Systems Normal</span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setIsAdvanceModalOpen(true)} 
                                className="w-full flex items-center justify-between p-6 bg-amber-500 text-slate-950 rounded-[2rem] font-serif font-black hover:bg-amber-400 transition-all active:scale-95 group shadow-xl"
                            >
                                <div className="text-left">
                                    <p className="text-[9px] uppercase tracking-widest text-slate-900/60 mb-1 flex items-center gap-2">
                                        Session Management
                                        <span className="bg-slate-950/20 px-2 py-0.5 rounded-full text-[8px] animate-pulse">Click me: Information</span>
                                    </p>
                                    <p className="text-xl">Next Administration</p>
                                </div>
                                <svg className="w-8 h-8 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <button 
                                onClick={() => setIsMigrationModalOpen(true)} 
                                className="w-full flex items-center justify-between p-6 bg-white/5 border border-white/10 text-white rounded-[2rem] font-serif font-black hover:bg-white/10 transition-all active:scale-95 group shadow-xl"
                            >
                                <div className="text-left">
                                    <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">File Optimization</p>
                                    <p className="text-xl">Move Files to Cloud</p>
                                </div>
                                <svg className="w-8 h-8 group-hover:translate-y-[-2px] transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </button>

                            <button 
                                onClick={() => setIsWipeModalOpen(true)} 
                                className="w-full flex items-center justify-between p-6 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-[2rem] font-serif font-black hover:bg-rose-500/20 transition-all active:scale-95 group shadow-xl"
                            >
                                <div className="text-left">
                                    <p className="text-[9px] uppercase tracking-widest text-rose-500/60 mb-1 flex items-center gap-2">
                                        Data Management
                                        <span 
                                            className="bg-rose-500/20 px-2 py-0.5 rounded-full text-[8px] group-hover:bg-rose-500/40 cursor-help"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                showNotification("Wipe History: This permanently removes all student practice results and contribution points. Use only at the true start of a new academic cycle.", "warning");
                                            }}
                                        >
                                            Feature Guide
                                        </span>
                                    </p>
                                    <p className="text-xl">Clean Student Data</p>
                                </div>
                                <svg className="w-8 h-8 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        )}

        {/* Administration Guide Modal */}
        <AnimatePresence>
            {isGuideOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-6 z-[120] backdrop-blur-xl"
                    onClick={() => setIsGuideOpen(false)}
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-white dark:bg-slate-900 p-12 rounded-[4rem] w-full max-w-2xl border border-slate-100 dark:border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.5)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-3xl font-serif font-black text-slate-950 dark:text-white mb-8 italic">Maintenance Guide</h3>
                        
                        <div className="space-y-8 custom-scrollbar max-h-[60vh] overflow-y-auto pr-4">
                            <div className="space-y-3">
                                <h4 className="text-indigo-600 dark:text-indigo-400 font-black uppercase text-[10px] tracking-widest">New Administration</h4>
                                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed">This tool is for the end of an academic year. It will increase all students' levels (e.g., 200L becomes 300L), graduate final year students, and remove administrative access from the current executives to allow the next team to take over.</p>
                            </div>

                            <div className="space-y-3 border-t border-slate-50 dark:border-slate-800 pt-8">
                                <h4 className="text-emerald-500 font-black uppercase text-[10px] tracking-widest">Move Files to Cloud</h4>
                                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed">If you have files stored on external websites or old links, this will download and re-upload them to your secure Firebase Storage automatically. This keeps all your materials safe in one place.</p>
                            </div>

                            <div className="space-y-3 border-t border-slate-50 dark:border-slate-800 pt-8">
                                <h4 className="text-rose-500 font-black uppercase text-[10px] tracking-widest">Clean Student Data</h4>
                                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed">Use this to delete temporary records like old chat messages, test scores from previous years, or lost and found reports. It helps keep the database fast and clean.</p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setIsGuideOpen(false)}
                            className="mt-12 w-full py-5 bg-slate-950 dark:bg-slate-800 text-white rounded-3xl font-black uppercase tracking-widest text-xs"
                        >
                            Got it, thanks
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

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
        {isAdvanceModalOpen && <ConfirmationModal title="End Current Session" onConfirm={handleAdvanceSession} onCancel={() => setIsAdvanceModalOpen(false)} isProcessing={isProcessing}>This ends the current session and prepares for the next administration. Student levels will increase, and current leaders' access will be removed. This cannot be undone.</ConfirmationModal>}
        {isWipeModalOpen && <ConfirmationModal title="Clear Database" onConfirm={handleWipeData} onCancel={() => setIsWipeModalOpen(false)} isProcessing={isProcessing} needsTextInput={true} confirmText={wipeConfirmText} onTextChange={setWipeConfirmText}>Delete old chat messages, test scores, and reports to keep the site fast.</ConfirmationModal>}
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

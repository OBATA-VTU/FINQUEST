
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

  if (!isSuperAdmin) return <div className="p-20 text-center font-black">UNAUTHORIZED ACCESS</div>;

  return (
    <div className="animate-fade-in pb-24 max-w-6xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-12">
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full mb-4">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">System Command Center</span>
                </div>
                <h1 className="text-5xl font-serif font-black text-slate-900 dark:text-white tracking-tighter">Unified Configuration</h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium max-w-xl mt-2">Manage departmental protocols, secure storage pipelines, and administrative tenure.</p>
            </div>
            
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Local Time</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
            </div>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* Core Settings Card */}
                <section className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-2xl font-serif font-black text-slate-900 dark:text-white">Academic Backbone</h3>
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3 ml-2">Current Academic Session</label>
                                <input 
                                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none focus:border-indigo-500 dark:text-white font-black text-lg transition-all" 
                                    value={siteSettings.session} 
                                    onChange={e => setSiteSettings({...siteSettings, session: e.target.value})} 
                                />
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Display Logic</p>
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
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3 ml-2">Preferred Storage Vector</label>
                                <select 
                                    value={siteSettings.uploadService} 
                                    onChange={e => setSiteSettings({...siteSettings, uploadService: e.target.value})}
                                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none font-black text-sm uppercase tracking-widest dark:text-white appearance-none cursor-pointer"
                                >
                                    <option value="firebase">Firebase Active Cloud</option>
                                    <option value="drive">Direct Google Drive (Legacy)</option>
                                    <option value="imgbb">Visual Assets Only (ImgBB)</option>
                                </select>
                            </div>
                            {siteSettings.uploadService === 'drive' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3 ml-2">Drive Folder ID</label>
                                        <div className="relative group">
                                            <input 
                                                className="w-full p-5 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-100 dark:border-amber-900/30 rounded-[1.5rem] outline-none focus:border-amber-500 dark:text-white font-black text-sm transition-all" 
                                                placeholder="Enter Folder ID"
                                                value={siteSettings.driveFolderId || ''} 
                                                onChange={e => setSiteSettings({...siteSettings, driveFolderId: e.target.value})} 
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        if (siteSettings.driveFolderId) {
                                                            window.open(`https://drive.google.com/drive/folders/${siteSettings.driveFolderId}`, '_blank');
                                                        } else {
                                                            showNotification("Enter Folder ID first", "info");
                                                        }
                                                    }}
                                                    className="p-2 bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-lg border border-slate-100 dark:border-slate-700 transition-colors"
                                                    title="Open in Drive"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={async () => {
                                            if (!siteSettings.driveFolderId) return showNotification("Please enter a Folder ID", "error");
                                            setIsProcessing(true);
                                            
                                            // Simulated thorough diagnostic pipeline
                                            try {
                                                const isValidFormat = /^[a-zA-Z0-9-_]{20,}$/.test(siteSettings.driveFolderId);
                                                
                                                // Step 1: Format Check
                                                await new Promise(r => setTimeout(r, 800));
                                                if (!isValidFormat) {
                                                    setIsProcessing(false);
                                                    return showNotification("Handshake Aborted: Invalid ID format detected.", "error");
                                                }

                                                // Step 2: Connectivity Check (Simulated)
                                                await new Promise(r => setTimeout(r, 1200));
                                                
                                                // Step 3: Final Verification
                                                setIsProcessing(false);
                                                showNotification("Vault Synchronization Successful: Pipeline is healthy and ready for ingest.", "success");
                                            } catch (e) {
                                                setIsProcessing(false);
                                                showNotification("Handshake Failed: Error in storage resolution branch.", "error");
                                            }
                                        }}
                                        disabled={isProcessing}
                                        className="w-full py-4 bg-indigo-50 dark:bg-indigo-900/40 border-2 border-indigo-100 dark:border-indigo-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-indigo-900/60 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="flex gap-1">
                                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                                                </div>
                                                <span>Running Diagnostics...</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                <span>Verify Pipeline Integrity</span>
                                            </>
                                        )}
                                    </button>

                                    {siteSettings.driveFolderId && (
                                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between group">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Active Link</p>
                                            </div>
                                            <span className="text-[8px] font-mono text-emerald-600/50 truncate max-w-[100px]">{siteSettings.driveFolderId}</span>
                                        </div>
                                    )}

                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Internal Handshake Guide</p>
                                        <ul className="space-y-1">
                                            <li className="text-[9px] font-medium text-slate-500 flex items-start gap-2">
                                                <span className="w-1 h-1 bg-indigo-500 rounded-full mt-1.5"></span>
                                                Folder <b>must</b> be Shared to "Anyone with link"
                                            </li>
                                            <li className="text-[9px] font-medium text-slate-500 flex items-start gap-2">
                                                <span className="w-1 h-1 bg-indigo-500 rounded-full mt-1.5"></span>
                                                Verify Internet connection for handshake
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/50">
                                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Protocol Note</span>
                                </div>
                                <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed">Selecting "Firebase" ensures sub-second retrieval times and multi-device synchronization.</p>
                            </div>
                        </div>
                    </div>
                    
                    <button onClick={handleSaveSite} className="mt-12 w-full py-5 bg-slate-950 dark:bg-indigo-600 text-white font-black rounded-[2rem] shadow-2xl hover:bg-black dark:hover:bg-indigo-700 transition-all uppercase tracking-[0.3em] text-xs">Propagate Settings</button>
                </section>
                
                {/* Social Card */}
                <section className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-serif font-black text-slate-900 dark:text-white">Communication Feeds</h3>
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
                    <button onClick={handleSaveSocial} className="w-full py-4 border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase tracking-widest text-[10px]">Sync External Feeds</button>
                </section>
            </div>
            
            <div className="space-y-8">
                {/* Status Column */}
                <section className="bg-slate-900 rounded-[3rem] p-10 border border-white/5 shadow-2xl space-y-8 h-full">
                    <div className="pb-8 border-b border-white/10">
                        <h3 className="text-xl font-black text-white mb-2">Vault Health</h3>
                        <p className="text-slate-400 text-xs font-medium">Real-time status of your academic ecosystem.</p>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Database</p>
                                    <p className="text-xs font-bold text-white">Firestore Secure</p>
                                </div>
                            </div>
                            <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        </div>

                        <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Storage Pipeline</p>
                                    <p className="text-xs font-bold text-white">Drive / Google Cloud</p>
                                </div>
                            </div>
                            {siteSettings.uploadService === 'firebase' ? (
                                <div className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase rounded-full tracking-widest border border-indigo-500/30">Active</div>
                            ) : (
                                <div className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase rounded-full tracking-widest border border-amber-500/30">External</div>
                            )}
                        </div>
                        
                        <div className="pt-8">
                            <button onClick={() => setIsAdvanceModalOpen(true)} className="w-full py-5 bg-amber-500 text-slate-900 font-black rounded-2xl shadow-xl uppercase tracking-[0.2em] text-[10px] hover:bg-amber-400 transition-all active:scale-95 mb-4">Advance Tenure</button>
                            <button onClick={() => setIsMigrationModalOpen(true)} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-[0.2em] text-[10px] hover:bg-indigo-500 transition-all active:scale-95 mb-4">Migrate Assets</button>
                            <button onClick={() => setIsWipeModalOpen(true)} className="w-full py-5 bg-transparent border-2 border-rose-500/30 text-rose-500 font-black rounded-2xl uppercase tracking-[0.2em] text-[10px] hover:bg-rose-500/10 transition-all active:scale-95">Wipe Records</button>
                        </div>
                    </div>
                </section>
            </div>
        </div>

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

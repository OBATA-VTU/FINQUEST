import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { QuestionGrid } from '../components/QuestionGrid';
import { EditProfileModal } from '../components/EditProfileModal';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { PastQuestion, TestResult } from '../types';
import { VerificationBadge } from '../components/VerificationBadge';
import { AddPasswordModal } from '../components/AddPasswordModal';
import { getBadge } from '../utils/badges';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, colorClass: string }> = ({ icon, label, value, colorClass }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-[2rem] flex items-center gap-5 border border-slate-200 dark:border-slate-700 shadow-sm transition-transform hover:-translate-y-1`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colorClass}`}>{icon}</div>
        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p><p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{value}</p></div>
    </div>
);

export const ProfilePage: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddPasswordModalOpen, setIsAddPasswordModalOpen] = useState(false);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<PastQuestion[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'saved' | 'install'>('overview');
  const [recentTests, setRecentTests] = useState<TestResult[]>([]);
  const [testCount, setTestCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // PWA Install logic
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
      if (!deferredPrompt) {
          showNotification("Deployment portal already installed or browser incompatible. Use Chrome/Safari.", "info");
          return;
      }
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsInstalled(true);
          showNotification("Installation sequence initiated!", "success");
      }
  };

  useEffect(() => {
    const fetchData = async () => {
        if (!auth?.user?.id) return;
        setLoadingStats(true);
        try {
            const testQuery = query(collection(db, 'test_results'), where('userId', '==', auth.user.id));
            const testSnap = await getDocs(testQuery);
            const tests = testSnap.docs.map(d => ({ id: d.id, ...d.data() } as TestResult));
            tests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setRecentTests(tests.slice(0, 3));
            setTestCount(tests.length);
            setAvgScore(tests.length > 0 ? Math.round(tests.reduce((a,c)=>a+c.score,0)/tests.length) : 0);
        } catch (e) { console.error(e); } finally { setLoadingStats(false); }
    };
    fetchData();

    if (activeTab === 'saved' && auth?.user?.savedQuestions?.length) {
        setLoadingBookmarks(true);
        const fetchSaved = async () => {
            try {
                const docs = await Promise.all(auth.user!.savedQuestions!.map(id => getDoc(doc(db, 'questions', id))));
                setBookmarkedQuestions(docs.filter(d=>d.exists()).map(d=>({id:d.id, ...d.data()} as PastQuestion)));
            } catch(e) {} finally { setLoadingBookmarks(false); }
        };
        fetchSaved();
    }
  }, [auth?.user?.id, auth?.user?.savedQuestions, activeTab]);

  if (!auth?.user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 transition-colors">
      <div className="h-64 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 relative">
          <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-10 max-w-5xl">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white/20 dark:border-slate-700/50 p-8 md:p-12 mb-8 relative overflow-hidden">
              <div className="absolute top-8 right-8 flex gap-2">
                  <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-200 dark:border-slate-700 hover:shadow-md active:scale-95 shadow-sm">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      Edit Profile
                  </button>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="relative shrink-0">
                      <div className="w-40 h-40 rounded-[2.5rem] border-4 border-white dark:border-slate-800 bg-white shadow-2xl overflow-hidden transform -rotate-3 transition-transform hover:rotate-0">
                          {auth.user.avatarUrl ? <img src={auth.user.avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-900 text-5xl font-black text-indigo-300">{auth.user.name.charAt(0).toUpperCase()}</div>}
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-900 rounded-full p-2 shadow-xl border border-slate-100 dark:border-slate-700 animate-bounce"><VerificationBadge role={auth.user.role} isVerified={auth.user.isVerified} className="w-8 h-8" /></div>
                  </div>
                  <div className="text-center md:text-left flex-1">
                      <h1 className="text-4xl md:text-5xl font-serif font-black text-slate-900 dark:text-white mb-2 leading-none">{auth.user.name}</h1>
                      <p className="text-indigo-600 dark:text-indigo-400 font-black tracking-widest uppercase text-xs mb-6">@{auth.user.username}</p>
                      <div className="flex flex-wrap justify-center md:justify-start gap-3">
                          <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-slate-700 shadow-sm">{auth.user.level} Level</span>
                          <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/50 shadow-sm">{auth.user.role.replace('_', ' ')}</span>
                      </div>
                  </div>
              </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-2 rounded-[2rem] shadow-sm border border-white/20 dark:border-slate-800 w-fit mx-auto overflow-x-auto max-w-full">
              <button onClick={() => setActiveTab('overview')} className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-indigo-600'}`}>Summary</button>
              <button onClick={() => setActiveTab('saved')} className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === 'saved' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-indigo-600'}`}>Archives</button>
              <button onClick={() => setActiveTab('install')} className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'install' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-indigo-600'}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Install APK</button>
          </div>

          {activeTab === 'overview' && (
              <div className="space-y-8 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <StatCard icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} label="Prestige" value={auth.user.contributionPoints || 0} colorClass="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400" />
                      <StatCard icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>} label="Sessions" value={loadingStats ? '...' : testCount} colorClass="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400" />
                      <StatCard icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} label="Efficiency" value={loadingStats ? '...' : `${avgScore}%`} colorClass="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" />
                      <StatCard icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>} label="Library" value={auth.user.savedQuestions?.length || 0} colorClass="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-xl">
                          <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-2"><span className="w-2 h-2 bg-indigo-500 rounded-full"></span>Performance History</h3>
                          {recentTests.length > 0 ? (
                              <div className="space-y-4">
                                  {recentTests.map(t => (
                                      <div key={t.id} className="flex items-center gap-6 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-300 dark:hover:border-indigo-900 transition-all">
                                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${t.score >= 50 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-600'}`}>{t.score}%</div>
                                          <div className="flex-1"><p className="font-black text-sm text-slate-800 dark:text-slate-100 uppercase tracking-tight">{t.topic || 'General Mock'}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.level}L • {new Date(t.date).toLocaleDateString()}</p></div>
                                      </div>
                                  ))}
                              </div>
                          ) : <div className="text-center py-16 opacity-30 italic text-sm">No recorded sessions yet.</div>}
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-xl">
                          <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-8">Achievements</h3>
                          <div className="grid grid-cols-3 gap-6">
                              {(auth.user.badges || []).slice(0, 9).map((id, i) => {
                                  const b = getBadge(id);
                                  return b ? <div key={i} className="text-center group" title={b.description}><div className="text-4xl mb-2 grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-110">{b.icon}</div><p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase leading-tight">{b.name}</p></div> : null;
                              })}
                          </div>
                          {(!auth.user.badges || auth.user.badges.length === 0) && <div className="text-center py-10 opacity-30 text-xs">Unlock badges via portal activity.</div>}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'saved' && (
              <div className="animate-fade-in">
                  {loadingBookmarks ? <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent shadow-indigo-500/20"></div></div> : bookmarkedQuestions.length > 0 ? <QuestionGrid questions={bookmarkedQuestions} /> : <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-widest text-xs">Library empty.</div>}
              </div>
          )}

          {activeTab === 'install' && (
              <div className="animate-fade-in space-y-6">
                  <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 border border-slate-100 dark:border-slate-800 shadow-2xl text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-5"><svg className="w-64 h-64" fill="currentColor" viewBox="0 0 20 20"><path d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></div>
                      
                      <div className="w-24 h-24 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-indigo-500/30 shadow-2xl ring-4 ring-indigo-50 shadow-inner">
                          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      </div>
                      <h2 className="text-4xl font-serif font-black text-slate-900 dark:text-white mb-4 leading-tight">FINSA Portal Installation</h2>
                      <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-12 text-lg">Convert this portal into a high-performance native app for your device. Access materials offline and receive instant notifications.</p>
                      
                      {!isInstalled ? (
                          <div className="space-y-16">
                              <button onClick={handleInstall} className="px-16 py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-2xl hover:shadow-indigo-500/40 active:scale-95 uppercase tracking-widest text-sm">Deploy Application</button>
                              
                              <div className="grid md:grid-cols-2 gap-12 pt-12 border-t border-slate-100 dark:border-slate-800">
                                  <div className="text-left bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                      <h4 className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-3 mb-6 uppercase tracking-widest text-xs"><span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black">A</span>Android (Chrome)</h4>
                                      <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-4 font-medium">
                                          <li className="flex gap-3"><span className="text-indigo-600 font-black">01.</span> Open portal in Chrome browser.</li>
                                          <li className="flex gap-3"><span className="text-indigo-600 font-black">02.</span> Tap Menu (⋮) in top-right.</li>
                                          <li className="flex gap-3"><span className="text-indigo-600 font-black">03.</span> Select <span className="text-slate-900 dark:text-white font-bold">"Install App"</span>.</li>
                                          <li className="flex gap-3"><span className="text-indigo-600 font-black">04.</span> APK experience launches from Home Screen.</li>
                                      </ul>
                                  </div>
                                  <div className="text-left bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                      <h4 className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-3 mb-6 uppercase tracking-widest text-xs"><span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black">B</span>iOS (Safari)</h4>
                                      <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-4 font-medium">
                                          <li className="flex gap-3"><span className="text-indigo-600 font-black">01.</span> Open portal in Safari.</li>
                                          <li className="flex gap-3"><span className="text-indigo-600 font-black">02.</span> Tap the <span className="text-slate-900 dark:text-white font-bold">Share Button</span> (↑).</li>
                                          <li className="flex gap-3"><span className="text-indigo-600 font-black">03.</span> Select <span className="text-slate-900 dark:text-white font-bold">"Add to Home Screen"</span>.</li>
                                          <li className="flex gap-3"><span className="text-indigo-600 font-black">04.</span> Confirm to finalize installation.</li>
                                      </ul>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="p-10 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-100 dark:border-emerald-800/50 rounded-[2.5rem] shadow-xl animate-pop-in">
                              <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
                              <p className="text-emerald-700 dark:text-emerald-400 font-black uppercase tracking-[0.3em] text-xs">Application Native-Link Active</p>
                          </div>
                      )}
                  </div>
              </div>
          )}

          <div className="mt-16 text-center">
              <button onClick={async () => { await auth.logout(); navigate('/login'); }} className="px-12 py-4 bg-rose-500/10 text-rose-600 font-black rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm uppercase tracking-widest text-[10px] border border-rose-200/50 active:scale-95">Terminate Session</button>
          </div>
      </div>
      <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
      <AddPasswordModal isOpen={isAddPasswordModalOpen} onClose={() => setIsAddPasswordModalOpen(false)} />
    </div>
  );
};

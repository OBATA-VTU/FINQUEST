
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

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, colorClass: string }> = ({ icon, label, value, colorClass }) => (
    <div className={`bg-white dark:bg-slate-800 p-5 rounded-2xl flex items-center gap-4 border border-slate-200 dark:border-slate-700 shadow-sm`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>{icon}</div>
        <div><p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{label}</p><p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p></div>
    </div>
);

export const ProfilePage: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddPasswordModalOpen, setIsAddPasswordModalOpen] = useState(false);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<PastQuestion[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'saved'>('overview');
  const [recentTests, setRecentTests] = useState<TestResult[]>([]);
  const [testCount, setTestCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

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
  
  const { isPasswordAccount, isGoogleAccount, linkGoogleAccount } = auth;
  const needsPassword = isGoogleAccount && !isPasswordAccount;
  const needsGoogleLink = isPasswordAccount && !isGoogleAccount;
  const needsAvatar = !auth.user.avatarUrl;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">
      <div className="h-60 bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 relative">
          <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent"></div>
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-10 max-w-5xl">
          
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8 mb-8 relative">
              <div className="absolute top-4 right-4 flex gap-2">
                  <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-700"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>Edit</button>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="relative shrink-0">
                      <div className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-800 bg-white shadow-xl overflow-hidden">
                          {auth.user.avatarUrl ? <img src={auth.user.avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-900 text-4xl font-bold text-indigo-300">{auth.user.name.charAt(0).toUpperCase()}</div>}
                      </div>
                      <div className="absolute bottom-1 right-1 bg-white dark:bg-slate-900 rounded-full p-1.5 shadow-md"><VerificationBadge role={auth.user.role} isVerified={auth.user.isVerified} className="w-6 h-6" /></div>
                  </div>
                  <div className="text-center md:text-left flex-1">
                      <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-1">{auth.user.name}</h1>
                      <p className="text-indigo-600 dark:text-indigo-400 font-mono font-bold text-sm mb-4">@{auth.user.username}</p>
                      <div className="flex flex-wrap justify-center md:justify-start gap-3">
                          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 uppercase border border-slate-200 dark:border-slate-700">{auth.user.level} Level</span>
                          <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-xs font-bold text-indigo-600 uppercase border border-indigo-100">{auth.user.role.replace('_', ' ')}</span>
                      </div>
                  </div>
              </div>
          </div>
          
          <div className="mb-8 animate-fade-in-up">
              {needsPassword && (
                  <div className="bg-blue-50 dark:bg-slate-800 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
                      <div className="text-blue-500 text-3xl shrink-0"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
                      <div className="flex-1 text-center sm:text-left"><h3 className="font-bold text-slate-800 dark:text-white">{needsAvatar ? 'Complete Your Profile' : 'Secure Your Account'}</h3><p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Add a password for email sign-in. {needsAvatar && 'A profile picture will also help personalize your account.'}</p></div>
                      <div className="flex gap-2"><button onClick={() => setIsAddPasswordModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700">Add Password</button>{needsAvatar && <button onClick={() => setIsEditModalOpen(true)} className="px-4 py-2 bg-blue-100 text-blue-700 font-bold text-xs rounded-lg hover:bg-blue-200">Upload Photo</button>}</div>
                  </div>
              )}
              {needsGoogleLink && (
                  <div className="bg-green-50 dark:bg-slate-800 border-2 border-dashed border-green-200 dark:border-green-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
                      <div className="text-green-500 text-3xl shrink-0"><img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-8 h-8" alt="Google"/></div>
                      <div className="flex-1 text-center sm:text-left"><h3 className="font-bold text-slate-800 dark:text-white">{needsAvatar ? 'Complete Your Profile' : 'Enable One-Click Sign-In'}</h3><p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Link your Google account for faster access. {needsAvatar && 'Don\'t forget to add a profile picture!'}</p></div>
                      <div className="flex gap-2"><button onClick={linkGoogleAccount} className="px-4 py-2 bg-green-600 text-white font-bold text-xs rounded-lg hover:bg-green-700">Link Google</button>{needsAvatar && <button onClick={() => setIsEditModalOpen(true)} className="px-4 py-2 bg-green-100 text-green-700 font-bold text-xs rounded-lg hover:bg-green-200">Upload Photo</button>}</div>
                  </div>
              )}
          </div>

          <div className="flex justify-center mb-8 bg-white dark:bg-slate-900 p-1 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 w-fit mx-auto">
              <button onClick={() => setActiveTab('overview')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Overview</button>
              <button onClick={() => setActiveTab('saved')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'saved' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Saved Items</button>
          </div>

          {activeTab === 'overview' ? (
              <div className="space-y-8 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <StatCard icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} label="Contribution" value={auth.user.contributionPoints || 0} colorClass="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300" />
                      <StatCard icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>} label="Tests" value={loadingStats ? '...' : testCount} colorClass="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300" />
                      <StatCard icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} label="Avg Score" value={loadingStats ? '...' : `${avgScore}%`} colorClass="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300" />
                      <StatCard icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>} label="Saved" value={auth.user.savedQuestions?.length || 0} colorClass="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
                          <h3 className="font-bold text-slate-900 dark:text-white mb-6">Recent Test Performance</h3>
                          {recentTests.length > 0 ? (
                              <div className="space-y-4">
                                  {recentTests.map(t => (
                                      <div key={t.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black ${t.score >= 50 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{t.score}%</div>
                                          <div className="flex-1"><p className="font-bold text-sm text-slate-800 dark:text-slate-100">{t.level}L Finance Mock</p><p className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString()}</p></div>
                                      </div>
                                  ))}
                              </div>
                          ) : <p className="text-slate-400 text-center py-10">No tests taken yet.</p>}
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
                          <h3 className="font-bold text-slate-900 dark:text-white mb-6">Achievements</h3>
                          <div className="grid grid-cols-3 gap-4">
                              {(auth.user.badges || []).slice(0, 6).map((id, i) => {
                                  const b = getBadge(id);
                                  return b ? <div key={i} className="text-center" title={b.description}><div className="text-3xl mb-1">{b.icon}</div><p className="text-[10px] font-bold text-slate-500 line-clamp-1">{b.name}</p></div> : null;
                              })}
                          </div>
                      </div>
                  </div>
              </div>
          ) : (
              <div className="animate-fade-in">
                  {loadingBookmarks ? <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div> : bookmarkedQuestions.length > 0 ? <QuestionGrid questions={bookmarkedQuestions} /> : <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">No bookmarked items.</div>}
              </div>
          )}

          <div className="mt-12 text-center flex justify-center gap-4">
              <button onClick={() => navigate('/download-app')} className="px-10 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:scale-105">
                  Install App
              </button>
              <button onClick={async () => { await auth.logout(); navigate('/login'); }} className="px-10 py-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-black rounded-xl hover:bg-rose-600 hover:text-white dark:hover:bg-rose-800 transition-all">Logout Securely</button>
          </div>
      </div>
      
      {/* Modals */}
      <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
      <AddPasswordModal isOpen={isAddPasswordModalOpen} onClose={() => setIsAddPasswordModalOpen(false)} />
    </div>
  );
};

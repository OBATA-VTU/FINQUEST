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

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, colorClass: string }> = ({ icon, label, value, colorClass }) => (
    <div className={`bg-white dark:bg-slate-800 p-5 rounded-2xl flex items-center gap-4 border border-slate-200 dark:border-slate-700 shadow-sm`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{label}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
        </div>
    </div>
);

export const ProfilePage: React.FC = () => {
  const auth = useContext(AuthContext);
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
    const fetchUserData = async () => {
        if (!auth?.user?.id) return;
        setLoadingStats(true);
        try {
            const testQuery = query(collection(db, 'test_results'), where('userId', '==', auth.user.id));
            const testSnap = await getDocs(testQuery);
            const tests = testSnap.docs.map(d => ({ id: d.id, ...d.data() } as TestResult));
            tests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            setRecentTests(tests.slice(0, 3));
            setTestCount(tests.length);
            
            if (tests.length > 0) {
                const totalScore = tests.reduce((acc, curr) => acc + curr.score, 0);
                setAvgScore(Math.round(totalScore / tests.length));
            } else {
                setAvgScore(0);
            }
        } catch (e) {
            console.error("Failed to fetch profile stats", e);
        } finally {
            setLoadingStats(false);
        }
    };

    fetchUserData();

    const fetchBookmarks = async () => {
        if (auth?.user?.savedQuestions && auth.user.savedQuestions.length > 0) {
            setLoadingBookmarks(true);
            try {
                const promises = auth.user.savedQuestions.map(id => getDoc(doc(db, 'questions', id)));
                const docs = await Promise.all(promises);
                const items = docs
                    .filter(d => d.exists())
                    .map(d => ({ id: d.id, ...d.data() } as PastQuestion));
                setBookmarkedQuestions(items);
            } catch(e) { console.error("Error fetching bookmarks", e); }
            finally { setLoadingBookmarks(false); }
        } else {
            setBookmarkedQuestions([]);
        }
    };

    if (activeTab === 'saved') {
        fetchBookmarks();
    }
  }, [auth?.user?.id, auth?.user?.savedQuestions, activeTab]);

  if (!auth?.user) {
      return <div className="p-8 text-center text-red-500">Please log in to view your profile.</div>;
  }

  const { isGoogleAccount, isPasswordAccount } = auth;
  const points = auth.user.contributionPoints || 0;

  const badges = (auth.user.badges || []).map(getBadge).filter(b => b).sort((a,b) => b!.rank - a!.rank);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors duration-300">
      
      <div className="h-60 bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent"></div>
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-10">
          <div className="max-w-5xl mx-auto">
              
              {isGoogleAccount && !isPasswordAccount && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
                      <div className="flex items-center gap-3">
                          <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          <div>
                              <h4 className="font-bold text-blue-800 dark:text-blue-300">Enhance Account Security</h4>
                              <p className="text-xs text-blue-600 dark:text-blue-400">Add a password for more sign-in options.</p>
                          </div>
                      </div>
                      <button onClick={() => setIsAddPasswordModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">Add Password</button>
                  </div>
              )}

              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 overflow-hidden mb-8 p-8 relative">
                  <div className="absolute top-4 right-4">
                      <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-700">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          Edit Profile
                      </button>
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
                              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide border border-slate-200 dark:border-slate-700">{auth.user.level} Level</span>
                              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide border border-indigo-100 dark:border-indigo-800">{auth.user.role.replace('_', ' ')}</span>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="flex justify-center mb-8">
                  <div className="bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 inline-flex">
                      <button onClick={() => setActiveTab('overview')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>Overview</button>
                      <button onClick={() => setActiveTab('saved')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'saved' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>Saved Items</button>
                  </div>
              </div>

              {activeTab === 'overview' && (
                  <div className="space-y-8 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                          <StatCard icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4M17 3v4m2-2h-4m2 14h4m-4 2v-4M12 7a5 5 0 110 10 5 5 0 010-10z" /></svg>} label="Contribution Points" value={points} colorClass="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300" />
                          <StatCard icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>} label="Tests Completed" value={loadingStats ? '...' : testCount} colorClass="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300" />
                          <StatCard icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} label="Average Score" value={loadingStats ? '...' : `${avgScore}%`} colorClass="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300" />
                          <StatCard icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>} label="Saved Items" value={auth.user.savedQuestions?.length || 0} colorClass="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300" />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6">Recent Activity</h3>
                              {loadingStats ? (<p className="text-slate-400 text-sm">Loading activity...</p>) : recentTests.length > 0 ? (
                                  <div className="space-y-4">
                                      {recentTests.map(test => (
                                          <div key={test.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${test.score >= 50 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg></div>
                                              <div className="flex-1"><p className="font-bold text-sm text-slate-800 dark:text-slate-200">Completed a CBT Practice</p><p className="text-xs text-slate-500 dark:text-slate-400">{new Date(test.date).toLocaleString()}</p></div>
                                              <div className={`font-bold text-lg ${test.score >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>{test.score}%</div>
                                          </div>
                                      ))}
                                  </div>
                              ) : (<p className="text-slate-400 text-sm py-8 text-center">No recent test activity.</p>)}
                          </div>

                          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6">Achievements</h3>
                              {badges.length > 0 ? (
                                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-4">
                                      {badges.slice(0, 6).map((badge) => (
                                          <div key={badge.id} className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50" title={`${badge.name}: ${badge.description}`}>
                                              <div className="text-4xl mb-1">{badge.icon}</div>
                                              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 line-clamp-2">{badge.name}</p>
                                          </div>
                                      ))}
                                  </div>
                              ) : (<p className="text-center text-slate-400 text-sm py-8">No badges earned yet.</p>)}
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'saved' && (
                  <div className="animate-fade-in">
                      {loadingBookmarks ? (<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>) : bookmarkedQuestions.length > 0 ? (
                          <QuestionGrid questions={bookmarkedQuestions} />
                      ) : (
                          <div className="bg-white dark:bg-slate-800 p-16 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-500"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg></div>
                              <h3 className="font-bold text-slate-900 dark:text-white text-lg">No Bookmarks Yet</h3>
                              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 mb-6">Save questions for later revision.</p>
                              <button onClick={() => window.location.href='/questions'} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">Browse Questions</button>
                          </div>
                      )}
                  </div>
              )}
          </div>
      </div>
      <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
      <AddPasswordModal isOpen={isAddPasswordModalOpen} onClose={() => setIsAddPasswordModalOpen(false)} />
    </div>
  );
};

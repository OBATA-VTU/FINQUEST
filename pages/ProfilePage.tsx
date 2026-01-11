
import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { QuestionGrid } from '../components/QuestionGrid';
import { EditProfileModal } from '../components/EditProfileModal';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { PastQuestion } from '../types';
import { VerificationBadge } from '../components/VerificationBadge';

export const ProfilePage: React.FC = () => {
  const auth = useContext(AuthContext);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<PastQuestion[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'saved'>('overview');

  useEffect(() => {
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
            } catch(e) {
                console.error("Error fetching bookmarks", e);
            } finally {
                setLoadingBookmarks(false);
            }
        } else {
            setBookmarkedQuestions([]);
        }
    };
    if (activeTab === 'saved') fetchBookmarks();
  }, [auth?.user?.savedQuestions, activeTab]);

  if (!auth?.user) {
      return <div className="p-8 text-center text-red-500">Please log in to view your profile.</div>;
  }

  const points = auth.user.contributionPoints || 0;

  const getBadges = (pts: number) => {
      const badges = [];
      if (pts > 0) badges.push({ name: 'Contributor', icon: '🌱', desc: 'Started the journey', color: 'bg-green-100 text-green-700' });
      if (pts >= 20) badges.push({ name: 'Active Member', icon: '🚀', desc: '20+ Points earned', color: 'bg-blue-100 text-blue-700' });
      if (pts >= 50) badges.push({ name: 'Scholar', icon: '🎓', desc: '50+ Points earned', color: 'bg-purple-100 text-purple-700' });
      if (pts >= 100) badges.push({ name: 'Legend', icon: '👑', desc: 'Top Contributor', color: 'bg-amber-100 text-amber-700' });
      return badges;
  };

  const badges = getBadges(points);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors duration-300">
      
      {/* 1. COVER PHOTO with Glassmorphism */}
      <div className="h-60 bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent"></div>
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-10">
          <div className="max-w-5xl mx-auto">
              
              {/* 2. PROFILE HEADER */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 overflow-hidden mb-8 p-8 relative">
                  <div className="absolute top-4 right-4">
                      <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-700">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          Edit Profile
                      </button>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-8">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                          <div className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-800 bg-white shadow-xl overflow-hidden">
                              {auth.user.avatarUrl ? (
                                  <img src={auth.user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-900 text-4xl font-bold text-indigo-300">
                                      {auth.user.name.charAt(0).toUpperCase()}
                                  </div>
                              )}
                          </div>
                          <div className="absolute bottom-1 right-1 bg-white dark:bg-slate-900 rounded-full p-1.5 shadow-md">
                              <VerificationBadge role={auth.user.role} isVerified={auth.user.isVerified} className="w-6 h-6" />
                          </div>
                      </div>

                      <div className="text-center md:text-left flex-1">
                          <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-1">{auth.user.name}</h1>
                          <p className="text-indigo-600 dark:text-indigo-400 font-mono font-bold text-sm mb-4">@{auth.user.username}</p>
                          
                          <div className="flex flex-wrap justify-center md:justify-start gap-3">
                              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide border border-slate-200 dark:border-slate-700">
                                  {auth.user.level} Level
                              </span>
                              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide border border-indigo-100 dark:border-indigo-800">
                                  {auth.user.role.replace('_', ' ')}
                              </span>
                              {auth.user.matricNumber && (
                                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono border border-emerald-100 dark:border-emerald-800">
                                      {auth.user.matricNumber}
                                  </span>
                              )}
                          </div>
                      </div>

                      {/* Score Box */}
                      <div className="bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/50 p-6 rounded-2xl border border-indigo-100 dark:border-slate-700 min-w-[180px] text-center">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Reputation</p>
                          <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{points}</p>
                          <p className="text-[10px] text-indigo-400 mt-1 font-bold">Top Contributor</p>
                      </div>
                  </div>
              </div>

              {/* 3. TABS */}
              <div className="flex justify-center mb-8">
                  <div className="bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 inline-flex">
                      <button 
                        onClick={() => setActiveTab('overview')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                      >
                          Overview
                      </button>
                      <button 
                        onClick={() => setActiveTab('saved')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'saved' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                      >
                          Saved Items
                      </button>
                  </div>
              </div>

              {/* 4. CONTENT */}
              {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                      {/* Achievements */}
                      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                              <span className="text-2xl">🏆</span> Achievements
                          </h3>
                          {badges.length > 0 ? (
                              <div className="grid grid-cols-1 gap-4">
                                  {badges.map((badge, idx) => (
                                      <div key={idx} className={`p-4 rounded-2xl flex items-center gap-4 ${badge.color.includes('bg-') ? badge.color.replace('bg-', 'bg-opacity-10 bg-') : 'bg-slate-50'} border border-slate-100 dark:border-slate-700 transition-transform hover:scale-[1.02]`}>
                                          <div className="text-3xl bg-white dark:bg-slate-900 w-12 h-12 rounded-full flex items-center justify-center shadow-sm">{badge.icon}</div>
                                          <div>
                                              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{badge.name}</h4>
                                              <p className="text-xs text-slate-500 dark:text-slate-400">{badge.desc}</p>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="text-center py-10 text-slate-400">
                                  <p>Earn points to unlock badges!</p>
                              </div>
                          )}
                      </div>

                      {/* Account Details */}
                      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                              <span className="text-2xl">🛡️</span> Account Info
                          </h3>
                          <div className="space-y-4">
                              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Email</span>
                                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{auth.user.email}</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Status</span>
                                  <span className={`text-xs font-bold px-2 py-1 rounded ${auth.user.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                      {auth.user.isVerified ? 'Verified' : 'Unverified'}
                                  </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Joined</span>
                                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{new Date(auth.user.createdAt || Date.now()).toLocaleDateString()}</span>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'saved' && (
                  <div className="animate-fade-in">
                      {loadingBookmarks ? (
                          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
                      ) : bookmarkedQuestions.length > 0 ? (
                          <QuestionGrid questions={bookmarkedQuestions} />
                      ) : (
                          <div className="bg-white dark:bg-slate-800 p-16 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-500">
                                   <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                              </div>
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
    </div>
  );
};


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
                // Fetch each bookmarked question by ID
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

  // Gamification Badges Logic
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 transition-colors duration-300">
      
      {/* 1. COVER PHOTO */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-slate-50/50 dark:from-slate-900/50 to-transparent backdrop-blur-[2px]"></div>
      </div>

      <div className="container mx-auto px-4 -mt-24 relative z-10">
          <div className="max-w-5xl mx-auto">
              
              {/* 2. PROFILE CARD */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-8">
                  <div className="p-6 md:p-10 flex flex-col md:flex-row items-center md:items-end gap-8 text-center md:text-left">
                      
                      {/* Avatar */}
                      <div className="relative group cursor-pointer shrink-0" onClick={() => setIsEditModalOpen(true)}>
                          <div className="w-36 h-36 md:w-44 md:h-44 rounded-full border-[6px] border-white dark:border-slate-800 bg-white shadow-2xl overflow-hidden ring-4 ring-slate-50 dark:ring-slate-700">
                              {auth.user.avatarUrl ? (
                                  <img src={auth.user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-900 text-5xl font-bold text-indigo-300">
                                      {auth.user.name.charAt(0).toUpperCase()}
                                  </div>
                              )}
                          </div>
                          <div className="absolute bottom-3 right-3 bg-indigo-600 text-white p-2 rounded-full shadow-lg border-4 border-white dark:border-slate-800 hover:bg-indigo-700 transition-colors">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 pb-2 w-full">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2">
                             <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-white">{auth.user.name}</h1>
                             {auth.user.isVerified && (
                                 <span className="hidden md:inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                                     <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                     Verified Student
                                 </span>
                             )}
                          </div>
                          
                          {/* Username + Badge Area */}
                          <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                              <span className="text-lg font-mono font-medium text-slate-500 dark:text-slate-400">@{auth.user.username}</span>
                              <VerificationBadge role={auth.user.role} isVerified={auth.user.isVerified} className="w-5 h-5" />
                          </div>

                          <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
                              <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center gap-2 border border-slate-200 dark:border-slate-600">
                                  <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{auth.user.level} Level</span>
                              </div>
                              <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center gap-2 border border-indigo-100 dark:border-indigo-800">
                                  <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                  <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300 capitalize">{auth.user.role.replace('_', ' ')}</span>
                              </div>
                          </div>
                      </div>

                      {/* Points Display */}
                      <div className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 min-w-[160px] text-center md:text-right">
                          <div className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">Reputation Score</div>
                          <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                              {points}
                          </div>
                          <div className="text-xs font-bold text-emerald-500 mt-1">Top 15%</div>
                      </div>
                  </div>

                  {/* TABS NAVIGATION */}
                  <div className="flex border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 md:px-10">
                      <button 
                        onClick={() => setActiveTab('overview')}
                        className={`py-4 px-6 text-sm font-bold text-center border-b-[3px] transition-all ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                      >
                          Overview
                      </button>
                      <button 
                        onClick={() => setActiveTab('saved')}
                        className={`py-4 px-6 text-sm font-bold text-center border-b-[3px] transition-all ${activeTab === 'saved' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                      >
                          Saved Materials
                      </button>
                  </div>
              </div>

              {/* 3. CONTENT AREA */}
              {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
                      {/* Personal Details */}
                      <div className="md:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6 flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                              <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0c0 .883-.393 1.627-1 2.172m.5.5L9.5 7.172M9 11h1" /></svg>
                              </span>
                              Academic Profile
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                              <div>
                                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">{auth.user.name}</span>
                              </div>
                              <div>
                                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 text-lg break-all">{auth.user.email}</span>
                              </div>
                              <div>
                                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Matriculation Number</span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-lg bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded w-fit">{auth.user.matricNumber || 'Not Set'}</span>
                              </div>
                              <div>
                                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Level</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">{auth.user.level} Level</span>
                              </div>
                          </div>
                      </div>

                      {/* Badges / Gamification */}
                      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6 flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                              <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                              </span>
                              Achievements
                          </h3>
                          {badges.length > 0 ? (
                              <div className="space-y-4">
                                  {badges.map((badge, idx) => (
                                      <div key={idx} className={`p-4 rounded-xl flex items-center gap-4 ${badge.color.includes('bg-') ? badge.color.replace('bg-', 'bg-opacity-10 bg-') : 'bg-slate-50'} border border-slate-100 dark:border-slate-700 transition-transform hover:scale-105`}>
                                          <div className="text-3xl">{badge.icon}</div>
                                          <div>
                                              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{badge.name}</h4>
                                              <p className="text-xs text-slate-500 dark:text-slate-400">{badge.desc}</p>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                                  <div className="text-4xl mb-2 grayscale opacity-50">🏆</div>
                                  <p className="text-sm">Start participating to earn badges!</p>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'saved' && (
                  <div className="animate-fade-in">
                      {loadingBookmarks ? (
                          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
                      ) : bookmarkedQuestions.length > 0 ? (
                          <>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6">Your Learning Collection</h3>
                            <QuestionGrid questions={bookmarkedQuestions} />
                          </>
                      ) : (
                          <div className="bg-white dark:bg-slate-800 p-16 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-500">
                                   <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                              </div>
                              <h3 className="font-bold text-slate-900 dark:text-white text-lg">No Bookmarks Yet</h3>
                              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-sm mx-auto">When you see a Past Question you want to review later, click the bookmark icon to save it here.</p>
                              <button onClick={() => window.location.href='/questions'} className="mt-6 px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">Browse Questions</button>
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

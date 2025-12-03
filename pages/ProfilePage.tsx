
import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { QuestionGrid } from '../components/QuestionGrid';
import { EditProfileModal } from '../components/EditProfileModal';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { PastQuestion } from '../types';

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
      <div className="h-48 md:h-64 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
          <div className="absolute inset-0 bg-black/10"></div>
      </div>

      <div className="container mx-auto px-4 -mt-24 relative z-10">
          <div className="max-w-4xl mx-auto">
              
              {/* 2. PROFILE CARD */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-8">
                  <div className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
                      
                      {/* Avatar */}
                      <div className="relative group cursor-pointer" onClick={() => setIsEditModalOpen(true)}>
                          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-slate-800 bg-white shadow-lg overflow-hidden">
                              {auth.user.avatarUrl ? (
                                  <img src={auth.user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-900 text-4xl font-bold text-indigo-300">
                                      {auth.user.name.charAt(0).toUpperCase()}
                                  </div>
                              )}
                          </div>
                          <div className="absolute bottom-2 right-2 bg-indigo-600 text-white p-1.5 rounded-full shadow-md border-2 border-white dark:border-slate-800">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 pb-2">
                          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{auth.user.name}</h1>
                          <p className="text-slate-500 dark:text-slate-400 font-medium mb-3">@{auth.user.username}</p>
                          <div className="flex flex-wrap justify-center md:justify-start gap-2">
                              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-full uppercase tracking-wide border border-slate-200 dark:border-slate-600">
                                  {auth.user.level} Level
                              </span>
                              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full uppercase tracking-wide border border-indigo-100 dark:border-indigo-800">
                                  {auth.user.role}
                              </span>
                          </div>
                      </div>

                      {/* Points Display */}
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 min-w-[140px]">
                          <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Reputation</div>
                          <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 flex items-baseline gap-1 justify-center md:justify-start">
                              {points} <span className="text-sm text-slate-400 font-medium">pts</span>
                          </div>
                      </div>
                  </div>

                  {/* TABS NAVIGATION */}
                  <div className="flex border-t border-slate-100 dark:border-slate-700">
                      <button 
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                      >
                          Overview
                      </button>
                      <button 
                        onClick={() => setActiveTab('saved')}
                        className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'saved' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                      >
                          Saved Items
                      </button>
                  </div>
              </div>

              {/* 3. CONTENT AREA */}
              {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                      {/* Personal Details */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                          <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                              <span className="w-1 h-5 bg-indigo-500 rounded-full"></span>
                              Personal Details
                          </h3>
                          <div className="space-y-4">
                              <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-700">
                                  <span className="text-sm text-slate-500 dark:text-slate-400">Full Name</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{auth.user.name}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-700">
                                  <span className="text-sm text-slate-500 dark:text-slate-400">Email</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{auth.user.email}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-700">
                                  <span className="text-sm text-slate-500 dark:text-slate-400">Matric Number</span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{auth.user.matricNumber || 'Not Set'}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-700">
                                  <span className="text-sm text-slate-500 dark:text-slate-400">Academic Level</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{auth.user.level} Level</span>
                              </div>
                          </div>
                      </div>

                      {/* Badges / Gamification */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                          <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                              <span className="w-1 h-5 bg-amber-500 rounded-full"></span>
                              Achievements
                          </h3>
                          {badges.length > 0 ? (
                              <div className="space-y-3">
                                  {badges.map((badge, idx) => (
                                      <div key={idx} className={`p-3 rounded-xl flex items-center gap-4 ${badge.color.includes('bg-') ? badge.color.replace('bg-', 'bg-opacity-20 bg-') : 'bg-slate-50'} border border-slate-100 dark:border-slate-700`}>
                                          <div className="text-2xl">{badge.icon}</div>
                                          <div>
                                              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{badge.name}</h4>
                                              <p className="text-xs text-slate-500 dark:text-slate-400">{badge.desc}</p>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                                  <p>No badges yet. Participate to earn!</p>
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
                          <QuestionGrid questions={bookmarkedQuestions} />
                      ) : (
                          <div className="bg-white dark:bg-slate-800 p-16 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-500">
                                   <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                              </div>
                              <h3 className="font-bold text-slate-900 dark:text-white">No Bookmarks</h3>
                              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Save important questions to access them here later.</p>
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

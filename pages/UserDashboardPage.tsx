
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { TestResult } from '../types';

export const UserDashboardPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const user = auth?.user;
  
  const [greeting, setGreeting] = useState('');
  const [recentTests, setRecentTests] = useState<TestResult[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);

  useEffect(() => {
    // Smart Greeting based on Time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  useEffect(() => {
      const fetchRecentActivity = async () => {
          if (!user?.id) return;
          try {
              const q = query(
                  collection(db, 'test_results'), 
                  where('userId', '==', user.id),
                  orderBy('date', 'desc'),
                  limit(3)
              );
              const snap = await getDocs(q);
              setRecentTests(snap.docs.map(d => ({ id: d.id, ...d.data() } as TestResult)));
          } catch (e) {
              console.error("Failed to fetch recent tests", e);
          } finally {
              setLoadingTests(false);
          }
      };
      fetchRecentActivity();
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans pb-12 transition-colors duration-300">
      
      {/* 1. HERO SECTION */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 transition-colors">
          <div className="container mx-auto px-4 py-8 md:py-12">
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                   {/* Avatar with Ring */}
                   <div className="relative group cursor-pointer" onClick={() => navigate('/profile')}>
                       <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-200"></div>
                       <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white dark:border-slate-700 bg-slate-100 dark:bg-slate-700 overflow-hidden shadow-lg">
                           {user.avatarUrl ? (
                               <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                           ) : (
                               <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-indigo-300 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30">
                                   {user.name.charAt(0).toUpperCase()}
                               </div>
                           )}
                       </div>
                       <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-4 border-white dark:border-slate-800 rounded-full"></div>
                   </div>

                   {/* Welcome Text */}
                   <div className="text-center md:text-left flex-1">
                       <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-white mb-2">
                           {greeting}, {user.name.split(' ')[0]}!
                       </h1>
                       <p className="text-slate-500 dark:text-slate-400 text-lg mb-4">
                           Ready to achieve academic excellence today?
                       </p>
                       <div className="flex flex-wrap justify-center md:justify-start gap-3">
                           <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-100 dark:border-indigo-800">
                               {user.level} Level
                           </span>
                           <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-600">
                               {user.role}
                           </span>
                           <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-900">
                               Active
                           </span>
                       </div>
                   </div>

                   {/* Quick Profile Edit CTA */}
                   <button 
                        onClick={() => navigate('/profile')}
                        className="hidden md:flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-indigo-200 transition-all shadow-sm"
                   >
                       <svg className="w-5 h-5 text-slate-400 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                       Settings
                   </button>
              </div>
          </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN - MAIN ACTIONS */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* 2. QUICK ACTIONS GRID */}
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-indigo-600 dark:bg-indigo-500 rounded-full"></span>
                        Quick Access
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div 
                            onClick={() => navigate('/questions')}
                            className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-500 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <svg className="w-24 h-24 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>
                            </div>
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-300 mb-4 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Past Questions</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Browse archives and study materials.</p>
                        </div>

                        <div 
                            onClick={() => navigate('/test')}
                            className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-500 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <svg className="w-24 h-24 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-300 mb-4 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">CBT Practice</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Take mock tests and AI quizzes.</p>
                        </div>

                        <div 
                            onClick={() => navigate('/community')}
                            className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-500 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <svg className="w-24 h-24 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" /><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" /></svg>
                            </div>
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-300 mb-4 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Community</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Join the student lounge discussion.</p>
                        </div>

                        <div 
                            onClick={() => navigate('/lecturers')}
                            className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-500 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <svg className="w-24 h-24 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                            </div>
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-300 mb-4 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Lecturers</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Department staff directory.</p>
                        </div>
                    </div>
                </div>

                {/* 3. RECENT ACTIVITY */}
                <div>
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="w-1 h-6 bg-rose-500 rounded-full"></span>
                            Recent Test Activity
                        </h2>
                        <button onClick={() => navigate('/test')} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View All</button>
                     </div>
                     
                     <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                         {loadingTests ? (
                             <div className="p-8 text-center text-slate-400">Loading activity...</div>
                         ) : recentTests.length === 0 ? (
                             <div className="p-8 text-center">
                                 <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-500">
                                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                 </div>
                                 <p className="text-slate-600 dark:text-slate-400 font-medium">No tests taken yet.</p>
                                 <button onClick={() => navigate('/test')} className="mt-2 text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline">Start a practice session</button>
                             </div>
                         ) : (
                             <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                 {recentTests.map(test => (
                                     <div key={test.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                         <div className="flex items-center gap-4">
                                             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${test.score >= 50 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                                                 {test.score}%
                                             </div>
                                             <div>
                                                 <p className="font-bold text-slate-900 dark:text-white text-sm">Practice Session</p>
                                                 <p className="text-xs text-slate-400 dark:text-slate-500">{new Date(test.date).toLocaleDateString()} • {test.totalQuestions} Questions</p>
                                             </div>
                                         </div>
                                         <span className={`text-xs font-bold px-2 py-1 rounded border ${test.score >= 50 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400'}`}>
                                             {test.score >= 50 ? 'Passed' : 'Review'}
                                         </span>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>
                </div>

            </div>
            
            {/* RIGHT COLUMN - SIDEBAR WIDGETS */}
            <div className="space-y-6">
                
                {/* Profile Summary Widget */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wide">My Profile</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-700">
                            <span className="text-slate-500 dark:text-slate-400 text-sm">Matric No</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{user.matricNumber || '---'}</span>
                        </div>
                         <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-700">
                            <span className="text-slate-500 dark:text-slate-400 text-sm">Level</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{user.level}L</span>
                        </div>
                         <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-700">
                            <span className="text-slate-500 dark:text-slate-400 text-sm">Email</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[150px]">{user.email}</span>
                        </div>
                    </div>
                    <button onClick={() => navigate('/profile')} className="w-full mt-6 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                        Full Profile
                    </button>
                </div>

                {/* Contribute Widget */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 dark:from-indigo-950 dark:to-slate-950 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                    <div className="relative z-10">
                        <div className="w-10 h-10 bg-indigo-500/30 rounded-lg flex items-center justify-center mb-4 text-indigo-200">
                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        </div>
                        <h3 className="text-lg font-bold mb-2">Have Past Questions?</h3>
                        <p className="text-indigo-200 text-sm mb-6 leading-relaxed">
                            Help your juniors and peers by uploading materials you have.
                        </p>
                        <button onClick={() => navigate('/questions')} className="w-full py-2.5 bg-white text-indigo-900 font-bold rounded-lg hover:bg-indigo-50 transition text-sm">
                            Upload Now
                        </button>
                    </div>
                </div>

                 {/* Announcement Mini Widget */}
                 <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 p-6">
                     <h3 className="font-bold text-amber-800 dark:text-amber-500 mb-2 flex items-center gap-2">
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                         Updates
                     </h3>
                     <p className="text-amber-700 dark:text-amber-400 text-sm mb-3">Check the latest department news and upcoming events.</p>
                     <button onClick={() => navigate('/announcements')} className="text-amber-900 dark:text-amber-300 font-bold text-xs underline decoration-amber-400 hover:text-amber-600 dark:hover:text-amber-200">Read Announcements &rarr;</button>
                 </div>

            </div>
        </div>
      </div>
    </div>
  );
};


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
  const [testCount, setTestCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  useEffect(() => {
      const fetchStats = async () => {
          if (!user?.id) return;
          try {
              const q = query(
                  collection(db, 'test_results'), 
                  where('userId', '==', user.id),
                  orderBy('date', 'desc')
              );
              const snap = await getDocs(q);
              const tests = snap.docs.map(d => ({ id: d.id, ...d.data() } as TestResult));
              
              setRecentTests(tests.slice(0, 3));
              setTestCount(tests.length);
              
              if (tests.length > 0) {
                  const total = tests.reduce((acc, curr) => acc + curr.score, 0);
                  setAvgScore(Math.round(total / tests.length));
              }
          } catch (e) {
              console.error("Failed to fetch dashboard stats", e);
          } finally {
              setLoadingTests(false);
          }
      };
      fetchStats();
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 font-sans transition-colors">
      
      {/* HERO SECTION */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white relative overflow-hidden pb-12 pt-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
          
          <div className="container mx-auto px-4 relative z-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                      <div className="flex items-center gap-2 mb-2 text-indigo-300 text-sm font-bold uppercase tracking-wider">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                          Online Dashboard
                      </div>
                      <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">
                          {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">{user.name.split(' ')[0]}</span>
                      </h1>
                      <p className="text-indigo-100 max-w-lg leading-relaxed">
                          "Success is not final, failure is not fatal: it is the courage to continue that counts."
                      </p>
                  </div>
                  
                  {/* Stats Row overlay on desktop, stacked on mobile */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto mt-4 md:mt-0">
                      <div className="bg-white/10 backdrop-blur-sm border border-white/10 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold">{testCount}</div>
                          <div className="text-[10px] uppercase tracking-wider opacity-70">Tests Taken</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm border border-white/10 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold">{avgScore}%</div>
                          <div className="text-[10px] uppercase tracking-wider opacity-70">Avg Score</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm border border-white/10 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold">{user.contributionPoints || 0}</div>
                          <div className="text-[10px] uppercase tracking-wider opacity-70">Points</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm border border-white/10 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold">{user.level}L</div>
                          <div className="text-[10px] uppercase tracking-wider opacity-70">Level</div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className="container mx-auto px-4 -mt-8 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* LEFT COLUMN (2/3) */}
              <div className="lg:col-span-2 space-y-8">
                  
                  {/* QUICK ACTIONS */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <button 
                        onClick={() => navigate('/test')}
                        className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg shadow-indigo-100/50 dark:shadow-none hover:-translate-y-1 transition-all duration-300 group text-center border border-slate-100 dark:border-slate-700"
                      >
                          <div className="w-12 h-12 mx-auto bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                          </div>
                          <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Practice</span>
                      </button>

                      <button 
                        onClick={() => navigate('/questions')}
                        className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg shadow-indigo-100/50 dark:shadow-none hover:-translate-y-1 transition-all duration-300 group text-center border border-slate-100 dark:border-slate-700"
                      >
                          <div className="w-12 h-12 mx-auto bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                          </div>
                          <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Archives</span>
                      </button>

                      <button 
                        onClick={() => navigate('/community')}
                        className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg shadow-indigo-100/50 dark:shadow-none hover:-translate-y-1 transition-all duration-300 group text-center border border-slate-100 dark:border-slate-700"
                      >
                          <div className="w-12 h-12 mx-auto bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 mb-3 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                          </div>
                          <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Community</span>
                      </button>

                      <button 
                        onClick={() => navigate('/lecturers')}
                        className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg shadow-indigo-100/50 dark:shadow-none hover:-translate-y-1 transition-all duration-300 group text-center border border-slate-100 dark:border-slate-700"
                      >
                          <div className="w-12 h-12 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                          </div>
                          <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Directory</span>
                      </button>
                  </div>

                  {/* RECENT ACTIVITY LIST */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                      <div className="flex justify-between items-center mb-6">
                          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                              <span className="w-1 h-6 bg-indigo-600 rounded-full"></span>
                              Academic Activity
                          </h2>
                          <button onClick={() => navigate('/test')} className="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline">View All</button>
                      </div>

                      {loadingTests ? (
                          <div className="text-center py-10 text-slate-400">Loading records...</div>
                      ) : recentTests.length === 0 ? (
                          <div className="text-center py-12 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-xl">
                              <p className="text-slate-500 mb-3">No recent tests found.</p>
                              <button onClick={() => navigate('/test')} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-lg text-sm font-bold">Start Your First Test</button>
                          </div>
                      ) : (
                          <div className="space-y-4">
                              {recentTests.map((test) => (
                                  <div key={test.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer group">
                                      <div className="flex items-center gap-4">
                                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm border-2 ${test.score >= 50 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 border-emerald-200 dark:border-emerald-800' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 border-rose-200 dark:border-rose-800'}`}>
                                              {test.score}%
                                          </div>
                                          <div>
                                              <h4 className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-indigo-600 transition-colors">Assessment Result</h4>
                                              <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(test.date).toLocaleDateString()} • {test.totalQuestions} Questions</p>
                                          </div>
                                      </div>
                                      <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>

              {/* RIGHT COLUMN (1/3) */}
              <div className="space-y-6">
                  {/* NEWS WIDGET */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                          <svg className="w-24 h-24 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wide border-b border-slate-100 dark:border-slate-700 pb-2">Department News</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                          Stay updated with the latest announcements, exam schedules, and events from the department.
                      </p>
                      <button onClick={() => navigate('/announcements')} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all">
                          Read Updates
                      </button>
                  </div>

                  {/* CONTRIBUTE WIDGET */}
                  <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                      <h3 className="font-bold text-lg mb-2">Have Past Questions?</h3>
                      <p className="text-indigo-200 text-sm mb-6">Help your juniors and peers by uploading verified materials.</p>
                      <button onClick={() => navigate('/questions')} className="w-full py-3 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors">
                          Upload Material
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

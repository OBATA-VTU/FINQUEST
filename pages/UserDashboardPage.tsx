
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { TestResult } from '../types';
import { VerificationBadge } from '../components/VerificationBadge';

const QUOTES = [
    "The stock market is filled with individuals who know the price of everything, but the value of nothing. - Philip Fisher",
    "Rule No. 1: Never lose money. Rule No. 2: Never forget Rule No. 1. - Warren Buffett",
    "In investing, what is comfortable is rarely profitable. - Robert Arnott",
    "Compound interest is the eighth wonder of the world. - Albert Einstein",
    "Risk comes from not knowing what you are doing. - Warren Buffett",
    "The individual investor should act consistently as an investor and not as a speculator. - Ben Graham",
    "Price is what you pay. Value is what you get. - Warren Buffett",
    "Know what you own, and know why you own it. - Peter Lynch",
    "The four most dangerous words in investing are: 'This time it's different.' - Sir John Templeton",
    "Financial freedom is available to those who learn about it and work for it. - Robert Kiyosaki"
];

export const UserDashboardPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const user = auth?.user;
  
  const [greeting, setGreeting] = useState('');
  const [recentTests, setRecentTests] = useState<TestResult[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [testCount, setTestCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [quote, setQuote] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    // Select daily quote based on Day of Year
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    setQuote(QUOTES[dayOfYear % QUOTES.length]);
  }, []);

  useEffect(() => {
      const fetchStats = async () => {
          if (!user?.id) return;
          try {
              // Ensure we fetch from 'test_results' where 'userId' matches
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
      
      // We might need to refresh user data to get updated points
      if (user?.id) {
          fetchStats();
      }
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 font-sans transition-colors">
      
      {/* HERO SECTION */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white relative overflow-hidden pb-12 pt-8 rounded-b-[3rem] shadow-2xl shadow-indigo-900/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
          
          <div className="container mx-auto px-4 relative z-10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="text-center md:text-left">
                      <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                          <span className="text-xs font-bold text-indigo-100 uppercase tracking-widest">Student Portal</span>
                      </div>
                      
                      <h1 className="text-4xl md:text-5xl font-serif font-bold mb-1 tracking-tight">
                          {greeting}, {user.name.split(' ')[0]}
                      </h1>
                      
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-4 text-indigo-200 bg-indigo-900/30 w-fit mx-auto md:mx-0 px-3 py-1 rounded-lg">
                          <span className="font-mono text-sm">@{user.username}</span>
                          <VerificationBadge role={user.role} isVerified={user.isVerified} className="w-4 h-4" />
                      </div>

                      <p className="text-indigo-100/80 max-w-lg leading-relaxed italic text-sm md:text-base border-l-2 border-indigo-400/50 pl-3">
                          "{quote}"
                      </p>
                  </div>
                  
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-3 w-full md:w-auto max-w-md">
                      <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-center hover:bg-white/20 transition-colors">
                          <div className="text-3xl font-black">{testCount}</div>
                          <div className="text-[10px] uppercase tracking-wider opacity-70 font-bold">Tests Taken</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-center hover:bg-white/20 transition-colors">
                          <div className="text-3xl font-black">{avgScore}%</div>
                          <div className="text-[10px] uppercase tracking-wider opacity-70 font-bold">Avg Score</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-center hover:bg-white/20 transition-colors">
                          <div className="text-3xl font-black">{user.contributionPoints || 0}</div>
                          <div className="text-[10px] uppercase tracking-wider opacity-70 font-bold">Points</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-center hover:bg-white/20 transition-colors">
                          <div className="text-3xl font-black">{user.level}L</div>
                          <div className="text-[10px] uppercase tracking-wider opacity-70 font-bold">Level</div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className="container mx-auto px-4 -mt-8 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* MAIN CONTENT (8 cols) */}
              <div className="lg:col-span-8 space-y-8">
                  
                  {/* QUICK ACTIONS */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-2 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <button 
                            onClick={() => navigate('/test')}
                            className="flex flex-col items-center justify-center p-6 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group"
                          >
                              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                              </div>
                              <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Practice</span>
                          </button>

                          <button 
                            onClick={() => navigate('/questions')}
                            className="flex flex-col items-center justify-center p-6 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group"
                          >
                              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                              </div>
                              <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Archives</span>
                          </button>

                          <button 
                            onClick={() => navigate('/community')}
                            className="flex flex-col items-center justify-center p-6 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group"
                          >
                              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                              </div>
                              <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Community</span>
                          </button>

                          <button 
                            onClick={() => navigate('/lecturers')}
                            className="flex flex-col items-center justify-center p-6 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group"
                          >
                              <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                              </div>
                              <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Directory</span>
                          </button>
                      </div>
                  </div>

                  {/* RECENT ACTIVITY */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8">
                      <div className="flex justify-between items-center mb-6">
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                              <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
                              Academic History
                          </h2>
                          <button onClick={() => navigate('/test')} className="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors">
                              View All Records
                          </button>
                      </div>

                      {loadingTests ? (
                          <div className="text-center py-10">
                              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                              <p className="text-slate-400 text-sm">Loading records...</p>
                          </div>
                      ) : recentTests.length === 0 ? (
                          <div className="text-center py-12 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-600">
                              <p className="text-slate-500 dark:text-slate-400 mb-3 font-medium">No activity recorded yet.</p>
                              <button onClick={() => navigate('/test')} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all">Start Your First Test</button>
                          </div>
                      ) : (
                          <div className="space-y-4">
                              {recentTests.map((test) => (
                                  <div key={test.id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-700/30 rounded-2xl hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 dark:hover:border-slate-600 transition-all cursor-pointer group">
                                      <div className="flex items-center gap-5">
                                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg border-4 ${test.score >= 50 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 border-rose-100 dark:border-rose-800'}`}>
                                              {test.score}%
                                          </div>
                                          <div>
                                              <h4 className="font-bold text-slate-800 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Practice Assessment</h4>
                                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                  <span>{new Date(test.date).toLocaleDateString()}</span>
                                                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                  <span>{test.totalQuestions} Questions</span>
                                                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                  <span className="uppercase font-bold tracking-wide">{test.level}L</span>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="bg-white dark:bg-slate-600 p-2 rounded-full text-slate-300 dark:text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/50 transition-colors">
                                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>

              {/* SIDEBAR (4 cols) */}
              <div className="lg:col-span-4 space-y-8">
                  {/* NEWS WIDGET */}
                  <div className="bg-indigo-900 dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden relative text-white">
                      <div className="absolute top-0 right-0 p-6 opacity-10">
                          <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                      </div>
                      <div className="p-8 relative z-10">
                          <h3 className="font-bold text-lg mb-2 border-b border-indigo-700/50 pb-2 inline-block">FINSA News</h3>
                          <p className="text-indigo-200 text-sm mb-6 leading-relaxed">
                              Don't miss out on important departmental updates, scholarships, and exam schedules.
                          </p>
                          <button onClick={() => navigate('/announcements')} className="w-full py-3.5 bg-white text-indigo-900 rounded-xl font-bold shadow-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                              Read Updates
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                          </button>
                      </div>
                  </div>

                  {/* CONTRIBUTE CARD */}
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
                      <h3 className="font-bold text-xl mb-2">Help Others Pass</h3>
                      <p className="text-emerald-100 text-sm mb-6">Upload verified past questions and earn community reputation points.</p>
                      <button onClick={() => navigate('/questions')} className="w-full py-3.5 bg-white/20 backdrop-blur-sm border border-white/40 text-white font-bold rounded-xl hover:bg-white hover:text-teal-700 transition-all">
                          Upload Material
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

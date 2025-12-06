
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { TestResult, Announcement } from '../types';
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
  const [loading, setLoading] = useState(true);
  const [testCount, setTestCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [quote, setQuote] = useState('');
  const [recentNews, setRecentNews] = useState<Announcement[]>([]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    setQuote(QUOTES[dayOfYear % QUOTES.length]);
  }, []);

  useEffect(() => {
      const fetchData = async () => {
          if (!user?.id) return;
          try {
              const q = query(
                  collection(db, 'test_results'), 
                  where('userId', '==', user.id),
                  orderBy('date', 'desc'),
                  limit(10)
              );
              
              const snap = await getDocs(q);
              const tests = snap.docs.map(d => ({ id: d.id, ...d.data() } as TestResult));
              
              setRecentTests(tests.slice(0, 5));
              setTestCount(tests.length); 
              
              if (tests.length > 0) {
                  const total = tests.reduce((acc, curr) => acc + curr.score, 0);
                  setAvgScore(Math.round(total / tests.length));
              }

              const newsQ = query(collection(db, 'announcements'), orderBy('date', 'desc'), limit(3));
              const newsSnap = await getDocs(newsQ);
              setRecentNews(newsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));

          } catch (e) {
              console.error("Failed to fetch dashboard data", e);
          } finally {
              setLoading(false);
          }
      };
      
      if (user?.id) {
          fetchData();
      }
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 font-sans transition-colors">
      
      {/* 1. HERO SECTION */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 pt-10 pb-12 px-4 transition-colors">
          <div className="container mx-auto max-w-6xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                  <div>
                      <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-full uppercase tracking-wider">
                              {user.level} Level Student
                          </span>
                          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                          </span>
                      </div>
                      <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-white mb-2">
                          {greeting}, {user.name.split(' ')[0]}
                      </h1>
                      <div className="flex items-center gap-2">
                          <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">@{user.username}</span>
                          <VerificationBadge role={user.role} isVerified={user.isVerified} className="w-4 h-4" />
                      </div>
                  </div>
                  
                  <div className="max-w-md w-full bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border-l-4 border-indigo-500">
                      <p className="text-slate-600 dark:text-slate-300 text-sm italic font-medium leading-relaxed">"{quote}"</p>
                  </div>
              </div>
          </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl -mt-8">
          
          {/* 2. STATS GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:-translate-y-1 transition-transform duration-300">
                  <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tests</span>
                  </div>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">{testCount}</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:-translate-y-1 transition-transform duration-300">
                  <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Score</span>
                  </div>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">{avgScore}%</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:-translate-y-1 transition-transform duration-300">
                  <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Points</span>
                  </div>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">{user.contributionPoints || 0}</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:-translate-y-1 transition-transform duration-300">
                  <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-rose-600 dark:text-rose-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saved</span>
                  </div>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">{user.savedQuestions?.length || 0}</p>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* 3. MAIN CONTENT (Left Column) */}
              <div className="lg:col-span-2 space-y-8">
                  
                  {/* Quick Actions */}
                  <section>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                          <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
                          Quick Actions
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => navigate('/test')} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-md transition-all group text-left">
                              <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-1">CBT Practice</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Take a mock exam</p>
                          </button>
                          <button onClick={() => navigate('/questions')} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-md transition-all group text-left">
                              <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 mb-1">Archives</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">View past questions</p>
                          </button>
                          <button onClick={() => navigate('/community')} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-500 hover:shadow-md transition-all group text-left">
                              <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 mb-1">Community</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Join discussions</p>
                          </button>
                          <button onClick={() => navigate('/lecturers')} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:shadow-md transition-all group text-left">
                              <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 mb-1">Directory</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Find lecturers</p>
                          </button>
                      </div>
                  </section>

                  {/* Recent Activity */}
                  <section>
                      <div className="flex justify-between items-center mb-4">
                          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                              <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                              Recent Activity
                          </h2>
                          <button onClick={() => navigate('/test')} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View History</button>
                      </div>
                      
                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                          {recentTests.length === 0 ? (
                              <div className="p-8 text-center text-slate-400 text-sm">
                                  No activity yet. <button onClick={() => navigate('/test')} className="text-indigo-500 font-bold hover:underline">Take a test</button> to get started.
                              </div>
                          ) : (
                              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                  {recentTests.map((test) => (
                                      <div key={test.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                          <div className="flex items-center gap-4">
                                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${test.score >= 50 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                                  {test.score}%
                                              </div>
                                              <div>
                                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Practice Session</h4>
                                                  <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(test.date).toLocaleDateString()}</p>
                                              </div>
                                          </div>
                                          <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">{test.level}L</span>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </section>
              </div>

              {/* 4. SIDEBAR (Right Column) */}
              <div className="space-y-8">
                  
                  {/* News Widget */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide">Latest News</h3>
                          <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                      </div>
                      
                      <div className="space-y-4">
                          {recentNews.length > 0 ? recentNews.map(news => (
                              <div key={news.id} onClick={() => navigate('/announcements')} className="cursor-pointer group">
                                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 mb-1">{news.title}</h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(news.date).toLocaleDateString()}</p>
                              </div>
                          )) : (
                              <p className="text-sm text-slate-400 italic">No updates available.</p>
                          )}
                      </div>
                      
                      <button onClick={() => navigate('/announcements')} className="w-full mt-6 py-2 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition">
                          Read All Updates
                      </button>
                  </div>

                  {/* Profile Summary */}
                  <div className="bg-indigo-900 dark:bg-slate-800 rounded-2xl p-6 text-white relative overflow-hidden">
                      <div className="relative z-10">
                          <h3 className="font-bold text-lg mb-1">Your Profile</h3>
                          <p className="text-indigo-200 dark:text-slate-400 text-xs mb-4">Manage your account settings</p>
                          
                          <div className="flex items-center justify-between bg-white/10 p-3 rounded-xl mb-4">
                              <span className="text-xs font-medium">Status</span>
                              {user.isVerified ? (
                                  <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded font-bold">Verified</span>
                              ) : (
                                  <span className="text-xs bg-slate-500/50 text-white px-2 py-0.5 rounded font-bold">Unverified</span>
                              )}
                          </div>
                          
                          <button onClick={() => navigate('/profile')} className="w-full py-2 bg-white text-indigo-900 font-bold text-xs rounded-lg hover:bg-indigo-50 transition">
                              Edit Profile
                          </button>
                      </div>
                      {/* Decoration */}
                      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                  </div>

              </div>
          </div>
      </div>
    </div>
  );
};

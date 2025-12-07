
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { TestResult, Announcement, PastQuestion } from '../types';
import { VerificationBadge } from '../components/VerificationBadge';
import { QuestionCard } from '../components/QuestionCard';

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
  const [recommendedQuestions, setRecommendedQuestions] = useState<PastQuestion[]>([]);

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
              // 1. Fetch Test Stats & History
              const testQuery = query(
                  collection(db, 'test_results'), 
                  where('userId', '==', user.id),
                  orderBy('date', 'desc'),
                  limit(5)
              );
              
              const testSnap = await getDocs(testQuery);
              const tests = testSnap.docs.map(d => ({ id: d.id, ...d.data() } as TestResult));
              
              setRecentTests(tests);
              
              // Note: To get total count accurately without reading all docs, we'd need a counter in user doc.
              // For now, we estimate based on what we have or just show recent. 
              // If we want total, we can do a count query (costly) or just show length of recent if small.
              // Let's rely on user.contributionPoints for a metric and just show recent test count or calculate avg from recent.
              setTestCount(tests.length);
              
              if (tests.length > 0) {
                  const total = tests.reduce((acc, curr) => acc + curr.score, 0);
                  setAvgScore(Math.round(total / tests.length));
              }

              // 2. Fetch Recent News
              const newsQ = query(collection(db, 'announcements'), orderBy('date', 'desc'), limit(3));
              const newsSnap = await getDocs(newsQ);
              setRecentNews(newsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));

              // 3. Fetch Recommended Resources (Same Level)
              const recQ = query(
                  collection(db, 'questions'),
                  where('level', '==', user.level),
                  where('status', '==', 'approved'),
                  limit(3)
              );
              const recSnap = await getDocs(recQ);
              setRecommendedQuestions(recSnap.docs.map(d => ({ id: d.id, ...d.data() } as PastQuestion)));

          } catch (e) {
              console.error("Failed to fetch dashboard data", e);
          } finally {
              setLoading(false);
          }
      };
      
      if (user?.id) {
          fetchData();
      }
  }, [user?.id, user?.level]);

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
                  
                  <div className="max-w-md w-full bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border-l-4 border-indigo-500 shadow-sm">
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
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Tests</span>
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
              
              {/* LEFT COLUMN - MAIN CONTENT */}
              <div className="lg:col-span-2 space-y-8">
                  
                  {/* QUICK ACTIONS */}
                  <section>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                          <span className="bg-indigo-100 dark:bg-indigo-900 p-1 rounded text-indigo-600 dark:text-indigo-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          </span>
                          Quick Actions
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => navigate('/test')} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all group flex items-start gap-4 text-left">
                              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform shrink-0">
                                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 dark:text-white text-base block mb-1">CBT Practice</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 block leading-snug">Take mock exams and test your knowledge.</span>
                              </div>
                          </button>

                          <button onClick={() => navigate('/questions')} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all group flex items-start gap-4 text-left">
                              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0">
                                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 dark:text-white text-base block mb-1">Past Questions</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 block leading-snug">Access verified exam archives.</span>
                              </div>
                          </button>

                          <button onClick={() => navigate('/community')} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-rose-500 dark:hover:border-rose-500 hover:shadow-md transition-all group flex items-start gap-4 text-left">
                              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform shrink-0">
                                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 dark:text-white text-base block mb-1">Community</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 block leading-snug">Connect with peers and groups.</span>
                              </div>
                          </button>

                          <button onClick={() => navigate('/lecturers')} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-md transition-all group flex items-start gap-4 text-left">
                              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform shrink-0">
                                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 dark:text-white text-base block mb-1">Directory</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 block leading-snug">Lecturers & Staff info.</span>
                              </div>
                          </button>
                      </div>
                  </section>

                  {/* RECOMMENDED RESOURCES (New) */}
                  <section>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                          <span className="bg-amber-100 dark:bg-amber-900 p-1 rounded text-amber-600 dark:text-amber-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                          </span>
                          Recommended Resources
                      </h2>
                      {loading ? (
                          <div className="p-4 text-center text-slate-400 text-sm">Loading recommendations...</div>
                      ) : recommendedQuestions.length === 0 ? (
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                              <p className="text-slate-500 dark:text-slate-400 text-sm">No specific recommendations found for your level yet.</p>
                              <button onClick={() => navigate('/questions')} className="text-indigo-600 font-bold text-xs mt-2 hover:underline">Browse All</button>
                          </div>
                      ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {recommendedQuestions.map(q => (
                                  <QuestionCard key={q.id} question={q} />
                              ))}
                          </div>
                      )}
                  </section>

                  {/* RECENT ACTIVITY */}
                  <section>
                      <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                              <span className="bg-blue-100 dark:bg-blue-900 p-1 rounded text-blue-600 dark:text-blue-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              </span>
                              Recent Activity
                          </h2>
                          <button onClick={() => navigate('/test')} className="text-xs font-bold text-indigo-600 hover:underline">View Full History</button>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                          {loading ? (
                              <div className="p-8 text-center text-slate-400 text-sm">Loading activity...</div>
                          ) : recentTests.length === 0 ? (
                              <div className="p-12 text-center">
                                  <p className="text-slate-500 dark:text-slate-400 mb-4">No recent activity recorded.</p>
                                  <button onClick={() => navigate('/test')} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-100 transition">Take a Test</button>
                              </div>
                          ) : (
                              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                  {recentTests.map(test => (
                                      <div key={test.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                          <div className="flex items-center gap-4">
                                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm border-2 ${test.score >= 50 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-600'}`}>
                                                  {test.score}%
                                              </div>
                                              <div>
                                                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">CBT Practice Session</h4>
                                                  <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(test.date).toLocaleDateString()} • {test.totalQuestions} Questions</p>
                                              </div>
                                          </div>
                                          <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                                              {test.level}L
                                          </span>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </section>
              </div>

              {/* RIGHT COLUMN - NEWS & UPDATES */}
              <div className="space-y-8">
                  <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden border border-slate-700">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                          <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                          Department Announcements
                      </h3>
                      
                      <div className="space-y-4">
                          {recentNews.length > 0 ? recentNews.map(news => (
                              <div key={news.id} onClick={() => navigate('/announcements')} className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 cursor-pointer hover:bg-white/20 transition-colors">
                                  <h4 className="font-bold text-sm mb-1 line-clamp-1">{news.title}</h4>
                                  <p className="text-xs text-indigo-200 line-clamp-2">{news.content}</p>
                                  <span className="text-[10px] text-indigo-300 mt-2 block opacity-70">{new Date(news.date).toLocaleDateString()}</span>
                              </div>
                          )) : (
                              <p className="text-sm text-indigo-200 italic">No recent announcements.</p>
                          )}
                      </div>
                      
                      <button onClick={() => navigate('/announcements')} className="w-full mt-6 py-2.5 bg-white text-indigo-900 font-bold text-xs rounded-lg hover:bg-indigo-50 transition-colors uppercase tracking-wider">
                          View All Updates
                      </button>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-sm uppercase tracking-wide border-b border-slate-100 dark:border-slate-700 pb-2">Profile Status</h3>
                      <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Account Type</span>
                              {user.isVerified ? (
                                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">Verified</span>
                              ) : (
                                  <span className="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded">Unverified</span>
                              )}
                          </div>
                          <div className="flex items-center justify-center pt-2">
                              <button onClick={() => navigate('/profile')} className="text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:underline flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                Edit Profile Details
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

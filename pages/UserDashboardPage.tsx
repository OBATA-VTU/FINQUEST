
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
              // Fetch Test Stats
              const q = query(
                  collection(db, 'test_results'), 
                  where('userId', '==', user.id),
                  orderBy('date', 'desc'),
                  limit(5)
              );
              
              const snap = await getDocs(q);
              const tests = snap.docs.map(d => ({ id: d.id, ...d.data() } as TestResult));
              
              setRecentTests(tests);
              setTestCount(tests.length); // Note: This is just recent count, ideally fetch count aggregate
              
              if (tests.length > 0) {
                  const total = tests.reduce((acc, curr) => acc + curr.score, 0);
                  setAvgScore(Math.round(total / tests.length));
              }

              // Fetch Recent News (Limit 3)
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

  const CircularProgress = ({ percentage, color }: { percentage: number, color: string }) => {
      const radius = 30;
      const circumference = 2 * Math.PI * radius;
      const strokeDashoffset = circumference - (percentage / 100) * circumference;

      return (
          <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-200 dark:text-slate-700" />
                  <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={`${color} transition-all duration-1000 ease-out`} strokeLinecap="round" />
              </svg>
              <span className={`absolute text-sm font-bold ${color}`}>{percentage}%</span>
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 pb-20 font-sans transition-colors p-4 md:p-6 lg:p-8">
      
      {/* HEADER AREA */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  {greeting}, {user.name.split(' ')[0]}
                  <span className="animate-pulse">👋</span>
              </h1>
          </div>
          <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">System Online</span>
          </div>
      </div>

      {/* BENTO GRID LAYOUT */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
          
          {/* 1. HERO CARD (Span 2 cols, 2 rows on large) */}
          <div className="md:col-span-2 lg:col-span-2 row-span-1 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>
              
              <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                      <div className="flex items-center gap-2 mb-4">
                          <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                              {user.level} Level Finance
                          </span>
                          <VerificationBadge role={user.role} isVerified={user.isVerified} className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2 font-serif leading-tight max-w-md">"{quote}"</h2>
                  </div>
                  
                  <div className="flex items-end justify-between mt-6">
                      <div className="flex gap-6">
                          <div>
                              <p className="text-indigo-200 text-xs uppercase font-bold tracking-wider mb-1">Reputation</p>
                              <p className="text-3xl font-black">{user.contributionPoints || 0}</p>
                          </div>
                          <div>
                              <p className="text-indigo-200 text-xs uppercase font-bold tracking-wider mb-1">Status</p>
                              <p className="text-3xl font-black">{user.isVerified ? 'Verified' : 'Member'}</p>
                          </div>
                      </div>
                      <button onClick={() => navigate('/profile')} className="bg-white text-indigo-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg">
                          View Profile
                      </button>
                  </div>
              </div>
          </div>

          {/* 2. PERFORMANCE CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
              <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest absolute top-6 left-6">Avg. Performance</h3>
              <CircularProgress percentage={avgScore} color={avgScore > 70 ? 'text-emerald-500' : avgScore > 40 ? 'text-amber-500' : 'text-rose-500'} />
              <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300 text-center">Based on {testCount} recent tests</p>
          </div>

          {/* 3. QUICK ACTION: CBT */}
          <button 
            onClick={() => navigate('/test')}
            className="bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl p-6 border border-emerald-100 dark:border-emerald-900/30 shadow-sm hover:shadow-md transition-all group text-left relative overflow-hidden flex flex-col justify-between"
          >
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              </div>
              <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 transition-colors">Start Practice</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Take a mock exam or topic quiz.</p>
              </div>
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-200/50 dark:bg-emerald-800/20 rounded-full blur-2xl group-hover:bg-emerald-300/50 transition-colors"></div>
          </button>

          {/* 4. RECENT ACTIVITY LIST (Tall) */}
          <div className="md:col-span-1 lg:col-span-1 lg:row-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-800 dark:text-white">Recent Activity</h3>
                  <button onClick={() => navigate('/test')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">See All</button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                  {recentTests.length > 0 ? recentTests.map((test, idx) => (
                      <div key={idx} className="flex gap-4 items-start group">
                          <div className="flex flex-col items-center">
                              <div className={`w-2 h-2 rounded-full mt-2 ${test.score >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                              <div className="w-0.5 h-full bg-slate-100 dark:bg-slate-800 my-1 group-last:hidden"></div>
                          </div>
                          <div className="pb-4">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">CBT Practice</p>
                              <p className="text-xs text-slate-500">{new Date(test.date).toLocaleDateString()}</p>
                              <div className="mt-2 flex items-center gap-2">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${test.score >= 50 ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900'}`}>
                                      {test.score}% Score
                                  </span>
                              </div>
                          </div>
                      </div>
                  )) : (
                      <div className="text-center py-10 text-slate-400">No activity yet.</div>
                  )}
              </div>
          </div>

          {/* 5. QUICK ACTION: ARCHIVES */}
          <button 
            onClick={() => navigate('/questions')}
            className="bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl p-6 border border-indigo-100 dark:border-indigo-900/30 shadow-sm hover:shadow-md transition-all group text-left relative overflow-hidden flex flex-col justify-between"
          >
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">Past Questions</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Browse and download materials.</p>
              </div>
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-200/50 dark:bg-indigo-800/20 rounded-full blur-2xl group-hover:bg-indigo-300/50 transition-colors"></div>
          </button>

          {/* 6. QUICK ACTION: COMMUNITY */}
          <button 
            onClick={() => navigate('/community')}
            className="bg-rose-50 dark:bg-rose-900/10 rounded-3xl p-6 border border-rose-100 dark:border-rose-900/30 shadow-sm hover:shadow-md transition-all group text-left relative overflow-hidden flex flex-col justify-between"
          >
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/50 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-rose-600 transition-colors">Community</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Join the conversation.</p>
              </div>
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-rose-200/50 dark:bg-rose-800/20 rounded-full blur-2xl group-hover:bg-rose-300/50 transition-colors"></div>
          </button>

          {/* 7. NEWS TICKER (Wide Bottom) */}
          <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-6 relative overflow-hidden">
              <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pb-4 md:pb-0 md:pr-6">
                  <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                      <h3 className="font-bold text-slate-900 dark:text-white">Department Updates</h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Latest announcements from the administration.</p>
                  <button onClick={() => navigate('/announcements')} className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-1">
                      Read All News &rarr;
                  </button>
              </div>
              <div className="flex-1 space-y-3">
                  {recentNews.length > 0 ? recentNews.map(news => (
                      <div key={news.id} onClick={() => navigate('/announcements')} className="flex items-center gap-4 cursor-pointer group">
                          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex flex-col items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                              <span className="text-xs font-bold text-slate-800 dark:text-white">{new Date(news.date).getDate()}</span>
                              <span className="text-[10px] uppercase text-slate-400">{new Date(news.date).toLocaleDateString(undefined, {month:'short'})}</span>
                          </div>
                          <div className="flex-1">
                              <h4 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-1">{news.title}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{news.content}</p>
                          </div>
                      </div>
                  )) : (
                      <div className="text-sm text-slate-400 italic">No recent updates available.</div>
                  )}
              </div>
          </div>

      </div>
    </div>
  );
};

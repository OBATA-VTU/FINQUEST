
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { TestResult, Announcement, PastQuestion } from '../types';
import { VerificationBadge } from '../components/VerificationBadge';
import { getBadge } from '../utils/badges';
import { GoogleGenAI } from '@google/genai';

export const UserDashboardPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const user = auth?.user;
  
  const [greeting, setGreeting] = useState('');
  const [recentTests, setRecentTests] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [testCount, setTestCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [quote, setQuote] = useState('Loading daily quote...');
  const [recentNews, setRecentNews] = useState<Announcement[]>([]);
  const [recommendedQuestions, setRecommendedQuestions] = useState<PastQuestion[]>([]);
  const [showLinkBanner, setShowLinkBanner] = useState(true);

  useEffect(() => {
    // Set Greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    // Fetch Daily AI Quote
    const fetchDailyQuote = async () => {
        const today = new Date().toISOString().split('T')[0];
        try {
            const cachedQuoteData = localStorage.getItem('dailyQuote');
            if (cachedQuoteData) {
                const { date, quote } = JSON.parse(cachedQuoteData);
                if (date === today && quote) {
                    setQuote(quote);
                    return;
                }
            }
        } catch (e) {
            console.error("Failed to parse cached quote", e);
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = "Generate a single, unique, and insightful quote about finance, investing, or wealth. The quote should be inspiring, concise (under 25 words), and suitable for a university students' dashboard. Do not include author attribution.";
            const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            const newQuote = result.text.trim().replace(/^"|"$/g, ''); // Remove quotes if AI adds them

            if (newQuote) {
                setQuote(newQuote);
                localStorage.setItem('dailyQuote', JSON.stringify({ date: today, quote: newQuote }));
            } else {
                setQuote("The best investment you can make is in yourself.");
            }
        } catch (error) {
            console.error("Failed to fetch AI quote:", error);
            setQuote("Risk comes from not knowing what you are doing.");
        }
    };

    fetchDailyQuote();
  }, []);

  useEffect(() => {
      const fetchData = async () => {
          if (!user?.id) return;
          setLoading(true);
          try {
              // 1. Fetch Tests
              const testQuery = query(collection(db, 'test_results'), where('userId', '==', user.id));
              const testSnap = await getDocs(testQuery);
              const tests = testSnap.docs.map(d => ({ id: d.id, ...d.data() } as TestResult));
              tests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              setRecentTests(tests.slice(0, 5));
              setTestCount(tests.length);
              
              if (tests.length > 0) {
                  const total = tests.reduce((acc, curr) => acc + curr.score, 0);
                  setAvgScore(Math.round(total / tests.length));
              }

              // 2. Fetch News
              const newsQ = query(collection(db, 'announcements'), limit(10));
              const newsSnap = await getDocs(newsQ);
              let news = newsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
              news.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              setRecentNews(news.slice(0, 3));

              // 3. Optimized Recommended Questions
              const levelQuery = query(
                  collection(db, 'questions'),
                  where('status', '==', 'approved'),
                  where('level', '==', user.level),
                  orderBy('createdAt', 'desc'),
                  limit(3)
              );
              const generalQuery = query(
                  collection(db, 'questions'),
                  where('status', '==', 'approved'),
                  where('level', '==', 'General'),
                  orderBy('createdAt', 'desc'),
                  limit(3)
              );
              const [levelSnap, generalSnap] = await Promise.all([
                  getDocs(levelQuery),
                  getDocs(generalQuery),
              ]);

              const levelQuestions = levelSnap.docs.map(d => ({ id: d.id, ...d.data() } as PastQuestion));
              const generalQuestions = generalSnap.docs.map(d => ({ id: d.id, ...d.data() } as PastQuestion));
              
              const allRecommended = [...levelQuestions, ...generalQuestions];
              const uniqueRecommended = Array.from(new Map(allRecommended.map(q => [q.id, q])).values());
              uniqueRecommended.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
              setRecommendedQuestions(uniqueRecommended.slice(0, 3));

          } catch (e) {
              console.error("Failed to fetch dashboard data", e);
          } finally {
              setLoading(false);
          }
      };
      
      if (user?.id) fetchData();
  }, [user?.id, user?.level]);

  if (!user || !auth) return null;
  
  const { isPasswordAccount, isGoogleAccount, linkGoogleAccount } = auth;
  const topBadge = (user.badges || [])
      .map(getBadge)
      .filter(b => b)
      .sort((a, b) => b!.rank - a!.rank)[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 font-sans transition-colors p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
          
          {isPasswordAccount && !isGoogleAccount && showLinkBanner && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative animate-fade-in-down">
                  <button onClick={() => setShowLinkBanner(false)} className="absolute top-2 right-2 p-1 text-green-700/50 hover:text-green-700 dark:text-green-300/50 dark:hover:text-green-300 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <div className="flex items-center gap-3">
                      <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
                      <div>
                          <h4 className="font-bold text-green-800 dark:text-green-300">One-Click Sign-In</h4>
                          <p className="text-xs text-green-600 dark:text-green-400">Link your Google account for faster, more secure access.</p>
                      </div>
                  </div>
                  <button onClick={linkGoogleAccount} className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap">Link Google Account</button>
              </div>
          )}

          <div className="rounded-3xl overflow-hidden relative shadow-xl bg-indigo-900 text-white min-h-[220px] flex flex-col justify-center p-8 md:p-12 animate-fade-in-down">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80')] bg-cover opacity-20 mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900/80"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                  <div>
                      <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full border-2 border-white/30 overflow-hidden bg-white/10 backdrop-blur-md">
                              {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full font-bold">{user.name.charAt(0)}</div>}
                          </div>
                          <div>
                              <p className="text-indigo-200 text-sm font-medium tracking-wider uppercase">{user.level} Level Finance Student</p>
                              <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-lg">{user.name}</span>
                                  <VerificationBadge role={user.role} isVerified={user.isVerified} className="w-5 h-5 text-white" />
                                  {topBadge && <span className="text-xl" title={topBadge.name}>{topBadge.icon}</span>}
                              </div>
                          </div>
                      </div>
                      <h1 className="text-3xl md:text-5xl font-serif font-black leading-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">{greeting}</h1>
                      <p className="text-indigo-100 max-w-xl text-sm md:text-base opacity-90 italic">"{quote}"</p>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-6">
                      <div className="text-center">
                          <span className="block text-2xl font-black">{user.contributionPoints || 0}</span>
                          <span className="text-[10px] uppercase tracking-wider opacity-70">Points</span>
                      </div>
                      <div className="w-px h-8 bg-white/20"></div>
                      <div className="text-center">
                          <span className="block text-2xl font-black">{testCount}</span>
                          <span className="text-[10px] uppercase tracking-wider opacity-70">Tests</span>
                      </div>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              
              <div className="md:col-span-2 lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col animate-slide-in-up">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><span className="w-2 h-2 bg-indigo-500 rounded-full"></span>Quick Access</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 h-full">
                      <button onClick={() => navigate('/test')} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors group animate-slide-in-up" style={{animationDelay: '100ms'}}>
                          <div className="w-10 h-10 bg-white dark:bg-indigo-900 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 shadow-sm mb-3 group-hover:scale-110 transition-transform"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">CBT</span>
                      </button>
                      <button onClick={() => navigate('/questions')} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors group animate-slide-in-up" style={{animationDelay: '200ms'}}>
                          <div className="w-10 h-10 bg-white dark:bg-emerald-900 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-300 shadow-sm mb-3 group-hover:scale-110 transition-transform"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Archives</span>
                      </button>
                      <button onClick={() => navigate('/community')} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors group animate-slide-in-up" style={{animationDelay: '300ms'}}>
                          <div className="w-10 h-10 bg-white dark:bg-rose-900 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-300 shadow-sm mb-3 group-hover:scale-110 transition-transform"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Community</span>
                      </button>
                      <button onClick={() => navigate('/lecturers')} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors group animate-slide-in-up" style={{animationDelay: '400ms'}}>
                          <div className="w-10 h-10 bg-white dark:bg-amber-900 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-300 shadow-sm mb-3 group-hover:scale-110 transition-transform"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg></div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Directory</span>
                      </button>
                  </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center animate-slide-in-up">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-sm w-full text-left">Performance</h3>
                  <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                      <svg className="w-full h-full transform -rotate-90"><circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800" /><circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * avgScore) / 100} className={`text-indigo-600 dark:text-indigo-500 transition-all duration-1000 ease-out`} /></svg>
                      <span className="absolute text-xl font-black text-slate-800 dark:text-white">{avgScore}%</span>
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Average Score</p>
              </div>

              <div className="md:col-span-3 lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-lg flex flex-col animate-slide-in-up">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>For You</h3>
                  <div className="flex-1 space-y-3">
                      {recommendedQuestions.length > 0 ? recommendedQuestions.map(q => (
                          <div key={q.id} onClick={() => navigate('/questions')} className="bg-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/20 transition-colors">
                              <p className="font-bold text-xs line-clamp-1">{q.courseTitle}</p>
                              <p className="text-[10px] text-slate-400">{q.courseCode}</p>
                          </div>
                      )) : ( <div className="text-center py-4 opacity-50 text-xs">No specific recommendations yet.</div> )}
                  </div>
                  <button onClick={() => navigate('/questions')} className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors">Browse Archive</button>
              </div>

              <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[300px] animate-slide-in-up" style={{animationDelay: '150ms'}}>
                  <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Timeline</h3><button onClick={() => navigate('/test')} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View History</button></div>
                  {loading ? <div className="text-center text-xs text-slate-400 py-10">Loading...</div> : recentTests.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-sm">No activity recorded yet. Start practicing!</div>
                  ) : (
                      <div className="relative pl-4 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                          {recentTests.map((test, i) => (
                              <div key={test.id} className="relative pl-8 group">
                                  <div className={`absolute left-[13px] top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${test.score >= 50 ? 'bg-emerald-500' : 'bg-rose-500'} z-10`}></div>
                                  <div className="flex justify-between items-start">
                                      <div><h4 className="text-sm font-bold text-slate-800 dark:text-white">CBT Practice Session</h4><p className="text-xs text-slate-500 dark:text-slate-400">{test.totalQuestions || 20} Questions • {test.level}L</p></div>
                                      <div className="text-right"><span className={`block font-black text-sm ${test.score >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{test.score}%</span><span className="text-[10px] text-slate-400">{new Date(test.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span></div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              <div className="md:col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm animate-slide-in-up" style={{animationDelay: '300ms'}}>
                  <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>Latest Updates</h3>
                  <div className="space-y-4">
                      {recentNews.length > 0 ? recentNews.map(news => (
                          <div key={news.id} onClick={() => navigate('/announcements')} className="flex gap-4 group cursor-pointer">
                              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex flex-col items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"><span className="text-lg font-bold leading-none">{new Date(news.date).getDate()}</span><span className="text-[9px] uppercase font-bold">{new Date(news.date).toLocaleDateString(undefined, {month:'short'})}</span></div>
                              <div className="flex-1"><h4 className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">{news.title}</h4><p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{news.content}</p></div>
                          </div>
                      )) : <p className="text-xs text-slate-400 italic">No news updates available.</p>}
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
};

import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { TestResult, Announcement, PastQuestion } from '../types';
import { VerificationBadge } from '../components/VerificationBadge';
import { getBadge } from '../utils/badges';
import { GoogleGenAI } from '@google/genai';
import { Skeleton } from '../components/Skeleton';

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

  // Check if user is using a stock avatar (from the Unsplash pool)
  const isStockAvatar = user?.avatarUrl?.includes('unsplash.com') || !user?.avatarUrl;

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

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
        } catch (e) {}

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = "Generate a single, unique, and insightful quote about finance, investing, or wealth. The quote should be inspiring, concise (under 25 words), and suitable for a university students' dashboard. Do not include author attribution.";
            const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            const newQuote = result.text.trim().replace(/^"|"$/g, '');
            setQuote(newQuote || "The best investment you can make is in yourself.");
            localStorage.setItem('dailyQuote', JSON.stringify({ date: today, quote: newQuote }));
        } catch (error) {
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

              const newsQ = query(collection(db, 'announcements'), limit(5));
              const newsSnap = await getDocs(newsQ);
              let news = newsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
              news.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              setRecentNews(news.slice(0, 3));

              const levelQuery = query(collection(db, 'questions'), where('status', '==', 'approved'), where('level', '==', user.level), limit(5));
              const levelSnap = await getDocs(levelQuery);
              setRecommendedQuestions(levelSnap.docs.map(d => ({ id: d.id, ...d.data() } as PastQuestion)));
          } catch (e) {
              console.error(e);
          } finally {
              setLoading(false);
          }
      };
      if (user?.id) fetchData();
  }, [user?.id, user?.level]);

  if (!user || !auth) return null;
  
  const { isPasswordAccount, isGoogleAccount, linkGoogleAccount } = auth;
  const topBadge = (user.badges || []).map(getBadge).filter(b => b).sort((a, b) => b!.rank - a!.rank)[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 font-sans transition-colors p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
          
          {/* PROFILE PERSONALIZATION PROMPT */}
          {isStockAvatar && (
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                </div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-14 h-14 rounded-full border-2 border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-md">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div>
                        <h4 className="font-black text-base md:text-lg">Complete Your Identity</h4>
                        <p className="text-sm text-indigo-100 opacity-90">Upload a personal photo to complete your professional student profile.</p>
                    </div>
                </div>
                <Link to="/profile" className="relative z-10 px-6 py-3 bg-white text-indigo-600 text-xs font-black rounded-xl hover:bg-indigo-50 transition-all uppercase tracking-widest shadow-lg transform hover:scale-105 active:scale-95">Update Photo</Link>
            </div>
          )}

          {isPasswordAccount && !isGoogleAccount && showLinkBanner && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative animate-fade-in-down">
                  <button onClick={() => setShowLinkBanner(false)} className="absolute top-3 right-3 text-emerald-700/50 hover:text-emerald-700 transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  <div className="flex items-center gap-3">
                      <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
                      <div>
                          <h4 className="font-bold text-emerald-800 dark:text-emerald-300">Secure Access</h4>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">Link your Google account for faster, one-click sign-in.</p>
                      </div>
                  </div>
                  <button onClick={linkGoogleAccount} className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all">Link Now</button>
              </div>
          )}

          <div className="rounded-[2.5rem] overflow-hidden relative shadow-2xl bg-indigo-900 text-white min-h-[250px] flex flex-col justify-center p-8 md:p-12 animate-fade-in-down border border-white/10">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80')] bg-cover opacity-10 mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-indigo-900 to-purple-900/40"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center md:items-end gap-10">
                  <div className="text-center md:text-left">
                      <div className="flex flex-col md:flex-row items-center gap-5 mb-5">
                          <div className="w-20 h-20 rounded-[1.5rem] border-2 border-white/20 overflow-hidden bg-white/10 backdrop-blur-xl shadow-2xl">
                              {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full font-black text-2xl">{user.name.charAt(0)}</div>}
                          </div>
                          <div>
                              <p className="text-indigo-300 text-xs font-black tracking-[0.2em] uppercase mb-1">{user.level} Level Finance Student</p>
                              <div className="flex items-center justify-center md:justify-start gap-2">
                                  <span className="font-bold text-2xl text-white">{user.name}</span>
                                  <VerificationBadge role={user.role} isVerified={user.isVerified} className="w-6 h-6 text-white" />
                                  {topBadge && <span className="text-2xl" title={topBadge.name}>{topBadge.icon}</span>}
                              </div>
                          </div>
                      </div>
                      <h1 className="text-4xl md:text-6xl font-serif font-black leading-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300">{greeting}</h1>
                      <p className="text-indigo-200/80 max-w-xl text-sm md:text-lg italic font-light">"{quote}"</p>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] flex items-center gap-8 shadow-2xl">
                      <div className="text-center">
                          <span className="block text-3xl font-black text-white">{loading ? '...' : (user.contributionPoints || 0)}</span>
                          <span className="text-[10px] uppercase font-black tracking-widest text-indigo-300">Points</span>
                      </div>
                      <div className="w-px h-10 bg-white/20"></div>
                      <div className="text-center">
                          <span className="block text-3xl font-black text-white">{loading ? '...' : testCount}</span>
                          <span className="text-[10px] uppercase font-black tracking-widest text-indigo-300">Sessions</span>
                      </div>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <div className="md:col-span-2 lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm animate-slide-in-up">
                  <h3 className="font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3 uppercase tracking-widest text-xs">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                    Operational Hub
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <button onClick={() => navigate('/test')} className="flex flex-col items-center justify-center p-6 rounded-[2rem] bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all group animate-slide-in-up border border-indigo-100/50 dark:border-indigo-800/30">
                          <div className="w-12 h-12 bg-white dark:bg-indigo-900 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-300 shadow-lg mb-4 group-hover:scale-110 transition-transform"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></div>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300 tracking-widest uppercase">CBT Center</span>
                      </button>
                      <button onClick={() => navigate('/questions')} className="flex flex-col items-center justify-center p-6 rounded-[2rem] bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all group animate-slide-in-up border border-emerald-100/50 dark:border-emerald-800/30">
                          <div className="w-12 h-12 bg-white dark:bg-emerald-900 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-300 shadow-lg mb-4 group-hover:scale-110 transition-transform"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300 tracking-widest uppercase">Archives</span>
                      </button>
                      <button onClick={() => navigate('/community')} className="flex flex-col items-center justify-center p-6 rounded-[2rem] bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all group animate-slide-in-up border border-rose-100/50 dark:border-rose-800/30">
                          <div className="w-12 h-12 bg-white dark:bg-rose-900 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-300 shadow-lg mb-4 group-hover:scale-110 transition-transform"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300 tracking-widest uppercase">Lounge</span>
                      </button>
                      <button onClick={() => navigate('/lecturers')} className="flex flex-col items-center justify-center p-6 rounded-[2rem] bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all group animate-slide-in-up border border-amber-100/50 dark:border-amber-800/30">
                          <div className="w-12 h-12 bg-white dark:bg-amber-900 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-300 shadow-lg mb-4 group-hover:scale-110 transition-transform"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg></div>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300 tracking-widest uppercase">Directory</span>
                      </button>
                  </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center animate-slide-in-up">
                  <h3 className="font-black text-slate-900 dark:text-white mb-6 text-xs uppercase tracking-widest w-full text-left">Academic Rank</h3>
                  <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                      <svg className="w-full h-full transform -rotate-90"><circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100 dark:text-slate-800" /><circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={351.8} strokeDashoffset={351.8 - (351.8 * avgScore) / 100} className={`text-indigo-600 dark:text-indigo-500 transition-all duration-1000 ease-out`} /></svg>
                      <span className="absolute text-3xl font-black text-slate-900 dark:text-white">{loading ? '...' : `${avgScore}%`}</span>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Proficiency Index</p>
              </div>

              <div className="md:col-span-3 lg:col-span-1 bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl flex flex-col animate-slide-in-up border border-white/5">
                  <h3 className="font-black text-white mb-6 flex items-center gap-3 uppercase tracking-widest text-xs">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    Intelligence
                  </h3>
                  <div className="flex-1 space-y-4">
                      {loading ? (
                          [1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full bg-white/5 rounded-2xl" />)
                      ) : recommendedQuestions.length > 0 ? recommendedQuestions.map(q => (
                          <div key={q.id} onClick={() => navigate('/questions')} className="bg-white/5 p-4 rounded-2xl cursor-pointer hover:bg-white/10 transition-all border border-white/5 hover:border-white/10 group">
                              <p className="font-bold text-sm line-clamp-1 text-white group-hover:text-indigo-300 transition-colors">{q.courseTitle}</p>
                              <p className="text-[10px] font-black uppercase text-indigo-400/60 mt-1">{q.courseCode}</p>
                          </div>
                      )) : ( <div className="text-center py-8 opacity-40 text-xs text-white">Curating resources for your level...</div> )}
                  </div>
                  <button onClick={() => navigate('/questions')} className="mt-8 w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg">Browse Vault</button>
              </div>

              <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[350px] animate-slide-in-up">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-3 uppercase tracking-widest text-xs">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Learning History
                    </h3>
                    <button onClick={() => navigate('/test')} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">View Analytics</button>
                  </div>
                  {loading ? (
                      <div className="space-y-6">
                          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
                      </div>
                  ) : recentTests.length === 0 ? (
                      <div className="text-center py-20 text-slate-400 text-sm italic">No data recorded yet. Start your first session.</div>
                  ) : (
                      <div className="relative pl-6 space-y-8 before:absolute before:left-[27px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                          {recentTests.map((test, i) => (
                              <div key={test.id} className="relative pl-10 group">
                                  <div className={`absolute left-[19px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${test.score >= 50 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'} z-10 transition-transform group-hover:scale-125`}></div>
                                  <div className="flex justify-between items-start">
                                      <div><h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">CBT Practice Session</h4><p className="text-xs text-slate-500 font-medium">{test.totalQuestions || 20} Inquiries • {test.level}L Context</p></div>
                                      <div className="text-right"><span className={`block font-black text-xl leading-none ${test.score >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{test.score}%</span><span className="text-[10px] font-black text-slate-400 uppercase">{new Date(test.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span></div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              <div className="md:col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm animate-slide-in-up">
                  <h3 className="font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3 uppercase tracking-widest text-xs">
                    <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                    Bulletins
                  </h3>
                  <div className="space-y-6">
                      {loading ? (
                          [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
                      ) : recentNews.length > 0 ? recentNews.map(news => (
                          <div key={news.id} onClick={() => navigate('/announcements')} className="flex gap-6 group cursor-pointer p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-[1.25rem] flex flex-col items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300"><span className="text-xl font-black leading-none">{new Date(news.date).getDate()}</span><span className="text-[9px] uppercase font-black">{new Date(news.date).toLocaleDateString(undefined, {month:'short'})}</span></div>
                              <div className="flex-1"><h4 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-1">{news.title}</h4><p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">{news.content}</p></div>
                          </div>
                      )) : <p className="text-sm text-slate-400 italic py-10 text-center">Informatics systems are currently idle.</p>}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
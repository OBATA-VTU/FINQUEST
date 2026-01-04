import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { TestResult, Announcement, PastQuestion } from '../types';
import { VerificationBadge } from '../components/VerificationBadge';

const QUOTES = [
    "Rule No. 1: Never lose money. Rule No. 2: Never forget Rule No. 1. - Warren Buffett",
    "Compound interest is the eighth wonder of the world. - Albert Einstein",
    "The best investment you can make is in yourself. - Warren Buffett",
    "In finance, what is comfortable is rarely profitable. - Robert Arnott"
];

export const UserDashboardPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const user = auth?.user;
  
  const [greeting, setGreeting] = useState('');
  const [recentTests, setRecentTests] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [avgScore, setAvgScore] = useState(0);
  const [quote, setQuote] = useState('');
  const [recentNews, setRecentNews] = useState<Announcement[]>([]);
  const [recommendedQuestions, setRecommendedQuestions] = useState<PastQuestion[]>([]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  useEffect(() => {
      const fetchData = async () => {
          if (!user?.id) return;
          setLoading(true);
          try {
              const testSnap = await getDocs(query(collection(db, 'test_results'), where('userId', '==', user.id)));
              const tests = testSnap.docs.map(d => ({ id: d.id, ...d.data() } as TestResult));
              tests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              setRecentTests(tests.slice(0, 3));
              if (tests.length > 0) setAvgScore(Math.round(tests.reduce((acc, curr) => acc + curr.score, 0) / tests.length));

              const newsSnap = await getDocs(query(collection(db, 'announcements'), limit(5)));
              let news = newsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
              news.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              setRecentNews(news.slice(0, 2));

              // FIXED RECOMMENDATION LOGIC: Strictly match Level OR Category 'General'
              const recSnap = await getDocs(query(collection(db, 'questions'), where('status', '==', 'approved')));
              const allRecs = recSnap.docs.map(d => ({ id: d.id, ...d.data() } as PastQuestion));
              const filteredRecs = allRecs.filter(q => q.level === user.level || q.category === 'Other'); 
              filteredRecs.sort((a, b) => b.year - a.year);
              setRecommendedQuestions(filteredRecs.slice(0, 3));
          } catch (e) { console.error(e); }
          finally { setLoading(false); }
      };
      fetchData();
  }, [user?.id, user?.level]);

  if (!user || !auth) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 p-4 md:p-10 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="bg-indigo-900 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900/50"></div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div>
                      <div className="flex items-center gap-3 mb-6">
                         <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center font-black text-xl overflow-hidden">{user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : user.name[0]}</div>
                         <div>
                            <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em]">{user.level} Level Finance Student</p>
                            <div className="flex items-center gap-1"><span className="font-bold text-xl">{user.name}</span><VerificationBadge role={user.role} isVerified={user.isVerified} badges={user.badges} className="w-5 h-5" /></div>
                         </div>
                      </div>
                      <h1 className="text-5xl md:text-7xl font-serif font-black mb-4 tracking-tighter">{greeting}</h1>
                      <p className="text-indigo-200 italic max-w-lg opacity-80">"{quote}"</p>
                  </div>
                  <div className="flex gap-10 bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-[2rem]">
                      <div className="text-center"><span className="block text-4xl font-black">{user.contributionPoints || 0}</span><span className="text-[10px] uppercase font-bold opacity-50">Points</span></div>
                      <div className="text-center"><span className="block text-4xl font-black">{avgScore}%</span><span className="text-[10px] uppercase font-bold opacity-50">Avg</span></div>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-8">
                  <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                      <h3 className="font-black uppercase text-[10px] text-indigo-500 tracking-widest mb-8">Personal Resources</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          {recommendedQuestions.length > 0 ? recommendedQuestions.map(q => (
                              <div key={q.id} onClick={() => navigate('/questions')} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:scale-[1.02] transition-all">
                                  <span className="text-[9px] font-black text-indigo-500 uppercase">{q.courseCode}</span>
                                  <h4 className="font-bold text-slate-800 dark:text-white mb-1 line-clamp-1">{q.courseTitle}</h4>
                                  <p className="text-[10px] text-slate-400">{q.year} Past Question</p>
                              </div>
                          )) : <div className="col-span-3 text-center py-6 text-slate-400">No specific resources found for your level.</div>}
                      </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                      <h3 className="font-black uppercase text-[10px] text-rose-500 tracking-widest mb-8">Recent News</h3>
                      <div className="space-y-6">
                          {recentNews.map(news => (
                              <div key={news.id} onClick={() => navigate('/announcements')} className="flex items-center gap-6 group cursor-pointer">
                                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center font-black text-slate-400 shrink-0">
                                      <span className="text-xl leading-none">{new Date(news.date).getDate()}</span>
                                      <span className="text-[8px]">{new Date(news.date).toLocaleDateString(undefined, {month:'short'})}</span>
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-1">{news.title}</h4>
                                      <p className="text-xs text-slate-500 line-clamp-1">{news.content}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
              <div className="space-y-8">
                  <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                      <h3 className="font-black uppercase text-[10px] text-emerald-500 tracking-widest mb-8">Performance</h3>
                      <div className="space-y-6">
                          {recentTests.map(test => (
                              <div key={test.id} className="flex justify-between items-center">
                                  <div>
                                      <p className="font-bold text-slate-800 dark:text-white text-sm">CBT Mock Session</p>
                                      <p className="text-[10px] text-slate-400">{new Date(test.date).toLocaleDateString()}</p>
                                  </div>
                                  <span className={`text-xl font-black ${test.score >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>{test.score}%</span>
                              </div>
                          ))}
                          {recentTests.length === 0 && <p className="text-center text-slate-400 text-xs py-4">No tests taken yet.</p>}
                      </div>
                      <button onClick={() => navigate('/test')} className="w-full mt-10 py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-500/20">New Practice Session</button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
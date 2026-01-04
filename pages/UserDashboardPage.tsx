
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { TestResult, Announcement, PastQuestion } from '../types';
import { VerificationBadge } from '../components/VerificationBadge';

const QUOTES = [
    "The best investment you can make is in yourself. - Warren Buffett",
    "Rule No. 1: Never lose money. Rule No. 2: Never forget Rule No. 1.",
    "In finance, what is comfortable is rarely profitable.",
    "Master your curriculum, master your future."
];

const ActionCard: React.FC<{ title: string; icon: string; onClick: () => void; }> = ({ title, icon, onClick }) => (
  <button onClick={onClick} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-left hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group">
    <span className="text-3xl mb-3 block transform group-hover:scale-110 transition-transform">{icon}</span>
    <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
  </button>
);

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
              const testQuery = query(collection(db, 'test_results'), where('userId', '==', user.id), orderBy('date', 'desc'), limit(3));
              const testSnap = await getDocs(testQuery);
              const tests = testSnap.docs.map(d => ({ id: d.id, ...d.data() } as TestResult));
              setRecentTests(tests);
              if (tests.length > 0) setAvgScore(Math.round(tests.reduce((acc, curr) => acc + curr.score, 0) / tests.length));

              const newsQuery = query(collection(db, 'announcements'), orderBy('date', 'desc'), limit(3));
              const newsSnap = await getDocs(newsQuery);
              setRecentNews(newsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
              
              const recQuery = query(collection(db, 'questions'), where('status', '==', 'approved'), where('level', '==', user.level), limit(3));
              const recSnap = await getDocs(recQuery);
              setRecommendedQuestions(recSnap.docs.map(d => ({ id: d.id, ...d.data() } as PastQuestion)));
          } catch (e) { console.error(e); }
          finally { setLoading(false); }
      };
      fetchData();
  }, [user?.id, user?.level]);

  if (!user || !auth) return null;

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{greeting}, {user.name.split(' ')[0]}!</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{quote}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ActionCard title="Past Questions" icon="📚" onClick={() => navigate('/questions')} />
              <ActionCard title="CBT Practice" icon="✍️" onClick={() => navigate('/test')} />
              <ActionCard title="Leaderboard" icon="🏆" onClick={() => navigate('/leaderboard')} />
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Recent Tests</h3>
              {loading ? <p className="text-sm text-slate-400">Loading...</p> : recentTests.length > 0 ? (
                <ul className="space-y-3">
                  {recentTests.map(test => (
                    <li key={test.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                      <div>
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{test.totalQuestions}-Question CBT</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(test.date).toLocaleDateString()}</p>
                      </div>
                      <span className={`font-bold text-lg ${test.score >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>{test.score}%</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-500">No tests taken yet.</p>}
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Recommended For You ({user.level}L)</h3>
               {loading ? <p className="text-sm text-slate-400">Loading...</p> : recommendedQuestions.length > 0 ? (
                <ul className="space-y-3">
                  {recommendedQuestions.map(q => (
                     <li key={q.id} onClick={() => navigate('/questions')} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                      <div>
                         <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{q.courseTitle}</p>
                         <p className="text-xs text-slate-500 dark:text-slate-400">{q.courseCode} - {q.year}</p>
                       </div>
                       <span className="text-indigo-500">&rarr;</span>
                     </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-500">No recommendations available.</p>}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-slate-100 dark:bg-slate-700 border-4 border-white dark:border-slate-800 overflow-hidden shadow-sm">
                {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" alt={user.name}/> : <span className="text-4xl font-bold text-slate-400 flex items-center justify-center h-full">{user.name[0]}</span>}
              </div>
              <h2 className="font-bold text-xl text-slate-900 dark:text-white">{user.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
              <div className="my-4"><VerificationBadge role={user.role} isVerified={user.isVerified} badges={user.badges} showAll /></div>
              <button onClick={() => navigate('/profile')} className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700">View Profile</button>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Statistics</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Contribution Points</span><span className="font-bold text-lg text-indigo-500">{user.contributionPoints || 0}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Average Test Score</span><span className="font-bold text-lg text-emerald-500">{avgScore}%</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Materials Uploaded</span><span className="font-bold text-lg text-slate-600 dark:text-slate-300">{user.uploadCount || 0}</span></div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Latest News</h3>
              {loading ? <p className="text-sm text-slate-400">Loading...</p> : recentNews.length > 0 ? (
                <ul className="space-y-4">
                  {recentNews.map(news => (
                    <li key={news.id} onClick={() => navigate('/announcements')} className="cursor-pointer group">
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 line-clamp-1">{news.title}</p>
                      <p className="text-xs text-slate-500">{new Date(news.date).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-500">No recent news.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

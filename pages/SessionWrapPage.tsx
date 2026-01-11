
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, getCountFromServer, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { getBadge } from '../utils/badges';

interface SessionWrapPageProps {
  info: { start: string; end: string; session: string; };
  onFinish: () => void;
}

interface SessionStats {
  tests: number;
  avgScore: number;
  bestScore: number;
  uploads: number;
  messages: number;
}

const StatDisplay: React.FC<{ label: string; value: number; suffix?: string }> = ({ label, value, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) return;
    const duration = 1500;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(progress * value);
      setDisplayValue(current);
      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();
  }, [value]);

  return (
    <div className="text-center">
      <div className="text-6xl font-black text-white animate-number-pop" style={{ animationDelay: '300ms' }}>{displayValue}{suffix}</div>
      <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest mt-2">{label}</div>
    </div>
  );
};

export const SessionWrapPage: React.FC<SessionWrapPageProps> = ({ info, onFinish }) => {
  const auth = useContext(AuthContext);
  const [slide, setSlide] = useState(0);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const user = auth?.user;

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const testsQuery = query(collection(db, 'test_results'), where('userId', '==', user.id), where('date', '>=', info.start), where('date', '<=', info.end));
        const uploadsQuery = query(collection(db, 'questions'), where('uploadedBy', '==', user.id), where('createdAt', '>=', info.start), where('createdAt', '<=', info.end));
        const messagesQuery = query(collection(db, 'community_messages'), where('senderId', '==', user.id), where('createdAt', '>=', info.start), where('createdAt', '<=', info.end));

        const [testsSnap, uploadsSnap, messagesSnap] = await Promise.all([
          getDocs(testsQuery),
          getCountFromServer(uploadsQuery),
          getCountFromServer(messagesQuery)
        ]);

        const tests = testsSnap.docs.map(d => d.data());
        let avgScore = 0, bestScore = 0;
        if (tests.length > 0) {
          bestScore = Math.max(...tests.map(t => t.score));
          avgScore = Math.round(tests.reduce((acc, t) => acc + t.score, 0) / tests.length);
        }

        const sessionStats: SessionStats = {
          tests: tests.length,
          avgScore,
          bestScore,
          uploads: uploadsSnap.data().count,
          messages: messagesSnap.data().count,
        };
        setStats(sessionStats);
        
        // Badge Logic
        const earnedBadges = new Set(user.badges || []);
        const potentialBadges = [];
        if (sessionStats.tests > 0 || sessionStats.uploads > 0 || sessionStats.messages > 0) {
            if (!earnedBadges.has('SESSION_MVP')) {
                potentialBadges.push('SESSION_MVP');
            }
        }
        setNewBadges(potentialBadges);

      } catch (e) {
        console.error("Error fetching session stats:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user, info]);

  const handleFinish = async () => {
    if (user && newBadges.length > 0) {
      await updateDoc(doc(db, 'users', user.id), {
        badges: arrayUnion(...newBadges)
      });
    }
    onFinish();
  };

  const slides = [
    // Intro
    <div key={0} className="text-center">
      <h2 className="text-xl font-bold text-indigo-300 uppercase tracking-widest mb-4">Your FINSA Journey</h2>
      <h1 className="text-5xl md:text-7xl font-black font-serif text-white mb-6">The {info.session} Session</h1>
      <p className="text-lg text-slate-300">Let's take a look at your achievements.</p>
    </div>,
    // Test Stats
    <div key={1} className="text-center">
      <h2 className="text-2xl font-bold font-serif text-white mb-10">You were a dedicated learner.</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatDisplay label="Tests Completed" value={stats?.tests || 0} />
        <StatDisplay label="Best Score" value={stats?.bestScore || 0} suffix="%" />
        <StatDisplay label="Average Score" value={stats?.avgScore || 0} suffix="%" />
      </div>
    </div>,
    // Contribution Stats
    <div key={2} className="text-center">
      <h2 className="text-2xl font-bold font-serif text-white mb-10">You helped the community grow.</h2>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <StatDisplay label="Materials Contributed" value={stats?.uploads || 0} />
        <StatDisplay label="Community Messages" value={stats?.messages || 0} />
      </div>
    </div>,
    // Badge Awards
    <div key={3} className="text-center">
      <h2 className="text-2xl font-bold font-serif text-white mb-10">For your efforts, you've earned:</h2>
      {newBadges.length > 0 ? (
          newBadges.map(badgeId => {
              const badge = getBadge(badgeId);
              if (!badge) return null;
              return (
                  <div key={badge.id} className="bg-white/10 border border-white/20 p-6 rounded-2xl max-w-sm mx-auto animate-pop-in">
                      <div className="text-6xl mb-4">{badge.icon}</div>
                      <h3 className="text-2xl font-bold text-white">{badge.name}</h3>
                      <p className="text-indigo-200">{badge.description}</p>
                  </div>
              )
          })
      ) : <p className="text-slate-300">No new badges this session. Keep engaging!</p>}
    </div>,
    // Outro
    <div key={4} className="text-center">
       <h1 className="text-4xl font-black font-serif text-white mb-6">Here's to the next chapter!</h1>
       <p className="text-lg text-slate-300">Thank you for being a valuable member of the FINSA community.</p>
    </div>
  ];

  if (loading) {
    return <div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-white">Loading your journey...</div>;
  }
  
  const currentSlideContent = slides[slide];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-950 to-slate-950 z-[9999] flex flex-col p-8 overflow-hidden">
      <div className="w-full h-1 bg-white/10 rounded-full mb-8">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${((slide + 1) / slides.length) * 100}%` }}></div>
      </div>

      <div className="flex-1 flex items-center justify-center">
          <div key={slide} className="w-full max-w-4xl mx-auto animate-slide-in-up">
              {currentSlideContent}
          </div>
      </div>
      
      <div className="flex justify-center mt-12">
        {slide < slides.length - 1 ? (
          <button onClick={() => setSlide(s => s + 1)} className="px-8 py-3 bg-white text-indigo-900 font-bold rounded-full shadow-lg">Next</button>
        ) : (
          <button onClick={handleFinish} className="px-8 py-3 bg-emerald-500 text-white font-bold rounded-full shadow-lg">Continue to Portal</button>
        )}
      </div>
    </div>
  );
};

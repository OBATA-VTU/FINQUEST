
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleGenAI, Type } from "@google/genai";
import { useNotification } from '../contexts/NotificationContext';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, increment, arrayUnion, getDoc } from 'firebase/firestore';
import { LEVELS } from '../constants';
import { Level } from '../types';
import { trackAiUsage } from '../utils/api';
import { Calculator } from '../components/Calculator';
import { fallbackQuestions } from '../utils/fallbackQuestions';

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

const shuffleAndPick = (array: any[], num: number) => {
    return [...array].sort(() => 0.5 - Math.random()).slice(0, num);
};

export const TestPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  
  const [stage, setStage] = useState<'menu' | 'setup' | 'loading' | 'exam' | 'result' | 'review'>('menu');
  const [mode, setMode] = useState<'topic' | 'mock' | 'game'>('topic');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const [showCalculator, setShowCalculator] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1200);
  const timerRef = useRef<number | null>(null);

  const [topic, setTopic] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<Level>(auth?.user?.level || 100);

  useEffect(() => {
      if (stage === 'exam') {
          timerRef.current = window.setInterval(() => {
              setTimeLeft((prev) => {
                  if (prev <= 1) {
                      clearInterval(timerRef.current!);
                      finishTest();
                      return 0;
                  }
                  return prev - 1;
              });
          }, 1000);
      } else {
          if (timerRef.current) clearInterval(timerRef.current);
      }
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stage]);

  const startExam = async () => {
    if (mode === 'topic' && !topic.trim()) {
        showNotification("Please specify a topic.", "warning");
        return;
    }
    
    setStage('loading');
    setLoadingProgress(10);

    const progressTimer = setInterval(() => {
        setLoadingProgress(p => p < 90 ? p + 5 : p);
    }, 300);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = mode === 'topic' 
            ? `Generate 20 MCQ questions for ${selectedLevel}L Finance on "${topic}". Strictly return a JSON array: [{"text": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]`
            : `Generate 30 standard ${selectedLevel}L Finance exam MCQs. JSON array only.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            correctAnswer: { type: Type.INTEGER }
                        }
                    }
                }
            }
        });

        const data = JSON.parse(response.text);
        if (Array.isArray(data) && data.length > 0) {
            setQuestions(data.map((q, idx) => ({ id: idx, ...q })));
            trackAiUsage();
            setStage('exam');
            return;
        }
        throw new Error("Invalid AI response");

    } catch (err) {
        const pool = fallbackQuestions.filter(q => q.level === selectedLevel);
        const count = mode === 'mock' ? 30 : 20;
        const picked = shuffleAndPick(pool.length >= count ? pool : fallbackQuestions, count);
        setQuestions(picked.map((q, i) => ({ id: i, ...q })));
        setStage('exam');
    } finally {
        clearInterval(progressTimer);
        setLoadingProgress(100);
    }
  };

  const finishTest = async () => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
        if (userAnswers[idx] === q.correctAnswer) correctCount++;
    });
    const finalScore = Math.round((correctCount / questions.length) * 100);
    setScore(finalScore);
    setStage('result');

    if (auth?.user) {
        const pointsToAward = finalScore >= 80 ? 5 : finalScore >= 50 ? 2 : 0;
        const userRef = doc(db, 'users', auth.user.id);
        
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const newPoints = (userData.contributionPoints || 0) + pointsToAward;
            const newBadges = [...(userData.badges || [])];

            if (newPoints >= 50 && !newBadges.includes('scholar')) newBadges.push('scholar');
            if (newPoints >= 150 && !newBadges.includes('legend')) newBadges.push('legend');
            if (finalScore === 100 && !newBadges.includes('brainiac')) newBadges.push('brainiac');
            if ((userData.testCount || 0) + 1 >= 10 && !newBadges.includes('perfectionist')) newBadges.push('perfectionist');

            await updateDoc(userRef, { 
                testCount: increment(1),
                contributionPoints: increment(pointsToAward),
                badges: newBadges
            });
        }
        
        await addDoc(collection(db, 'test_results'), {
            userId: auth.user.id,
            score: finalScore,
            totalQuestions: questions.length,
            level: selectedLevel,
            date: new Date().toISOString()
        });
    }
  };

  if (stage === 'menu') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 flex flex-col items-center animate-fade-in">
              <div className="max-w-4xl w-full text-center mb-12">
                  <span className="text-indigo-600 font-black text-xs uppercase tracking-widest mb-2 block">CBT Hub</span>
                  <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white mb-4">Academic Assessment</h1>
                  <p className="text-slate-500 dark:text-slate-400">Master your curriculum with our adaptive practice engine.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                  <div onClick={() => { setMode('topic'); setStage('setup'); }} className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all cursor-pointer border border-slate-100 dark:border-slate-700 group">
                      <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Topic Focus</h3>
                      <p className="text-slate-500 text-sm">Target specific areas of study for quick revision.</p>
                  </div>
                  <div onClick={() => { setMode('mock'); setStage('setup'); }} className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all cursor-pointer border border-slate-100 dark:border-slate-700 group">
                      <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Full Mock Exam</h3>
                      <p className="text-slate-500 text-sm">Simulate a full examination with standard timing.</p>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'setup') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Exam Config</h2>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Select Level</label>
                          <select value={selectedLevel} onChange={e => setSelectedLevel(Number(e.target.value) as Level)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold">
                              {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
                          </select>
                      </div>
                      {mode === 'topic' && (
                          <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Enter Topic</label>
                              <input value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold" placeholder="e.g. Ratio Analysis" />
                          </div>
                      )}
                      <button onClick={startExam} className="w-full py-5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg">Begin Session</button>
                      <button onClick={() => setStage('menu')} className="w-full py-3 text-slate-500 font-bold">Back</button>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'loading') {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
              <div className="w-24 h-24 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-8"></div>
              <p className="text-xl font-bold text-white uppercase tracking-widest animate-pulse">Initializing Exam Engine...</p>
              <div className="w-64 h-1 bg-slate-800 rounded-full mt-6 overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-300" style={{width: `${loadingProgress}%`}}></div>
              </div>
          </div>
      );
  }

  if (stage === 'exam') {
      const q = questions[currentQuestionIndex];
      return (
          <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
              <header className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
                  <div className="flex items-center gap-4">
                      <span className="text-lg font-black text-indigo-600 font-mono">
                          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                      </span>
                      <div className="h-1 w-32 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                          <div className="h-full bg-indigo-500 transition-all duration-500" style={{width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`}}></div>
                      </div>
                  </div>
                  <button onClick={() => setShowCalculator(!showCalculator)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  </button>
              </header>

              <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
                  <div className="flex-1 p-6 md:p-12 lg:p-20 overflow-y-auto">
                      {showCalculator && <div className="absolute top-20 right-4 z-40"><Calculator /></div>}
                      <span className="text-xs font-black uppercase text-indigo-500 mb-4 block">Question {currentQuestionIndex + 1} of {questions.length}</span>
                      <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white leading-snug mb-10">{q.text}</h2>
                      <div className="grid gap-4">
                          {q.options.map((opt, idx) => (
                              <button 
                                key={idx} 
                                onClick={() => setUserAnswers({...userAnswers, [currentQuestionIndex]: idx})}
                                className={`p-6 text-left rounded-2xl border-2 transition-all group ${userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                              >
                                  <span className={`inline-block w-8 h-8 rounded-lg flex items-center justify-center font-bold mr-4 ${userAnswers[currentQuestionIndex] === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                      {String.fromCharCode(65 + idx)}
                                  </span>
                                  <span className={`font-bold ${userAnswers[currentQuestionIndex] === idx ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-600 dark:text-slate-400'}`}>{opt}</span>
                              </button>
                          ))}
                      </div>
                  </div>
                  
                  <div className="w-full md:w-64 p-6 bg-slate-50 dark:bg-slate-900/50 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 flex flex-col">
                      <div className="flex-1 grid grid-cols-5 md:grid-cols-4 gap-2 mb-8 h-fit">
                          {questions.map((_, i) => (
                              <button 
                                key={i} 
                                onClick={() => setCurrentQuestionIndex(i)}
                                className={`h-10 rounded-lg text-xs font-bold transition-all ${currentQuestionIndex === i ? 'ring-2 ring-indigo-500 bg-white dark:bg-slate-800 text-indigo-600' : userAnswers[i] !== undefined ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700' : 'bg-white dark:bg-slate-800 text-slate-400'}`}
                              >
                                  {i + 1}
                              </button>
                          ))}
                      </div>
                      <button onClick={finishTest} className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-xl shadow-rose-500/20">Submit Final</button>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'result') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 p-12 rounded-[3rem] shadow-2xl w-full max-w-lg text-center border border-slate-100 dark:border-slate-700">
                  <div className={`w-32 h-32 rounded-full mx-auto mb-8 flex items-center justify-center text-4xl font-black ${score >= 50 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {score}%
                  </div>
                  <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">{score >= 80 ? 'Exceptional!' : score >= 50 ? 'Well Done!' : 'Keep Practicing'}</h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-10">You've earned {score >= 80 ? '5' : score >= 50 ? '2' : '0'} contribution points from this session.</p>
                  <div className="space-y-3">
                      <button onClick={() => setStage('review')} className="w-full py-4 bg-slate-100 dark:bg-slate-700 font-bold rounded-2xl">Review Responses</button>
                      <button onClick={() => setStage('menu')} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl">New Session</button>
                  </div>
              </div>
          </div>
      );
  }

  return null;
};

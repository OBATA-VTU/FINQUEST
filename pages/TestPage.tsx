import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleGenAI, Type } from "@google/genai";
import { useNotification } from '../contexts/NotificationContext';
import { db } from '../firebase';
import { collection, addDoc, getDoc, setDoc, updateDoc, increment, doc, arrayUnion } from 'firebase/firestore';
import { LEVELS } from '../constants';
import { Level, BadgeType } from '../types';
import { generateTestReviewPDF } from '../utils/pdfGenerator';
import { trackAiUsage } from '../utils/api';
import { Calculator } from '../components/Calculator';
import { fallbackQuestions } from '../utils/fallbackQuestions';

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

interface GameFeedback {
    status: 'correct' | 'wrong';
    correctIndex: number;
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
  const [loadingMessage, setLoadingMessage] = useState('Initializing Session...');
  
  const [showCalculator, setShowCalculator] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [gameLives, setGameLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameFeedback, setGameFeedback] = useState<GameFeedback | null>(null);
  
  const [topic, setTopic] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<Level>(auth?.user?.level || 100);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1200);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
      if (stage === 'exam' && !isGameOver) {
          timerRef.current = window.setInterval(() => {
              setTimeLeft((prev) => {
                  if (prev <= 1) {
                      if (timerRef.current) clearInterval(timerRef.current);
                      if (mode === 'game') handleGameOver();
                      else finishTest();
                      return 0;
                  }
                  return prev - 1;
              });
          }, 1000);
      } else {
          if (timerRef.current) clearInterval(timerRef.current);
      }
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stage, isGameOver]);

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const startExam = async () => {
    if (mode === 'topic' && !topic.trim()) {
        showNotification("Please enter a topic.", "error");
        return;
    }
    
    setStage('loading');
    setLoadingProgress(5);
    setLoadingMessage('Optimizing Question Set...');

    const progressInterval = setInterval(() => {
        setLoadingProgress(prev => (prev >= 90 ? 90 : prev + 5));
    }, 400);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let prompt = "";
        
        if (mode === 'topic') {
            prompt = `Generate a JSON Array of 20 MCQ for ${selectedLevel}L Finance on "${topic}". Format: [{"text": "Q", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. Strictly JSON.`;
        } else if (mode === 'mock') {
            prompt = `Generate a JSON Array of 30 standard exam MCQs for ${selectedLevel}L Finance students. Variety of topics. Format: [{"text": "Q", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. Strictly JSON.`;
        } else {
            prompt = `Generate 50 rapid-fire finance trivia questions. Format: [{"text": "Q", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. JSON only.`;
        }

        const aiPromise = ai.models.generateContent({
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
                        },
                        required: ["text", "options", "correctAnswer"]
                    }
                }
            }
        });

        // Use a shorter timeout to prevent "hanging"
        const response: any = await Promise.race([
            aiPromise, 
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
        ]);
        
        const data = JSON.parse(response.text);
        if (Array.isArray(data) && data.length > 0) {
            setQuestions(data.map((q: any, idx: number) => ({ id: idx, ...q })));
            setTimeLeft(mode === 'mock' ? 40 * 60 : mode === 'game' ? 30 : 20 * 60);
            setLoadingProgress(100);
            trackAiUsage();
            setTimeout(() => setStage('exam'), 300);
            clearInterval(progressInterval);
            return;
        }
        throw new Error("Invalid format");

    } catch (e: any) {
        clearInterval(progressInterval);
        // SILENT FALLBACK: Don't tell the user the AI failed. Just load the huge bank.
        const numToPick = mode === 'mock' ? 30 : mode === 'game' ? 50 : 20;
        const filteredBank = fallbackQuestions.filter(q => q.level === selectedLevel || q.topic === 'General');
        const finalPool = filteredBank.length >= numToPick ? filteredBank : fallbackQuestions;
        const picked = shuffleAndPick(finalPool, numToPick);

        setQuestions(picked.map((q, i) => ({ id: i, text: q.text, options: q.options, correctAnswer: q.correctAnswer })));
        setTimeLeft(mode === 'mock' ? 40 * 60 : mode === 'game' ? 30 : 20 * 60);
        setLoadingProgress(100);
        setTimeout(() => setStage('exam'), 500);
    }
  };

  const handleGameAnswer = (answerIndex: number) => {
      if (gameFeedback) return;
      const currentQ = questions[currentQuestionIndex];
      const isCorrect = answerIndex === currentQ.correctAnswer;
      setUserAnswers(prev => ({...prev, [currentQuestionIndex]: answerIndex}));
      setGameFeedback({ status: isCorrect ? 'correct' : 'wrong', correctIndex: currentQ.correctAnswer });

      if (isCorrect) setGameScore(prev => prev + 10);
      else setGameLives(prev => prev - 1);

      setTimeout(() => {
          setGameFeedback(null);
          if (!isCorrect && gameLives <= 1) handleGameOver();
          else if (currentQuestionIndex < questions.length - 1) {
              setCurrentQuestionIndex(prev => prev + 1);
              setTimeLeft(30);
          } else handleGameOver(true);
      }, 1000);
  };

  const handleGameOver = (win: boolean = false) => {
      setIsGameOver(true);
      if (timerRef.current) clearInterval(timerRef.current);
      setStage('result');
  };

  const finishTest = async () => {
      let sCount = 0;
      questions.forEach((q, idx) => { if (userAnswers[idx] === q.correctAnswer) sCount++; });
      const finalPercentage = Math.round((sCount / questions.length) * 100);
      setScore(finalPercentage);
      setStage('result');

      if (auth?.user && mode !== 'game') {
          try {
              const userRef = doc(db, 'users', auth.user.id);
              const newBadges: BadgeType[] = [];
              if (finalPercentage === 100) newBadges.push('brainiac');
              
              const updateData: any = { 
                  testCount: increment(1),
                  contributionPoints: increment(finalPercentage >= 80 ? 5 : finalPercentage >= 50 ? 2 : 0)
              };
              if (newBadges.length > 0) updateData.badges = arrayUnion(...newBadges);
              
              await updateDoc(userRef, updateData);
              await addDoc(collection(db, 'test_results'), {
                  userId: auth.user.id,
                  username: auth.user.username,
                  score: finalPercentage,
                  totalQuestions: questions.length,
                  level: selectedLevel,
                  mode: mode,
                  date: new Date().toISOString()
              });
          } catch (e) { console.error(e); }
      }
  };

  // --- RENDERING ---
  if (stage === 'menu') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-16 px-4 flex flex-col items-center animate-fade-in">
              <div className="max-w-5xl w-full">
                  <div className="text-center mb-12">
                      <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-4 inline-block">FINSA CBT Practice</span>
                      <h1 className="text-4xl md:text-6xl font-serif font-black text-slate-900 dark:text-white mb-4">The Assessment Hub</h1>
                      <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">Master your finance curriculum with real-time feedback and dynamic question banks.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <button onClick={() => { setMode('topic'); setStage('setup'); }} className="group bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all text-left">
                          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Topic Focus</h3>
                          <p className="text-sm text-slate-500">Pick any topic, we handle the rest.</p>
                      </button>
                      <button onClick={() => { setMode('mock'); setStage('setup'); }} className="group bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-all text-left">
                          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Full Mock</h3>
                          <p className="text-sm text-slate-500">Simulate final exams with timed sessions.</p>
                      </button>
                      <button onClick={() => { setMode('game'); setStage('setup'); }} className="group bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-700 hover:border-amber-500 transition-all text-left">
                          <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900 rounded-2xl flex items-center justify-center text-amber-600 mb-6 group-hover:scale-110 transition-transform"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Game On</h3>
                          <p className="text-sm text-slate-500">Rapid trivia. 3 lives. Top the board.</p>
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'setup') {
      return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-8">
                      <button onClick={() => setStage('menu')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">←</button>
                      <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Configuration</h2>
                  </div>
                  <div className="space-y-6">
                      <div>
                          <label className="block text-[10px] font-black uppercase text-indigo-500 mb-2">Level</label>
                          <select value={selectedLevel} onChange={e => setSelectedLevel(Number(e.target.value) as Level)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold border border-slate-100 dark:border-slate-700">
                              {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
                          </select>
                      </div>
                      {mode === 'topic' && (
                          <div>
                              <label className="block text-[10px] font-black uppercase text-indigo-500 mb-2">Target Topic</label>
                              <input value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border border-slate-100 dark:border-slate-700" placeholder="e.g. Ratio Analysis" />
                          </div>
                      )}
                      <button onClick={startExam} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 uppercase tracking-widest text-xs transition-all">Start Exam</button>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'loading') {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
              <div className="relative w-32 h-32 mb-8">
                  <svg className="w-full h-full animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-10" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-white">{loadingProgress}%</div>
              </div>
              <h2 className="text-xl font-bold text-indigo-300 animate-pulse uppercase tracking-widest">{loadingMessage}</h2>
          </div>
      );
  }

  if (stage === 'exam') {
      const currentQ = questions[currentQuestionIndex];
      return (
          <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col transition-colors overflow-hidden">
              <div className="h-1 bg-slate-100 dark:bg-slate-900 w-full"><div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div></div>
              
              <div className="flex-1 flex flex-col md:flex-row">
                  {/* Sidebar Nav */}
                  <div className="w-full md:w-72 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-100 dark:border-slate-800 p-6 flex flex-col h-auto md:h-full">
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6 flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Clock</span>
                          <span className={`font-mono font-black text-xl ${timeLeft < 60 ? 'text-rose-500 animate-pulse' : 'text-indigo-600'}`}>{formatTime(timeLeft)}</span>
                      </div>
                      <div className="flex-1 grid grid-cols-5 gap-1.5 overflow-y-auto max-h-48 md:max-h-full pb-4">
                          {questions.map((_, i) => (
                              <button key={i} onClick={() => setCurrentQuestionIndex(i)} className={`h-10 rounded-xl font-bold text-xs transition-all ${currentQuestionIndex === i ? 'ring-4 ring-indigo-500/20 bg-indigo-600 text-white' : userAnswers[i] !== undefined ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-400'}`}>{i + 1}</button>
                          ))}
                      </div>
                      <div className="pt-6 space-y-3">
                          <button onClick={() => setShowCalculator(!showCalculator)} className="w-full py-3 bg-white dark:bg-slate-800 text-slate-600 font-bold text-xs rounded-2xl border border-slate-200 dark:border-slate-700">Calc</button>
                          <button onClick={finishTest} className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-rose-500/20">Submit</button>
                      </div>
                  </div>

                  {/* Question Area */}
                  <div className="flex-1 p-6 md:p-20 overflow-y-auto relative">
                      {showCalculator && <div className="absolute top-4 right-4 z-50"><Calculator /></div>}
                      <div className="max-w-3xl mx-auto">
                          <span className="text-indigo-600 font-black text-[10px] uppercase tracking-widest mb-4 block">Question {currentQuestionIndex + 1}</span>
                          <h2 className="text-3xl font-serif font-black text-slate-900 dark:text-white leading-snug mb-12">{currentQ.text}</h2>
                          <div className="grid gap-4">
                              {currentQ.options.map((opt, idx) => (
                                  <button key={idx} onClick={() => setUserAnswers({...userAnswers, [currentQuestionIndex]: idx})} className={`p-6 rounded-3xl text-left font-bold transition-all border-2 ${userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                      <span className="mr-4 text-xs font-black opacity-30">{String.fromCharCode(65+idx)}.</span>
                                      {opt}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'result' || stage === 'review') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 flex items-center justify-center">
              <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                  <div className={`p-16 text-center text-white ${score >= 50 ? 'bg-indigo-600' : 'bg-rose-600'}`}>
                      <h2 className="text-8xl font-black mb-2">{score}%</h2>
                      <p className="font-bold text-xl uppercase tracking-widest">{score >= 80 ? 'Distinction' : score >= 50 ? 'Passed' : 'Try Again'}</p>
                  </div>
                  <div className="p-10 space-y-4">
                      <button onClick={() => setStage('review')} className="w-full py-4 bg-slate-100 dark:bg-slate-700 font-bold rounded-2xl">Review Answers</button>
                      <button onClick={() => setStage('menu')} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs">New Session</button>
                  </div>
              </div>
          </div>
      );
  }

  return null;
};
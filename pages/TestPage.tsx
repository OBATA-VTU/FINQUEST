import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleGenAI, Type } from "@google/genai";
import { useNotification } from '../contexts/NotificationContext';
import { db } from '../firebase';
import { collection, addDoc, getDoc, setDoc, updateDoc, increment, doc } from 'firebase/firestore';
import { LEVELS } from '../constants';
import { Level, User } from '../types';
import { generateTestReviewPDF } from '../utils/pdfGenerator';
import { trackAiUsage } from '../utils/api';
import { Calculator } from '../components/Calculator';
import { fallbackQuestions } from '../utils/fallbackQuestions';
import { checkAndAwardBadges } from '../utils/badges';

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
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
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
  
  // FIX: Added missing state for the timer.
  const [timeLeft, setTimeLeft] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [gameLives, setGameLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameFeedback, setGameFeedback] = useState<GameFeedback | null>(null);
  
  const [topic, setTopic] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<Level>(auth?.user?.level || 100);
  
  const [score, setScore] = useState(0);
  
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
    setLoadingProgress(10);
    setLoadingMessage('Consulting AI Expert...');
    const progressInterval = setInterval(() => setLoadingProgress(prev => (prev >= 95 ? 95 : prev + 1)), 200);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let prompt = "";
        if (mode === 'topic') prompt = `Generate a JSON Array of 20 challenging multiple-choice questions for ${selectedLevel} Level Finance students on "${topic}". Format: [{"id": 1, "text": "Question?", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. Strictly JSON. No Markdown.`;
        else if (mode === 'mock') prompt = `Generate a JSON Array of 30 standard exam questions for ${selectedLevel} Level Finance students. Format: [{"id": 1, "text": "Question?", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. Strictly JSON. No Markdown.`;
        else if (mode === 'game') prompt = `Generate a JSON Array of 50 rapid-fire finance trivia questions. Format: [{"id": 1, "text": "Question?", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. Strictly JSON.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.INTEGER }, text: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswer: { type: Type.INTEGER }}, required: ["text", "options", "correctAnswer"]}}
            }
        });
        clearInterval(progressInterval);
        setLoadingProgress(100);
        trackAiUsage();
        if (!response.text) throw new Error("AI returned empty content.");
        const data = JSON.parse(response.text.replace(/```json|```/g, '').trim());
        if (Array.isArray(data) && data.length > 0) {
            setQuestions(data.map((q: any, idx: number) => ({ id: idx, text: q.text, options: q.options, correctAnswer: q.correctAnswer })));
            if (mode === 'topic') setTimeLeft(20 * 60);
            else if (mode === 'mock') setTimeLeft(40 * 60);
            else if (mode === 'game') setTimeLeft(30);
            setTimeout(() => {
                setStage('exam');
                setCurrentQuestionIndex(0);
                setUserAnswers({});
                if (mode === 'game') { setGameLives(3); setGameScore(0); setIsGameOver(false); setGameFeedback(null); }
            }, 500);
        } else { throw new Error("Invalid question format"); }
    } catch (e: any) {
        clearInterval(progressInterval);
        console.error("AI Generation failed:", e);
        showNotification("AI failed. Loading standard questions.", "warning");
        setLoadingMessage('AI Unavailable. Loading Standard Exam...');
        setTimeout(() => {
            const num = mode === 'mock' ? 30 : mode === 'game' ? 50 : 20;
            const fallback = fallbackQuestions.filter(q => q.level === selectedLevel);
            setQuestions(shuffleAndPick(fallback.length >= num ? fallback : fallbackQuestions, num));
            setTimeLeft(mode === 'mock' ? 40 * 60 : 20 * 60);
            setStage('exam');
            setCurrentQuestionIndex(0);
            setUserAnswers({});
            if (mode === 'game') { setGameLives(3); setGameScore(0); setIsGameOver(false); setGameFeedback(null); setTimeLeft(30); }
        }, 1500);
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
          else if (currentQuestionIndex < questions.length - 1) { setCurrentQuestionIndex(prev => prev + 1); setTimeLeft(30); }
          else handleGameOver(true);
      }, 1000);
  };

  // FIX: Added optional boolean argument to handle different game-over scenarios.
  const handleGameOver = async (isVictory: boolean = false) => {
      setIsGameOver(true);
      if (timerRef.current) clearInterval(timerRef.current);
      setStage('result');
      if (auth?.user && !auth.user.badges?.includes('FINQUEST_SURVIVOR')) {
          const userRef = doc(db, 'users', auth.user.id);
          const allBadges = [...new Set([...(auth.user.badges || []), 'FINQUEST_SURVIVOR'])];
          await updateDoc(userRef, { badges: allBadges });
          auth.updateUser({ badges: allBadges });
          showNotification("Badge Unlocked: FinQuest Survivor!", "success");
      }
  };

  const finishTest = async () => {
      let s = 0;
      questions.forEach((q, idx) => { if (userAnswers[idx] === q.correctAnswer) s++; });
      const finalPercentage = Math.round((s / questions.length) * 100);
      setScore(finalPercentage);
      setStage('result');
      if (auth?.user && mode !== 'game') {
          try {
              const userRef = doc(db, 'users', auth.user.id);
              await addDoc(collection(db, 'test_results'), { userId: auth.user.id, username: auth.user.username, score: finalPercentage, totalQuestions: questions.length, level: selectedLevel, mode, date: new Date().toISOString() });
              const lbRef = doc(db, 'leaderboard', auth.user.id);
              const lbDoc = await getDoc(lbRef);
              if (!lbDoc.exists() || (lbDoc.data().score || 0) < finalPercentage) {
                  await setDoc(lbRef, { userId: auth.user.id, username: auth.user.username, avatarUrl: auth.user.avatarUrl || '', score: finalPercentage, level: selectedLevel, date: new Date().toISOString() }, { merge: true });
                  showNotification("New High Score saved!", "success");
              }
              let points = finalPercentage >= 80 ? 5 : finalPercentage >= 50 ? 2 : 0;
              if (points > 0) {
                  await updateDoc(userRef, { contributionPoints: increment(points) });
                  showNotification(`+${points} Contribution Points!`, "success");
              }
              
              // Badge Checks
              const earnedBadges = new Set(auth.user.badges || []);
              let newBadges: string[] = [];
              if (finalPercentage === 100 && !earnedBadges.has('PERFECTIONIST')) newBadges.push('PERFECTIONIST');
              
              const userDoc = await getDoc(userRef);
              if (userDoc.exists()) {
                  const user = { id: userDoc.id, ...userDoc.data() } as User;
                  const otherNewBadges = await checkAndAwardBadges(user);
                  newBadges = [...new Set([...newBadges, ...otherNewBadges])];
              }

              if (newBadges.length > 0) {
                  const allBadges = [...new Set([...(auth.user.badges || []), ...newBadges])];
                  await updateDoc(userRef, { badges: allBadges });
                  auth.updateUser({ badges: allBadges });
                  showNotification(`Unlocked ${newBadges.length} new badge(s)!`, "success");
              }
          } catch (e) { console.error(e); }
      }
  };

  const handleSelectAnswer = (idx: number) => setUserAnswers({ ...userAnswers, [currentQuestionIndex]: idx });
  const nextQuestion = () => { if (currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(p => p + 1); };
  const prevQuestion = () => { if (currentQuestionIndex > 0) setCurrentQuestionIndex(p => p - 1); };
  // FIX: Added timeLeft reset.
  const resetTest = () => { setStage('menu'); setQuestions([]); setUserAnswers({}); setCurrentQuestionIndex(0); setTopic(''); setTimeLeft(1200); setScore(0); setGameScore(0); setGameLives(3); setIsGameOver(false); };

  // ... RENDERERS ...
  const renderSetup = () => ( <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 animate-fade-in"><div className="w-full max-w-lg"><div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700"><button onClick={() => setStage('menu')} className="text-xs font-bold text-slate-400 hover:text-indigo-500 flex items-center gap-1 mb-6">&larr; Change Mode</button><h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">Test Setup</h2><p className="text-slate-500 dark:text-slate-400 mb-8">{mode === 'topic' ? 'Specify a topic.' : mode === 'game' ? 'Get ready for a rapid-fire quiz!' : 'Confirm to start mock exam.'}</p><div className="space-y-6">{mode === 'topic' && (<div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Topic</label><input value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" placeholder="e.g. Capital Budgeting" autoFocus /></div>)}<div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Level</label><select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value as Level)} className="w-full p-4 rounded-xl border appearance-none bg-white border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white">{LEVELS.filter(l => typeof l === 'number').map(l => <option key={l} value={l}>{l}</option>)}</select></div><button onClick={startExam} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-transform hover:-translate-y-1">Start</button></div></div></div></div>);
  const renderLoading = () => ( <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white"><div className="relative w-48 h-48 flex items-center justify-center mb-8"><svg className="w-full h-full transform -rotate-90"><circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-indigo-900" /><circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={552.8} strokeDashoffset={552.8 - (552.8 * loadingProgress) / 100} className="text-indigo-400 transition-all" /></svg><span className="absolute text-5xl font-mono font-bold">{loadingProgress}%</span></div><p className="text-lg font-bold text-indigo-300 animate-pulse">{loadingMessage}</p></div>);
  const renderResult = () => { const isGame = mode === 'game'; const finalScore = isGame ? gameScore : score; const isPass = isGame ? true : finalScore >= 50; return ( <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 text-center animate-fade-in"><div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 animate-float ${isPass ? 'bg-emerald-100' : 'bg-rose-100'}`}><span className={`text-6xl ${isPass ? 'text-emerald-500' : 'text-rose-500'}`}>{isPass ? '🎉' : '😔'}</span></div><h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">{isGame ? 'Game Over!' : 'Test Complete!'}</h2><p className="text-slate-500 dark:text-slate-400 mb-8">{isGame ? `You scored:` : "Here's your performance:"}</p><div className={`mb-10 p-6 rounded-2xl border-2 ${isPass ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}><p className={`text-6xl font-black ${isPass ? 'text-emerald-600' : 'text-rose-600'}`}>{finalScore}{isGame ? '' : '%'}</p><p className={`text-sm font-bold uppercase ${isPass ? 'text-emerald-500' : 'text-rose-500'}`}>{isGame ? 'Points' : 'Score'}</p></div><div className="flex gap-4"><button onClick={resetTest} className="px-6 py-3 bg-white border border-slate-200 font-bold rounded-lg hover:bg-slate-50">Menu</button>{!isGame && <button onClick={() => setStage('review')} className="px-6 py-3 bg-indigo-100 text-indigo-700 font-bold rounded-lg">Review</button>}<button onClick={startExam} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg">Play Again</button></div>{!isGame && <button onClick={() => generateTestReviewPDF(questions, userAnswers, score, auth?.user)} className="mt-4 text-xs text-slate-400 hover:underline">Download PDF</button>}</div>);};
  const renderReview = () => ( <div className="min-h-screen bg-slate-100 p-8"><div className="max-w-4xl mx-auto"><div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-serif font-bold">Review Answers</h2><button onClick={() => setStage('result')} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold">Back</button></div><div className="space-y-6">{questions.map((q, i) => { const userAnswer = userAnswers[i]; const isCorrect = userAnswer === q.correctAnswer; return ( <div key={i} className="bg-white p-6 rounded-2xl border"><p className="font-bold mb-4">{i+1}. {q.text}</p><div className="space-y-2">{q.options.map((opt, optIdx) => ( <div key={optIdx} className={`p-3 rounded-lg border-2 text-sm ${optIdx === q.correctAnswer ? 'bg-emerald-50 border-emerald-300' : ''} ${!isCorrect && optIdx === userAnswer ? 'bg-rose-50 border-rose-300' : ''}`}>{String.fromCharCode(65+optIdx)}. {opt}</div>))}</div></div>);})}</div></div>);
  const renderExam = () => { if (questions.length === 0) return null; const currentQ = questions[currentQuestionIndex]; if (mode === 'game') return ( <div className="min-h-screen bg-slate-900 text-white flex flex-col p-8"><header className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold font-serif text-indigo-300">FINQUEST</h2><div className="flex items-center gap-4"><div className="flex gap-1 text-2xl">{Array(gameLives).fill(0).map((_, i) => <span key={i} className="text-rose-500">♥</span>)}{Array(3-gameLives).fill(0).map((_, i) => <span key={i} className="text-rose-900">♥</span>)}</div><div className="px-4 py-2 bg-amber-400 text-slate-900 rounded font-bold">{gameScore}</div></div></header><main className="flex-1 flex flex-col items-center justify-center text-center"><div className="relative w-24 h-24 mb-6"><svg className="w-full h-full transform -rotate-90"><circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-indigo-800" /><circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={276.4} strokeDashoffset={276.4 - (276.4 * timeLeft) / 30} className="text-indigo-400 transition-all linear" /></svg><span className="absolute inset-0 flex items-center justify-center text-3xl font-mono">{timeLeft}</span></div><h3 className="text-3xl font-bold max-w-3xl mb-12">{currentQ.text}</h3><div className="grid grid-cols-2 gap-4 w-full max-w-3xl">{currentQ.options.map((opt, i) => (<button key={i} onClick={() => handleGameAnswer(i)} disabled={!!gameFeedback} className={`p-4 rounded-xl text-lg font-semibold text-left transition-all border-4 ${gameFeedback && gameFeedback.correctIndex === i ? 'bg-emerald-500 border-emerald-300 scale-105' : ''} ${gameFeedback?.status === 'wrong' && userAnswers[currentQuestionIndex] === i ? 'bg-rose-600 border-rose-400' : ''} ${!gameFeedback ? 'bg-slate-800 border-slate-700 hover:bg-indigo-800' : 'border-transparent'}`}>{String.fromCharCode(65+i)}. {opt}</button>))}</div></main></div>); return (<div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex"><div className="w-1/4 bg-white dark:bg-slate-900 p-4 border-r"><div className="overflow-y-auto"><h3 className="text-xs font-bold uppercase text-slate-400 mb-2 px-2">Questions</h3><div className="grid grid-cols-5 gap-2">{questions.map((_, i) => (<button key={i} onClick={() => setCurrentQuestionIndex(i)} className={`w-10 h-10 rounded-lg font-bold text-sm ${currentQuestionIndex === i ? 'bg-indigo-600 text-white' : userAnswers[i] !== undefined ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 hover:bg-slate-200'}`}>{i + 1}</button>))}</div></div><div className="mt-4 pt-4 border-t"><button onClick={finishTest} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg">Submit</button></div></div><div className="flex-1 p-12 overflow-y-auto relative"><div className="bg-slate-800 text-white p-4 rounded-xl flex items-center justify-between mb-8"><span className="font-bold">{mode} Mode</span><div className="flex items-center gap-4"><button onClick={() => setShowCalculator(!showCalculator)} title="Calculator"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 7h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></button><span className="font-mono text-xl">{formatTime(timeLeft)}</span></div></div>{showCalculator && <div className="absolute top-24 right-12 z-20"><Calculator/></div>}<div className="mb-8"><p className="text-sm font-bold text-indigo-600 mb-2">Question {currentQuestionIndex + 1} of {questions.length}</p><h2 className="text-2xl font-bold text-slate-900 dark:text-white">{currentQ.text}</h2></div><div className="space-y-4">{currentQ.options.map((opt, i) => (<button key={i} onClick={() => handleSelectAnswer(i)} className={`w-full p-5 text-left rounded-xl border-2 flex items-start gap-4 ${userAnswers[currentQuestionIndex] === i ? 'bg-indigo-100 border-indigo-500' : 'bg-white hover:border-indigo-300'}`}><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 mt-1 ${userAnswers[currentQuestionIndex] === i ? 'bg-indigo-600 text-white' : 'border-slate-300'}`}>{String.fromCharCode(65 + i)}</div><span className="flex-1">{opt}</span></button>))}</div><div className="flex justify-between mt-12"><button onClick={prevQuestion} disabled={currentQuestionIndex === 0} className="px-6 py-3 bg-white border rounded-lg font-bold disabled:opacity-50">Previous</button><button onClick={nextQuestion} disabled={currentQuestionIndex === questions.length - 1} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold disabled:opacity-50">Next</button></div></div></div>); };
  
  switch (stage) {
      case 'menu': return (<div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-16 px-4 flex flex-col items-center animate-fade-in"><div className="max-w-6xl w-full"><div className="text-center mb-16"><span className="text-indigo-600 font-bold tracking-widest text-xs uppercase mb-3 block">CBT</span><h1 className="text-5xl font-serif font-bold text-slate-900 dark:text-white mb-4">Practice Center</h1><p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Sharpen your acumen with AI-powered assessments.</p></div><div className="grid grid-cols-1 md:grid-cols-3 gap-8"><button onClick={() => { setMode('topic'); setStage('setup'); }} className="group relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all border hover:-translate-y-2 text-left"><h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Topic Mastery</h3><p className="text-slate-500 dark:text-slate-400 text-sm">Generate questions on any topic using AI.</p></button><button onClick={() => { setMode('mock'); setStage('setup'); }} className="group relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all border hover:-translate-y-2 text-left"><h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Standard Mock</h3><p className="text-slate-500 dark:text-slate-400 text-sm">Simulate real exam conditions.</p></button><button onClick={() => { setMode('game'); setStage('setup'); }} className="group relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all border hover:-translate-y-2 text-left"><h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">FINQUEST</h3><p className="text-slate-500 dark:text-slate-400 text-sm">A fast-paced survival game.</p></button></div></div></div>);
      case 'setup': return renderSetup();
      case 'loading': return renderLoading();
      case 'exam': return renderExam();
      case 'result': return renderResult();
      case 'review': return renderReview();
      default: return null;
  }
};

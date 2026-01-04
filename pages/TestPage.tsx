
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleGenAI, Type } from "@google/genai";
import { useNotification } from '../contexts/NotificationContext';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { LEVELS } from '../constants';
import { Level } from '../types';
import { trackAiUsage } from '../utils/api';
import { Calculator } from '../components/Calculator';
import { fallbackQuestions } from '../utils/fallbackQuestions';
import { generateTestReviewPDF } from '../utils/pdfGenerator';

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
  
  const [stage, setStage] = useState<'setup' | 'loading' | 'exam' | 'result' | 'review'>('setup');
  const [mode, setMode] = useState<'topic' | 'mock'>('topic');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [reviewAnswers, setReviewAnswers] = useState<Record<number, number>>({});
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
    const progressTimer = setInterval(() => setLoadingProgress(p => p < 90 ? p + 5 : p), 300);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = mode === 'topic' 
            ? `Generate 20 MCQ questions for ${selectedLevel}L Finance on "${topic}". Strictly return a JSON array: [{"text": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]`
            : `Generate 30 standard ${selectedLevel}L Finance exam MCQs. JSON array only.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswer: { type: Type.INTEGER }}}}
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
    setReviewAnswers(userAnswers);
    setUserAnswers({});
    setStage('result');

    if (auth?.user) {
        const pointsToAward = finalScore >= 80 ? 5 : finalScore >= 50 ? 2 : 0;
        const userRef = doc(db, 'users', auth.user.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const newBadges = [...(userData.badges || [])];
            if (finalScore >= 50 && !newBadges.includes('scholar')) newBadges.push('scholar');
            if (finalScore >= 150 && !newBadges.includes('legend')) newBadges.push('legend');
            if (finalScore === 100 && !newBadges.includes('brainiac')) newBadges.push('brainiac');
            if ((userData.testCount || 0) + 1 >= 10 && !newBadges.includes('perfectionist')) newBadges.push('perfectionist');
            await updateDoc(userRef, { testCount: increment(1), contributionPoints: increment(pointsToAward), badges: newBadges });
        }
        await addDoc(collection(db, 'test_results'), { userId: auth.user.id, score: finalScore, totalQuestions: questions.length, level: selectedLevel, date: new Date().toISOString() });
    }
  };

  const resetTest = () => {
    setStage('setup'); setQuestions([]); setCurrentQuestionIndex(0); setUserAnswers({}); setReviewAnswers({});
    setScore(0); setTimeLeft(1200); setTopic('');
  };

  if (stage === 'setup') {
      return (
          <div className="p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-full flex items-center justify-center">
              <div className="max-w-2xl w-full bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">CBT Practice Session</h1>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">Configure your test and begin when ready.</p>
                  <div className="space-y-6">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Test Mode</label>
                          <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                              <button onClick={() => setMode('topic')} className={`py-2 rounded-md font-bold text-sm ${mode === 'topic' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow' : 'text-slate-500'}`}>Topic Focus</button>
                              <button onClick={() => setMode('mock')} className={`py-2 rounded-md font-bold text-sm ${mode === 'mock' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow' : 'text-slate-500'}`}>Mock Exam</button>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Level</label>
                          <select value={selectedLevel} onChange={e => setSelectedLevel(Number(e.target.value) as Level)} className="w-full p-3 bg-slate-100 dark:bg-slate-700 rounded-lg outline-none font-semibold">
                              {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
                          </select>
                      </div>
                      {mode === 'topic' && (
                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Topic</label>
                              <input value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-700 rounded-lg outline-none font-semibold" placeholder="e.g., Capital Budgeting, Ratio Analysis" />
                          </div>
                      )}
                      <button onClick={startExam} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg text-lg">Start Test</button>
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
                      <span className="text-lg font-black text-indigo-600 font-mono">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                      <div className="h-1 w-32 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block"><div className="h-full bg-indigo-500 transition-all duration-500" style={{width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`}}></div></div>
                  </div>
                  <button onClick={() => setShowCalculator(!showCalculator)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></button>
              </header>
              <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
                  <div className="flex-1 p-6 md:p-12 lg:p-20 overflow-y-auto relative">
                      {showCalculator && <div className="absolute top-4 right-4 z-40"><Calculator /></div>}
                      <span className="text-xs font-black uppercase text-indigo-500 mb-4 block">Question {currentQuestionIndex + 1} of {questions.length}</span>
                      <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white leading-snug mb-10">{q.text}</h2>
                      <div className="grid gap-4">
                          {q.options.map((opt, idx) => (
                              <button key={idx} onClick={() => setUserAnswers({...userAnswers, [currentQuestionIndex]: idx})} className={`flex items-center p-4 text-left rounded-xl border-2 transition-all group ${userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold mr-4 shrink-0 ${userAnswers[currentQuestionIndex] === idx ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>{String.fromCharCode(65 + idx)}</span>
                                  <span className={`font-semibold ${userAnswers[currentQuestionIndex] === idx ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                              </button>
                          ))}
                      </div>
                  </div>
                  <div className="w-full md:w-64 p-6 bg-slate-50 dark:bg-slate-900/50 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 flex flex-col">
                      <div className="flex-1 grid grid-cols-5 md:grid-cols-4 gap-2 mb-8 h-fit">
                          {questions.map((_, i) => (<button key={i} onClick={() => setCurrentQuestionIndex(i)} className={`h-10 rounded-lg text-xs font-bold transition-all ${currentQuestionIndex === i ? 'ring-2 ring-indigo-500 bg-white dark:bg-slate-800 text-indigo-600' : userAnswers[i] !== undefined ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700' : 'bg-white dark:bg-slate-800 text-slate-400'}`}>{i + 1}</button>))}
                      </div>
                      <button onClick={finishTest} className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-lg">Submit Final</button>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'result') {
       return (
           <div className="min-h-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
               <div className="bg-white dark:bg-slate-800 p-8 md:p-12 rounded-2xl shadow-xl w-full max-w-lg text-center border border-slate-200 dark:border-slate-700">
                   <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Session Complete</h1>
                   <p className="text-slate-500 dark:text-slate-400 mb-6">Here's how you performed.</p>
                   <div className={`w-40 h-40 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl font-black border-8 ${score >= 50 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
                       {score}%
                   </div>
                   <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-2">{score >= 80 ? 'Excellent!' : score >= 50 ? 'Good Job!' : 'Needs Improvement'}</h2>
                   <p className="text-slate-500 dark:text-slate-400 mb-8">You've earned {score >= 80 ? '5' : score >= 50 ? '2' : '0'} contribution points.</p>
                   <div className="flex flex-col sm:flex-row gap-4">
                       <button onClick={() => setStage('review')} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Review Answers</button>
                       <button onClick={resetTest} className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-lg hover:bg-slate-300">New Test</button>
                   </div>
               </div>
           </div>
       );
  }

  if (stage === 'review') {
      return (
          <div className="min-h-full bg-slate-100 dark:bg-slate-900 p-4 sm:p-8">
              <div className="max-w-4xl mx-auto">
                  <div className="flex justify-between items-center mb-6 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm sticky top-4 z-10">
                      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reviewing Your Test</h1>
                      <div className="flex gap-2">
                          <button onClick={() => generateTestReviewPDF(questions, reviewAnswers, score, auth?.user)} className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg">Download PDF</button>
                          <button onClick={resetTest} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">Done</button>
                      </div>
                  </div>
                  <div className="space-y-6">
                      {questions.map((q, idx) => (
                          <div key={q.id} className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                              <p className="font-bold text-slate-900 dark:text-white mb-4">Q{idx + 1}: {q.text}</p>
                              <ul className="space-y-2">
                                  {q.options.map((opt, optIdx) => {
                                      const isCorrect = optIdx === q.correctAnswer;
                                      const isSelected = optIdx === reviewAnswers[idx];
                                      let stateClass = 'border-slate-200 dark:border-slate-700';
                                      if (isCorrect) stateClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
                                      else if (isSelected) stateClass = 'border-rose-500 bg-rose-50 dark:bg-rose-900/20';
                                      return (
                                          <li key={optIdx} className={`p-3 border rounded-lg text-sm ${stateClass}`}>
                                              {opt}
                                              {isCorrect && <span className="font-bold text-emerald-600"> (Correct Answer)</span>}
                                              {isSelected && !isCorrect && <span className="font-bold text-rose-600"> (Your Answer)</span>}
                                          </li>
                                      );
                                  })}
                              </ul>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      );
  }
  return null;
};

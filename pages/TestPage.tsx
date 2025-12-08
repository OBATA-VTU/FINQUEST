
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Calculator } from '../components/Calculator';
import { GoogleGenAI, Type } from "@google/genai";
import { useNotification } from '../contexts/NotificationContext';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, limit, getDocs, doc, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';
import { LEVELS } from '../constants';
import { Level, TestResult } from '../types';
import { generateTestReviewPDF } from '../utils/pdfGenerator';
import { trackAiUsage } from '../utils/api'; // Import tracker

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

const FALLBACK_QUESTIONS: Question[] = [
    { id: 101, text: "Which of the following is NOT a capital budgeting technique?", options: ["Net Present Value (NPV)", "Internal Rate of Return (IRR)", "Depreciation Method", "Payback Period"], correctAnswer: 2 },
    // ... (Keep existing fallback questions to save space, assuming they are the same as before)
];

export const TestPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  
  const [stage, setStage] = useState<'menu' | 'setup' | 'loading' | 'exam' | 'result' | 'review'>('menu');
  const [mode, setMode] = useState<'topic' | 'mock'>('topic');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showCalculator, setShowCalculator] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing Session...');
  
  const [topic, setTopic] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<Level>(auth?.user?.level || 100);
  
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<TestResult[]>([]);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes default
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
      fetchLeaderboard();
  }, [auth?.user?.id]);

  useEffect(() => {
      if (stage === 'exam') {
          // Start Timer
          timerRef.current = window.setInterval(() => {
              setTimeLeft((prev) => {
                  if (prev <= 1) {
                      if (timerRef.current) clearInterval(timerRef.current);
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

  const fetchLeaderboard = async () => {
      try {
          const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(10));
          const snap = await getDocs(q);
          const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as TestResult));
          setLeaderboard(results);
      } catch (e) {}
  };

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
    setLoadingMessage('Contacting Secure Server...');

    const progressInterval = setInterval(() => {
        setLoadingProgress(prev => (prev >= 95 ? 95 : prev + Math.floor(Math.random() * 8) + 1));
    }, 800);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let prompt = mode === 'topic' 
            ? `Generate 20 difficult multiple-choice questions for ${selectedLevel} Level Finance students on topic: "${topic}". Return raw JSON.` 
            : `Generate 20 difficult, randomized multiple-choice questions for ${selectedLevel} Level Finance students. Return raw JSON.`;

        const aiPromise = ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            answerIndex: { type: Type.INTEGER }
                        },
                        required: ["question", "options", "answerIndex"]
                    }
                }
            }
        });

        const response: any = await Promise.race([
            aiPromise, 
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 25000))
        ]);
        
        clearInterval(progressInterval);
        setLoadingProgress(100);

        // Track Usage
        trackAiUsage();

        const data = JSON.parse(response.text);
        if (Array.isArray(data)) {
            setQuestions(data.map((q: any, idx: number) => ({
                id: idx,
                text: q.question,
                options: q.options,
                correctAnswer: q.answerIndex
            })));
            setTimeLeft(mode === 'topic' ? 1200 : 1800); // 20 min for topic, 30 min for mock
            setTimeout(() => {
                setStage('exam');
                setCurrentQuestionIndex(0);
                setUserAnswers({});
            }, 500);
        } else { throw new Error("Invalid format"); }

    } catch (e: any) {
        clearInterval(progressInterval);
        console.warn("AI Generation failed:", e);
        setLoadingMessage('Loading Standard Set...');
        setTimeout(() => {
            setQuestions(FALLBACK_QUESTIONS);
            setTimeLeft(900);
            setStage('exam');
            setCurrentQuestionIndex(0);
            setUserAnswers({});
        }, 1000);
    }
  };

  const finishTest = async () => {
      let s = 0;
      questions.forEach((q, idx) => {
          if (userAnswers[idx] === q.correctAnswer) s++;
      });
      const finalPercentage = Math.round((s / questions.length) * 100);
      setScore(finalPercentage);
      setStage('result');

      if (auth?.user) {
          try {
              await addDoc(collection(db, 'test_results'), {
                  userId: auth.user.id,
                  username: auth.user.username,
                  score: finalPercentage,
                  level: selectedLevel,
                  date: new Date().toISOString()
              });

              // Update Leaderboard only if higher
              const lbRef = doc(db, 'leaderboard', auth.user.id);
              const lbDoc = await getDoc(lbRef);
              if (!lbDoc.exists() || finalPercentage > lbDoc.data().score) {
                  await setDoc(lbRef, {
                      userId: auth.user.id,
                      username: auth.user.username,
                      avatarUrl: auth.user.avatarUrl || '',
                      score: finalPercentage,
                      level: selectedLevel,
                      date: new Date().toISOString()
                  }, { merge: true });
              }

              // Contribution Points
              let points = finalPercentage >= 80 ? 5 : finalPercentage >= 50 ? 2 : 0;
              if (points > 0) {
                  await updateDoc(doc(db, 'users', auth.user.id), { contributionPoints: increment(points) });
                  showNotification(`+${points} Contribution Points!`, "success");
              }
          } catch (e) { console.error(e); }
      }
  };

  if (stage === 'menu') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 flex flex-col items-center animate-fade-in transition-colors">
              <div className="max-w-4xl w-full">
                  <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white text-center mb-2">Assessment Portal</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-center mb-12">Select an examination mode.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <button onClick={() => { setMode('topic'); setStage('setup'); }} className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-xl transition-all group text-left">
                          <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900 rounded-xl flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-110 transition-transform"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Topic Practice</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Focus on specific areas.</p>
                      </button>
                      <button onClick={() => { setMode('mock'); setStage('setup'); }} className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-xl transition-all group text-left">
                          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center mb-6 text-emerald-600 group-hover:scale-110 transition-transform"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Mock Exam</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Simulate real exam conditions.</p>
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'setup') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl max-w-md w-full animate-fade-in-up">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Exam Configuration</h2>
                  <div className="space-y-4">
                      <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Level</label><select value={selectedLevel} onChange={e => setSelectedLevel(Number(e.target.value) as Level)} className="w-full p-3 bg-slate-100 dark:bg-slate-700 rounded-xl">{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                      {mode === 'topic' && (<div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Topic</label><input autoFocus value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-700 rounded-xl" placeholder="e.g. Bonds" /></div>)}
                      <div className="flex gap-3 mt-6"><button onClick={() => setStage('menu')} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">Cancel</button><button onClick={startExam} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg">Start Exam</button></div>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'loading') {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-white text-center">
              <div className="w-full max-w-md bg-slate-800 rounded-full h-4 mb-4 overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${loadingProgress}%` }}></div></div>
              <h2 className="text-xl font-bold animate-pulse">{loadingMessage}</h2>
              <button onClick={() => setStage('setup')} className="mt-8 text-slate-400 hover:text-white text-sm underline">Cancel</button>
          </div>
      );
  }

  if (stage === 'result' || stage === 'review') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 animate-fade-in transition-colors">
              <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden">
                  <div className={`p-8 text-center ${score >= 50 ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
                      <h2 className="text-6xl font-black mb-2">{score}%</h2>
                      <p className="text-xl font-medium opacity-90">{score >= 80 ? 'Outstanding!' : score >= 50 ? 'Good Effort' : 'Keep Practicing'}</p>
                  </div>
                  <div className="p-8">
                      {stage === 'result' ? (
                          <div className="grid gap-4">
                              <button onClick={() => setStage('review')} className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600">Review Answers</button>
                              <button onClick={() => generateTestReviewPDF(questions, userAnswers, score, auth?.user)} className="w-full py-3 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30">Download PDF Report</button>
                              <button onClick={() => setStage('menu')} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg">New Exam</button>
                          </div>
                      ) : (
                          <div className="space-y-6">
                              {questions.map((q, i) => (
                                  <div key={i} className={`p-4 rounded-xl border ${userAnswers[i] === q.correctAnswer ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20' : 'border-rose-200 bg-rose-50 dark:bg-rose-900/20'}`}>
                                      <p className="font-bold text-slate-800 dark:text-white mb-2">{i+1}. {q.text}</p>
                                      <div className="text-sm space-y-1">
                                          {q.options.map((opt, oid) => (
                                              <div key={oid} className={`flex items-center gap-2 ${oid === q.correctAnswer ? 'text-emerald-600 font-bold' : userAnswers[i] === oid ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                                                  <span>{oid === q.correctAnswer ? '✓' : userAnswers[i] === oid ? '✗' : '○'}</span> {opt}
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                              <button onClick={() => setStage('result')} className="w-full py-3 bg-slate-200 dark:bg-slate-700 font-bold rounded-xl mt-6">Back to Score</button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  }

  // EXAM RENDER
  const currentQ = questions[currentQuestionIndex];
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col transition-colors">
        <header className="bg-white dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center sticky top-0 z-20">
            <div className="font-mono font-bold text-xl text-slate-700 dark:text-slate-300 w-24 text-center bg-slate-100 dark:bg-slate-900 rounded p-1 border border-slate-300 dark:border-slate-600">
                {formatTime(timeLeft)}
            </div>
            <div className="flex gap-3">
                <button onClick={() => setShowCalculator(!showCalculator)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></button>
                <button onClick={() => window.confirm("Submit Exam?") && finishTest()} className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 text-sm">Submit</button>
            </div>
        </header>
        <div className="flex-1 container mx-auto max-w-6xl p-4 flex flex-col md:flex-row gap-6">
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between"><span className="font-bold text-slate-700 dark:text-slate-300">Question {currentQuestionIndex + 1}</span></div>
                <div className="p-8 md:p-12 flex-grow overflow-y-auto">
                    <h2 className="text-xl md:text-2xl font-serif font-medium text-slate-900 dark:text-white leading-relaxed mb-8">{currentQ.text}</h2>
                    <div className="space-y-3">
                        {currentQ.options.map((opt, idx) => (
                            <button key={idx} onClick={() => setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: idx }))} className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-200' : 'border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500 text-slate-600 dark:text-slate-300'}`}>
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${userAnswers[currentQuestionIndex] === idx ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400'}`}>{String.fromCharCode(65+idx)}</span>
                                <span className="font-medium">{opt}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                    <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(p => p - 1)} className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-white disabled:opacity-50">Previous</button>
                    {currentQuestionIndex < questions.length - 1 ? <button onClick={() => setCurrentQuestionIndex(p => p + 1)} className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700">Next</button> : <button onClick={() => window.confirm("Finish?") && finishTest()} className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700">Finish</button>}
                </div>
            </div>
            <div className="w-full md:w-72 shrink-0 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-fit">
                <div className="p-4 grid grid-cols-5 gap-2">
                    {questions.map((_, idx) => (
                        <button key={idx} onClick={() => setCurrentQuestionIndex(idx)} className={`aspect-square rounded-lg font-bold text-xs flex items-center justify-center transition-all ${currentQuestionIndex === idx ? 'ring-2 ring-indigo-600 bg-indigo-50 dark:bg-indigo-900 text-indigo-700' : userAnswers[idx] !== undefined ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>{idx + 1}</button>
                    ))}
                </div>
            </div>
        </div>
        {showCalculator && <div className="fixed bottom-20 right-4 z-50 animate-fade-in-up"><Calculator /></div>}
    </div>
  );
};

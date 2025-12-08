
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
import { trackAiUsage } from '../utils/api';

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

const FALLBACK_QUESTIONS: Question[] = [
    { id: 101, text: "Which of the following is NOT a capital budgeting technique?", options: ["Net Present Value (NPV)", "Internal Rate of Return (IRR)", "Depreciation Method", "Payback Period"], correctAnswer: 2 },
    { id: 102, text: "What is the primary goal of financial management?", options: ["Maximize profits", "Maximize shareholder wealth", "Minimize costs", "Maximize market share"], correctAnswer: 1 },
    { id: 103, text: "Which market deals with long-term finance?", options: ["Money Market", "Capital Market", "Forex Market", "Commodity Market"], correctAnswer: 1 },
    { id: 104, text: "The beta of the market portfolio is:", options: ["0", "1", "-1", "Infinite"], correctAnswer: 1 },
    { id: 105, text: "Which of these is a source of short-term finance?", options: ["Equity Shares", "Debentures", "Trade Credit", "Preference Shares"], correctAnswer: 2 },
];

export const TestPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  
  const [stage, setStage] = useState<'menu' | 'setup' | 'loading' | 'exam' | 'result' | 'review'>('menu');
  const [mode, setMode] = useState<'topic' | 'mock' | 'game'>('topic');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showCalculator, setShowCalculator] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing Session...');
  
  // Game Mode State
  const [gameScore, setGameScore] = useState(0);
  const [gameLives, setGameLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  
  const [topic, setTopic] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<Level>(auth?.user?.level || 100);
  
  const [score, setScore] = useState(0);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes default
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
      if (stage === 'exam') {
          // Start Timer
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
  }, [stage]);

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

    const progressInterval = setInterval(() => {
        setLoadingProgress(prev => (prev >= 95 ? 95 : prev + Math.floor(Math.random() * 12) + 1));
    }, 500);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        let prompt = "";
        let qCount = 20;
        
        if (mode === 'topic') {
            prompt = `Generate a JSON Array of 20 challenging multiple-choice questions for ${selectedLevel} Level Finance students specifically on the topic: "${topic}". 
            Format: [{"id": 1, "text": "Question?", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. 
            Strictly JSON. No Markdown. Ensure exactly 20 questions.`;
        } else if (mode === 'mock') {
            prompt = `Generate a JSON Array of 30 standard exam questions for ${selectedLevel} Level Finance students covering various finance topics. 
            Format: [{"id": 1, "text": "Question?", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. 
            Strictly JSON. No Markdown. Ensure exactly 30 questions.`;
            qCount = 30;
        } else if (mode === 'game') {
            prompt = `Generate a JSON Array of 50 rapid-fire finance trivia questions. Short and punchy.
            Format: [{"id": 1, "text": "Question?", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. 
            Strictly JSON.`;
            qCount = 50;
        }

        const aiPromise = ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                // Ensure strict JSON Schema to avoid the "1 question" bug
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.INTEGER },
                            text: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            correctAnswer: { type: Type.INTEGER }
                        },
                        required: ["text", "options", "correctAnswer"]
                    }
                }
            }
        });

        const response: any = await Promise.race([
            aiPromise, 
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 20000))
        ]);
        
        clearInterval(progressInterval);
        setLoadingProgress(100);

        // Track Usage
        trackAiUsage();

        const jsonText = response.text;
        // Clean markdown if present (though schema should prevent it)
        const cleanJson = jsonText.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanJson);

        if (Array.isArray(data) && data.length > 0) {
            setQuestions(data.map((q: any, idx: number) => ({
                id: idx,
                text: q.text,
                options: q.options,
                correctAnswer: q.correctAnswer
            })));
            
            // Set Timer based on mode
            if (mode === 'topic') setTimeLeft(20 * 60); // 20 mins
            else if (mode === 'mock') setTimeLeft(40 * 60); // 40 mins
            else if (mode === 'game') setTimeLeft(30); // 30s per question (reset per question)

            setTimeout(() => {
                setStage('exam');
                setCurrentQuestionIndex(0);
                setUserAnswers({});
                if (mode === 'game') {
                    setGameLives(3);
                    setGameScore(0);
                    setIsGameOver(false);
                }
            }, 500);
        } else { throw new Error("Invalid question format received"); }

    } catch (e: any) {
        clearInterval(progressInterval);
        console.warn("AI Generation failed:", e);
        setLoadingMessage('AI Busy. Loading Offline Pack...');
        setTimeout(() => {
            // Duplicate fallback questions to make a reasonable set if AI fails
            const expandedFallback = [...FALLBACK_QUESTIONS, ...FALLBACK_QUESTIONS, ...FALLBACK_QUESTIONS].map((q, i) => ({...q, id: i}));
            setQuestions(expandedFallback);
            setTimeLeft(600);
            setStage('exam');
            setCurrentQuestionIndex(0);
            setUserAnswers({});
        }, 1500);
    }
  };

  const handleGameAnswer = (answerIndex: number) => {
      const currentQ = questions[currentQuestionIndex];
      const isCorrect = answerIndex === currentQ.correctAnswer;
      
      setUserAnswers(prev => ({...prev, [currentQuestionIndex]: answerIndex}));

      if (isCorrect) {
          setGameScore(prev => prev + 10);
          showNotification("Correct! +10 Pts", "success");
          
          if (currentQuestionIndex < questions.length - 1) {
              setTimeout(() => {
                  setCurrentQuestionIndex(prev => prev + 1);
                  setTimeLeft(30); // Reset timer for next question
              }, 500);
          } else {
              handleGameOver(true);
          }
      } else {
          setGameLives(prev => prev - 1);
          showNotification("Wrong!", "error");
          if (gameLives <= 1) {
              handleGameOver();
          } else {
              if (currentQuestionIndex < questions.length - 1) {
                  setTimeout(() => {
                      setCurrentQuestionIndex(prev => prev + 1);
                      setTimeLeft(30);
                  }, 500);
              }
          }
      }
  };

  const handleGameOver = (win: boolean = false) => {
      setIsGameOver(true);
      setStage('result');
      // Save game score logic here if needed
  };

  const finishTest = async () => {
      let s = 0;
      questions.forEach((q, idx) => {
          if (userAnswers[idx] === q.correctAnswer) s++;
      });
      const finalPercentage = Math.round((s / questions.length) * 100);
      setScore(finalPercentage);
      setStage('result');

      if (auth?.user && mode !== 'game') {
          try {
              await addDoc(collection(db, 'test_results'), {
                  userId: auth.user.id,
                  username: auth.user.username,
                  score: finalPercentage,
                  level: selectedLevel,
                  mode: mode,
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

  // --- RENDERERS ---

  if (stage === 'menu') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 flex flex-col items-center animate-fade-in transition-colors">
              <div className="max-w-5xl w-full">
                  <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white text-center mb-2">Practice Center</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-center mb-12">Choose your preferred mode of study.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div onClick={() => { setMode('topic'); setStage('setup'); }} className="cursor-pointer bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-xl transition-all group relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><svg className="w-32 h-32 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
                          <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform relative z-10">
                              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 relative z-10">Topic Focused</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm relative z-10">Master a specific subject. AI generates tailored questions.</p>
                      </div>

                      <div onClick={() => { setMode('mock'); setStage('setup'); }} className="cursor-pointer bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-xl transition-all group relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><svg className="w-32 h-32 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg></div>
                          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform relative z-10">
                              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 relative z-10">Standard Mock</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm relative z-10">30 Questions. 40 Minutes. Simulates real exam conditions.</p>
                      </div>

                      <div onClick={() => { setMode('game'); setStage('setup'); }} className="cursor-pointer bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:shadow-xl transition-all group relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><svg className="w-32 h-32 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/50 rounded-2xl flex items-center justify-center mb-6 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform relative z-10">
                              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 relative z-10">Trivia Challenge</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm relative z-10">Rapid fire questions. 3 lives. High score wins.</p>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'setup') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl max-w-md w-full animate-fade-in-up border border-slate-100 dark:border-slate-700">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Setup Session</h2>
                  <div className="space-y-5">
                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Select Level</label>
                          <select value={selectedLevel} onChange={e => setSelectedLevel(Number(e.target.value) as Level)} className="w-full p-4 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-200 dark:border-slate-600 font-bold">
                              {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
                          </select>
                      </div>
                      
                      {mode === 'topic' && (
                          <div>
                              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Focus Topic</label>
                              <input 
                                autoFocus 
                                value={topic} 
                                onChange={e => setTopic(e.target.value)} 
                                className="w-full p-4 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-200 dark:border-slate-600" 
                                placeholder="e.g. Capital Budgeting, Bonds..." 
                              />
                          </div>
                      )}

                      <div className="pt-4 flex gap-3">
                          <button onClick={() => setStage('menu')} className="flex-1 py-3.5 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Back</button>
                          <button onClick={startExam} className="flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02]">
                              Start {mode === 'game' ? 'Game' : 'Exam'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'loading') {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-white text-center">
              <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">{loadingProgress}%</div>
              </div>
              <h2 className="text-xl font-bold animate-pulse mb-2">{loadingMessage}</h2>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">Our AI is crafting a unique set of questions for you. This ensures no two tests are the same.</p>
              <button onClick={() => setStage('setup')} className="mt-8 px-6 py-2 border border-slate-700 rounded-full text-xs font-bold hover:bg-slate-800 transition-colors">Cancel</button>
          </div>
      );
  }

  if (stage === 'result' || stage === 'review') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 animate-fade-in transition-colors">
              <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div className={`p-10 text-center ${mode === 'game' ? 'bg-amber-600' : score >= 50 ? 'bg-emerald-600' : 'bg-rose-600'} text-white relative overflow-hidden`}>
                      <div className="relative z-10">
                          <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">{mode === 'game' ? 'Game Over' : 'Test Complete'}</p>
                          <h2 className="text-7xl font-black mb-2 tracking-tighter">{mode === 'game' ? gameScore : `${score}%`}</h2>
                          <p className="text-xl font-medium opacity-90">
                              {mode === 'game' 
                                  ? `You reached Question ${currentQuestionIndex + 1}` 
                                  : score >= 80 ? 'Outstanding Performance!' : score >= 50 ? 'Good Effort, Keep Pushing!' : 'Don\'t give up, try again!'}
                          </p>
                      </div>
                      {/* Background Pattern */}
                      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                  </div>
                  
                  <div className="p-8">
                      {stage === 'result' ? (
                          <div className="grid gap-4">
                              {mode !== 'game' && <button onClick={() => setStage('review')} className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2">Review Answers</button>}
                              {mode !== 'game' && <button onClick={() => generateTestReviewPDF(questions, userAnswers, score, auth?.user)} className="w-full py-4 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">Download Report PDF</button>}
                              <button onClick={() => setStage('menu')} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                  Play Again
                              </button>
                          </div>
                      ) : (
                          <div className="space-y-6">
                              <h3 className="font-bold text-xl mb-4 text-slate-800 dark:text-white border-b pb-2 dark:border-slate-700">Answer Review</h3>
                              {questions.map((q, i) => (
                                  <div key={i} className={`p-5 rounded-2xl border-2 ${userAnswers[i] === q.correctAnswer ? 'border-emerald-100 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900/50' : 'border-rose-100 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-900/50'}`}>
                                      <div className="flex gap-3 mb-3">
                                          <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white ${userAnswers[i] === q.correctAnswer ? 'bg-emerald-500' : 'bg-rose-500'}`}>{i + 1}</span>
                                          <p className="font-bold text-slate-800 dark:text-white text-sm">{q.text}</p>
                                      </div>
                                      <div className="pl-9 text-xs space-y-2">
                                          {q.options.map((opt, oid) => (
                                              <div key={oid} className={`p-2 rounded-lg flex items-center gap-2 ${oid === q.correctAnswer ? 'bg-emerald-200 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-300 font-bold' : userAnswers[i] === oid ? 'bg-rose-200 dark:bg-rose-900/40 text-rose-900 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                                  <span>{oid === q.correctAnswer ? '✓' : userAnswers[i] === oid ? '✗' : '○'}</span> 
                                                  <span>{opt}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                              <button onClick={() => setStage('result')} className="w-full py-3 bg-slate-200 dark:bg-slate-700 font-bold rounded-xl mt-6 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Back to Score</button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  }

  // GAME MODE RENDER
  if (mode === 'game' && stage === 'exam') {
      const currentQ = questions[currentQuestionIndex];
      return (
          <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
              
              <div className="relative z-10 w-full max-w-2xl">
                  {/* Game Stats Bar */}
                  <div className="flex justify-between items-center mb-8 bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                      <div className="flex gap-1">
                          {[...Array(3)].map((_, i) => (
                              <svg key={i} className={`w-6 h-6 ${i < gameLives ? 'text-rose-500' : 'text-slate-700'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                          ))}
                      </div>
                      <div className="text-2xl font-black text-amber-400 tracking-wider">{gameScore} PTS</div>
                      <div className={`text-xl font-mono font-bold ${timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</div>
                  </div>

                  {/* Question Card */}
                  <div className="bg-slate-800 rounded-3xl p-8 shadow-2xl border-b-8 border-slate-950 mb-6 relative animate-fade-in-up">
                      <div className="absolute -top-4 -left-4 bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-lg rotate-3">{currentQuestionIndex + 1}</div>
                      <h2 className="text-xl md:text-2xl font-bold leading-relaxed mb-2">{currentQ.text}</h2>
                  </div>

                  {/* Options Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentQ.options.map((opt, idx) => (
                          <button 
                              key={idx} 
                              onClick={() => handleGameAnswer(idx)}
                              className="bg-white text-slate-900 p-4 rounded-xl font-bold text-left hover:bg-indigo-50 hover:scale-[1.02] active:scale-95 transition-all shadow-lg border-b-4 border-slate-300"
                          >
                              <span className="text-indigo-600 mr-2">{String.fromCharCode(65+idx)}.</span> {opt}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      );
  }

  // STANDARD EXAM RENDER
  const currentQ = questions[currentQuestionIndex];
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col transition-colors">
        <header className="bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="hidden md:block">
                    <h1 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider">{mode === 'topic' ? 'Topic Practice' : 'Mock Exam'}</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Level {selectedLevel}</p>
                </div>
                <div className={`font-mono font-bold text-xl px-4 py-1 rounded-lg border-2 ${timeLeft < 60 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'}`}>
                    {formatTime(timeLeft)}
                </div>
            </div>
            <div className="flex gap-3">
                <button onClick={() => setShowCalculator(!showCalculator)} className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors" title="Calculator">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </button>
                <button onClick={() => window.confirm("Are you sure you want to submit your exam?") && finishTest()} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 text-sm shadow-md transition-transform hover:-translate-y-0.5">Submit</button>
            </div>
        </header>

        <div className="flex-1 container mx-auto max-w-7xl p-4 flex flex-col lg:flex-row gap-6 h-[calc(100vh-80px)]">
            {/* Question Area */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800">
                    <span className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">Question {currentQuestionIndex + 1} of {questions.length}</span>
                    <span className="text-xs font-bold px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">Single Choice</span>
                </div>
                
                <div className="p-8 md:p-12 flex-grow overflow-y-auto">
                    <h2 className="text-xl md:text-2xl font-medium text-slate-900 dark:text-white leading-relaxed mb-8">{currentQ.text}</h2>
                    <div className="space-y-4 max-w-3xl">
                        {currentQ.options.map((opt, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: idx }))} 
                                className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-5 group ${userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-md ring-1 ring-indigo-600' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold border transition-colors ${userAnswers[currentQuestionIndex] === idx ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 group-hover:border-indigo-400'}`}>
                                    {String.fromCharCode(65+idx)}
                                </span>
                                <span className={`font-medium text-base ${userAnswers[currentQuestionIndex] === idx ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-between bg-slate-50 dark:bg-slate-900/50">
                    <button 
                        disabled={currentQuestionIndex === 0} 
                        onClick={() => setCurrentQuestionIndex(p => p - 1)} 
                        className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Previous
                    </button>
                    {currentQuestionIndex < questions.length - 1 ? (
                        <button 
                            onClick={() => setCurrentQuestionIndex(p => p + 1)} 
                            className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
                        >
                            Next Question
                        </button>
                    ) : (
                        <button 
                            onClick={() => window.confirm("Finish Exam?") && finishTest()} 
                            className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                        >
                            Finish Exam
                        </button>
                    )}
                </div>
            </div>

            {/* Sidebar Navigation */}
            <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4 h-full">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex-grow overflow-y-auto">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-sm uppercase tracking-wide">Question Navigator</h3>
                    <div className="grid grid-cols-5 gap-3">
                        {questions.map((_, idx) => {
                            const isAnswered = userAnswers[idx] !== undefined;
                            const isCurrent = currentQuestionIndex === idx;
                            return (
                                <button 
                                    key={idx} 
                                    onClick={() => setCurrentQuestionIndex(idx)} 
                                    className={`aspect-square rounded-xl font-bold text-xs flex items-center justify-center transition-all shadow-sm
                                        ${isCurrent ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 dark:ring-indigo-700 scale-110 z-10' : 
                                          isAnswered ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800' : 
                                          'bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400 hover:bg-slate-100'}`}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 p-4 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-800 dark:text-blue-200">Pro Tip</p>
                            <p className="text-[10px] text-blue-600 dark:text-blue-300 leading-tight">Flag difficult questions and come back to them later.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {showCalculator && <div className="fixed bottom-24 right-6 z-50 animate-fade-in-up origin-bottom-right"><Calculator /></div>}
    </div>
  );
};

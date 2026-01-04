import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleGenAI, Type } from "@google/genai";
import { useNotification } from '../contexts/NotificationContext';
import { db } from '../firebase';
import { collection, addDoc, getDoc, setDoc, updateDoc, increment, doc } from 'firebase/firestore';
import { LEVELS } from '../constants';
import { Level } from '../types';
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

// In-Game Feedback State for non-blocking notifications
interface GameFeedback {
    status: 'correct' | 'wrong';
    correctIndex: number;
}

// Utility function to shuffle an array and pick a certain number of items
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
  
  // Calculator State
  const [showCalculator, setShowCalculator] = useState(false);

  // Game Mode State
  const [gameScore, setGameScore] = useState(0);
  const [gameLives, setGameLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameFeedback, setGameFeedback] = useState<GameFeedback | null>(null);
  
  const [topic, setTopic] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<Level>(auth?.user?.level || 100);
  
  const [score, setScore] = useState(0);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes default
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
      if (stage === 'exam' && !isGameOver) {
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

    const progressInterval = setInterval(() => {
        setLoadingProgress(prev => (prev >= 95 ? 95 : prev + Math.floor(Math.random() * 12) + 1));
    }, 500);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        let prompt = "";
        
        if (mode === 'topic') {
            prompt = `Generate a JSON Array of 20 challenging multiple-choice questions for ${selectedLevel} Level Finance students specifically on the topic: "${topic}". 
            Format: [{"id": 1, "text": "Question?", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. 
            Strictly JSON. No Markdown. Ensure exactly 20 questions.`;
        } else if (mode === 'mock') {
            prompt = `Generate a JSON Array of 30 standard exam questions for ${selectedLevel} Level Finance students covering various finance topics. 
            Format: [{"id": 1, "text": "Question?", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. 
            Strictly JSON. No Markdown. Ensure exactly 30 questions.`;
        } else if (mode === 'game') {
            prompt = `Generate a JSON Array of 50 rapid-fire finance trivia questions. Short and punchy.
            Format: [{"id": 1, "text": "Question?", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. 
            Strictly JSON.`;
        }

        const aiPromise = ai.models.generateContent({
            model: 'gemini-3-flash-preview', // Use Flash for better quota
            contents: prompt,
            config: {
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
            else if (mode === 'game') setTimeLeft(30); // 30s per question

            setTimeout(() => {
                setStage('exam');
                setCurrentQuestionIndex(0);
                setUserAnswers({});
                if (mode === 'game') {
                    setGameLives(3);
                    setGameScore(0);
                    setIsGameOver(false);
                    setGameFeedback(null);
                }
            }, 500);
        } else { throw new Error("Invalid question format received"); }

    } catch (e: any) {
        clearInterval(progressInterval);
        console.warn("AI Generation failed:", e);
        showNotification("AI generation failed. Loading standard question pack instead.", "warning");
        setLoadingMessage('AI Unavailable. Loading Standard Exam...');
        
        setTimeout(() => {
            const numQuestions = mode === 'mock' ? 30 : mode === 'game' ? 50 : 20;
            const questionsToUse = shuffleAndPick(fallbackQuestions, numQuestions);

            setQuestions(questionsToUse.map((q, i) => ({
                id: i,
                text: q.text,
                options: q.options,
                correctAnswer: q.correctAnswer
            })));

            setTimeLeft(mode === 'mock' ? 40 * 60 : 20 * 60); // Standard times for fallback
            setStage('exam');
            setCurrentQuestionIndex(0);
            setUserAnswers({});
            if (mode === 'game') {
                setGameLives(3);
                setGameScore(0);
                setIsGameOver(false);
                setGameFeedback(null);
                setTimeLeft(30);
            }
        }, 1500);
    }
  };

  const handleGameAnswer = (answerIndex: number) => {
      // Prevent multiple clicks while feedback is showing
      if (gameFeedback) return;

      const currentQ = questions[currentQuestionIndex];
      const isCorrect = answerIndex === currentQ.correctAnswer;
      
      setUserAnswers(prev => ({...prev, [currentQuestionIndex]: answerIndex}));

      // Show temporary visual feedback inside the game
      setGameFeedback({
          status: isCorrect ? 'correct' : 'wrong',
          correctIndex: currentQ.correctAnswer
      });

      if (isCorrect) {
          setGameScore(prev => prev + 10);
      } else {
          setGameLives(prev => prev - 1);
      }

      // Auto-advance after delay
      setTimeout(() => {
          setGameFeedback(null);
          
          if (!isCorrect && gameLives <= 1) {
              handleGameOver();
          } else if (currentQuestionIndex < questions.length - 1) {
              setCurrentQuestionIndex(prev => prev + 1);
              setTimeLeft(30); // Reset timer for next question
          } else {
              handleGameOver(true);
          }
      }, 1000); // 1 second delay
  };

  const handleGameOver = (win: boolean = false) => {
      setIsGameOver(true);
      if (timerRef.current) clearInterval(timerRef.current);
      setStage('result');
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
              // 1. Add to Test History (Always)
              await addDoc(collection(db, 'test_results'), {
                  userId: auth.user.id,
                  username: auth.user.username,
                  score: finalPercentage,
                  totalQuestions: questions.length,
                  level: selectedLevel,
                  mode: mode,
                  date: new Date().toISOString()
              });

              // 2. Update High Score Leaderboard (Only if better)
              const lbRef = doc(db, 'leaderboard', auth.user.id);
              const lbDoc = await getDoc(lbRef);
              
              let currentBest = 0;
              if (lbDoc.exists()) {
                  currentBest = lbDoc.data().score || 0;
              }

              // Overwrite only if new score is higher
              if (finalPercentage > currentBest) {
                  await setDoc(lbRef, {
                      userId: auth.user.id,
                      username: auth.user.username,
                      avatarUrl: auth.user.avatarUrl || '',
                      score: finalPercentage,
                      level: selectedLevel,
                      date: new Date().toISOString()
                  }, { merge: true });
                  showNotification("New High Score saved to Leaderboard!", "success");
              }

              // 3. Contribution Points (Additive)
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
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-16 px-4 flex flex-col items-center animate-fade-in transition-colors">
              <div className="max-w-6xl w-full">
                  <div className="text-center mb-16">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-xs uppercase mb-3 block">Finance Department CBT</span>
                      <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white mb-4">Practice Center</h1>
                      <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
                          Sharpen your financial acumen with AI-powered assessments. Choose your preferred mode to begin.
                      </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Mode 1: Topic */}
                      <button 
                        onClick={() => { setMode('topic'); setStage('setup'); }} 
                        className="group relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-700 hover:-translate-y-2 overflow-hidden text-left"
                      >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-[100px] transition-transform group-hover:scale-110"></div>
                          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors relative z-10">
                              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 relative z-10">Topic Mastery</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed relative z-10">
                              Generate specific questions on any finance topic using AI. Perfect for focused revision.
                          </p>
                      </button>

                      {/* Mode 2: Mock */}
                      <button 
                        onClick={() => { setMode('mock'); setStage('setup'); }} 
                        className="group relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-700 hover:-translate-y-2 overflow-hidden text-left"
                      >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-[100px] transition-transform group-hover:scale-110"></div>
                          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors relative z-10">
                              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 relative z-10">Standard Mock</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed relative z-10">
                              Simulate real exam conditions. 30 questions, 40 minutes. Test your overall readiness.
                          </p>
                      </button>

                      {/* Mode 3: Game */}
                      <button 
                        onClick={() => { setMode('game'); setStage('setup'); }} 
                        className="group relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-700 hover:-translate-y-2 overflow-hidden text-left"
                      >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-[100px] transition-transform group-hover:scale-110"></div>
                          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-6 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors relative z-10">
                              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 relative z-10">Trivia Challenge</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed relative z-10">
                              Rapid-fire questions with a timer. 3 lives. Compete for the high score on the leaderboard.
                          </p>
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'setup') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl max-w-md w-full animate-fade-in-up border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3 mb-6">
                      <button onClick={() => setStage('menu')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                      </button>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Configure {mode === 'game' ? 'Game' : 'Exam'}</h2>
                  </div>
                  
                  <div className="space-y-6">
                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Academic Level</label>
                          <select value={selectedLevel} onChange={e => setSelectedLevel(Number(e.target.value) as Level)} className="w-full p-4 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-200 dark:border-slate-600 font-bold text-lg">
                              {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
                          </select>
                      </div>
                      
                      {mode === 'topic' && (
                          <div>
                              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Focus Topic</label>
                              <input 
                                autoFocus 
                                value={topic} 
                                onChange={e => setTopic(e.target.value)} 
                                className="w-full p-4 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-200 dark:border-slate-600 text-lg" 
                                placeholder="e.g. Capital Budgeting..." 
                              />
                          </div>
                      )}

                      <button onClick={startExam} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 mt-4">
                          <span>Start Session</span>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'loading') {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-white text-center">
              <div className="relative w-32 h-32 mb-8">
                  <svg className="w-full h-full animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">{loadingProgress}%</div>
              </div>
              <h2 className="text-2xl font-bold animate-pulse mb-3">{loadingMessage}</h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">Our AI is generating a unique question set tailored to your level. Please wait...</p>
              <button onClick={() => setStage('setup')} className="mt-10 px-6 py-2 border border-slate-700 rounded-full text-xs font-bold hover:bg-slate-800 transition-colors">Cancel</button>
          </div>
      );
  }

  if (stage === 'exam') {
      const currentQ = questions[currentQuestionIndex];
      const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

      if (mode === 'game') {
          return (
              <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
                  <div className="w-full max-w-lg">
                      <div className="flex justify-between items-center mb-6">
                          <div className="flex items-center gap-2 text-white">
                              <span className="text-xl">❤️</span>
                              <span className="font-bold text-xl">{gameLives}</span>
                          </div>
                          <div className="text-center">
                              <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Score</p>
                              <p className="text-2xl font-black text-amber-400">{gameScore}</p>
                          </div>
                          <div className="bg-slate-800 px-4 py-2 rounded-full border border-slate-700 text-indigo-400 font-mono font-bold">
                              {formatTime(timeLeft)}
                          </div>
                      </div>

                      <div className="relative bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border-4 border-slate-100 dark:border-slate-700">
                          {/* Feedback Overlay */}
                          {gameFeedback && (
                              <div className={`absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm rounded-2xl ${gameFeedback.status === 'correct' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                                  <div className={`transform scale-125 transition-transform font-black text-4xl ${gameFeedback.status === 'correct' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                      {gameFeedback.status === 'correct' ? 'CORRECT!' : 'WRONG!'}
                                  </div>
                              </div>
                          )}

                          <div className="mb-6">
                              <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white leading-relaxed">{currentQ.text}</h2>
                          </div>

                          <div className="space-y-3">
                              {currentQ.options.map((opt, idx) => {
                                  let btnClass = "w-full p-4 text-left rounded-xl border-2 font-bold transition-all transform hover:scale-[1.02] ";
                                  
                                  if (gameFeedback) {
                                      if (idx === gameFeedback.correctIndex) btnClass += "bg-emerald-500 border-emerald-600 text-white";
                                      else if (idx === userAnswers[currentQuestionIndex] && idx !== gameFeedback.correctIndex) btnClass += "bg-rose-500 border-rose-600 text-white";
                                      else btnClass += "bg-slate-100 dark:bg-slate-700 border-transparent opacity-50";
                                  } else {
                                      btnClass += "bg-slate-100 dark:bg-slate-700 border-transparent hover:bg-indigo-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200";
                                  }

                                  return (
                                      <button 
                                          key={idx} 
                                          onClick={() => handleGameAnswer(idx)} 
                                          className={btnClass}
                                          disabled={!!gameFeedback}
                                      >
                                          {opt}
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
              </div>
          );
      }

      // Standard Exam Mode
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row transition-colors">
              {/* Left Sidebar (Question Nav) */}
              <div className="w-full md:w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex-shrink-0 flex flex-col h-auto md:h-screen">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                      <h1 className="font-bold text-slate-900 dark:text-white text-lg">CBT Session</h1>
                      <div className="mt-4 flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-3 rounded-lg">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">TIME LEFT</span>
                          <span className={`font-mono font-bold text-xl ${timeLeft < 300 ? 'text-rose-500 animate-pulse' : 'text-slate-800 dark:text-white'}`}>{formatTime(timeLeft)}</span>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4">
                      <div className="grid grid-cols-5 gap-2">
                          {questions.map((_, i) => (
                              <button
                                  key={i}
                                  onClick={() => setCurrentQuestionIndex(i)}
                                  className={`aspect-square rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                                      currentQuestionIndex === i ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-800' : ''
                                  } ${
                                      userAnswers[i] !== undefined ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                                  }`}
                              >
                                  {i + 1}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                      <button onClick={() => setShowCalculator(!showCalculator)} className="w-full py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded hover:bg-slate-200 dark:hover:bg-slate-600">
                          {showCalculator ? 'Hide Calculator' : 'Show Calculator'}
                      </button>
                      <button onClick={finishTest} className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors">
                          Submit Exam
                      </button>
                  </div>
              </div>

              {/* Main Area */}
              <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                  {showCalculator && (
                      <div className="absolute top-4 right-4 z-50">
                          <Calculator />
                      </div>
                  )}

                  <div className="h-1 bg-slate-200 dark:bg-slate-700">
                      <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-32">
                      <div className="max-w-3xl mx-auto">
                          <div className="mb-8">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question {currentQuestionIndex + 1} of {questions.length}</span>
                              <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white mt-4 leading-relaxed">
                                  {currentQ.text}
                              </h2>
                          </div>

                          <div className="space-y-4">
                              {currentQ.options.map((opt, idx) => (
                                  <label 
                                      key={idx} 
                                      className={`flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${
                                          userAnswers[currentQuestionIndex] === idx 
                                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                      }`}
                                  >
                                      <input 
                                          type="radio" 
                                          name={`q-${currentQuestionIndex}`} 
                                          className="hidden" 
                                          checked={userAnswers[currentQuestionIndex] === idx} 
                                          onChange={() => setUserAnswers({...userAnswers, [currentQuestionIndex]: idx})} 
                                      />
                                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 ${
                                          userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600' : 'border-slate-400'
                                      }`}>
                                          {userAnswers[currentQuestionIndex] === idx && <div className="w-3 h-3 rounded-full bg-indigo-600"></div>}
                                      </div>
                                      <span className={`text-lg ${userAnswers[currentQuestionIndex] === idx ? 'font-bold text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-between items-center max-w-full">
                      <button 
                          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                          disabled={currentQuestionIndex === 0}
                          className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                          Previous
                      </button>
                      <button 
                          onClick={() => {
                              if (currentQuestionIndex === questions.length - 1) finishTest();
                              else setCurrentQuestionIndex(prev => prev + 1);
                          }}
                          className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg"
                      >
                          {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next Question'}
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'result' || stage === 'review') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 animate-fade-in transition-colors">
              <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div className={`p-12 text-center ${mode === 'game' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : score >= 50 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-red-600'} text-white relative overflow-hidden`}>
                      <div className="relative z-10">
                          <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-4">{mode === 'game' ? 'Game Over' : 'Test Complete'}</p>
                          <h2 className="text-8xl font-black mb-4 tracking-tighter drop-shadow-md">{mode === 'game' ? gameScore : `${score}%`}</h2>
                          <p className="text-2xl font-medium opacity-95">
                              {mode === 'game' 
                                  ? `You reached Question ${currentQuestionIndex + 1}` 
                                  : score >= 80 ? 'Outstanding Performance!' : score >= 50 ? 'Good Effort, Keep Pushing!' : 'Don\'t give up, try again!'}
                          </p>
                      </div>
                      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                  </div>
                  
                  <div className="p-8 md:p-12 bg-slate-50 dark:bg-slate-800/50">
                      {stage === 'result' ? (
                          <div className="grid gap-4 max-w-sm mx-auto">
                              {mode !== 'game' && <button onClick={() => setStage('review')} className="w-full py-4 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl border border-slate-200 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all shadow-sm">Review Answers</button>}
                              {mode !== 'game' && <button onClick={() => generateTestReviewPDF(questions, userAnswers, score, auth?.user)} className="w-full py-4 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl border border-slate-200 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all shadow-sm">Download PDF Report</button>}
                              <button onClick={() => setStage('menu')} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 mt-4">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                  Play Again
                              </button>
                          </div>
                      ) : (
                          <div className="space-y-8">
                              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4">
                                  <h3 className="font-bold text-2xl text-slate-800 dark:text-white">Answer Review</h3>
                                  <button onClick={() => setStage('result')} className="text-sm font-bold text-slate-500 hover:text-indigo-600">Back to Score</button>
                              </div>
                              
                              {questions.map((q, i) => (
                                  <div key={i} className={`p-6 rounded-2xl border-2 ${userAnswers[i] === q.correctAnswer ? 'border-emerald-100 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-900/50' : 'border-rose-100 bg-rose-50/50 dark:bg-rose-900/10 dark:border-rose-900/50'}`}>
                                      <div className="flex gap-4 mb-4">
                                          <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-sm ${userAnswers[i] === q.correctAnswer ? 'bg-emerald-500' : 'bg-rose-500'}`}>{i + 1}</span>
                                          <p className="font-serif text-lg text-slate-800 dark:text-white leading-relaxed">{q.text}</p>
                                      </div>
                                      <div className="pl-12 space-y-2">
                                          {q.options.map((opt, oid) => (
                                              <div key={oid} className={`p-3 rounded-xl flex items-center gap-3 text-sm ${oid === q.correctAnswer ? 'bg-emerald-100 text-emerald-800 font-bold dark:bg-emerald-900/40 dark:text-emerald-300' : userAnswers[i] === oid ? 'bg-rose-100 text-rose-800 font-bold dark:bg-rose-900/40 dark:text-rose-300' : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${oid === q.correctAnswer ? 'border-emerald-500 bg-emerald-500 text-white' : userAnswers[i] === oid ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300'}`}>
                                                      {(oid === q.correctAnswer || userAnswers[i] === oid) && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                  </div>
                                                  {opt}
                                                  {oid === q.correctAnswer && <span className="ml-auto text-xs font-bold text-emerald-600 uppercase tracking-wider">Correct Answer</span>}
                                                  {userAnswers[i] === oid && oid !== q.correctAnswer && <span className="ml-auto text-xs font-bold text-rose-600 uppercase tracking-wider">Your Answer</span>}
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  }

  return null;
};

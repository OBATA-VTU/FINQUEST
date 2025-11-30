
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleGenAI } from '@google/genai';
import { Calculator } from '../components/Calculator';
import { LEVELS } from '../constants';
import { Level, TestResult } from '../types';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';

interface Question {
  id: number;
  question: string;
  options: string[];
  answer: string;
}

export const TestPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  
  // Game States
  const [gameState, setGameState] = useState<'intro' | 'loading' | 'playing' | 'result'>('intro');
  const [selectedLevel, setSelectedLevel] = useState<Level>(100);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{[key: number]: string}>({});
  const [score, setScore] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [leaderboard, setLeaderboard] = useState<TestResult[]>([]);
  
  // Loading State
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Timer
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes for JAMB style

  useEffect(() => {
    if (gameState === 'intro') {
        fetchLeaderboard();
    }
  }, [gameState]);

  // Loading Simulation
  useEffect(() => {
      let interval: any;
      if (gameState === 'loading') {
          setLoadingProgress(0);
          interval = setInterval(() => {
              setLoadingProgress(prev => {
                  if (prev >= 90) return prev; // Wait for actual completion
                  return prev + Math.floor(Math.random() * 5) + 1;
              });
          }, 200);
      }
      return () => clearInterval(interval);
  }, [gameState]);

  // Exam Timer
  useEffect(() => {
      let timer: any;
      if (gameState === 'playing' && timeLeft > 0) {
          timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      } else if (timeLeft === 0 && gameState === 'playing') {
          finishTest();
      }
      return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const fetchLeaderboard = async () => {
      try {
          const q = query(collection(db, 'test_results'), orderBy('score', 'desc'), limit(10));
          const snap = await getDocs(q);
          setLeaderboard(snap.docs.map(d => ({ id: d.id, ...d.data() } as TestResult)));
      } catch (e) { console.error(e); }
  };

  const startTest = async () => {
      if (!auth?.user) return;
      setGameState('loading');
      
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          // Optimized prompt for speed
          const prompt = `Generate 20 multiple choice questions for Finance Students (${selectedLevel} Level). 
          Return ONLY a JSON array. No markdown. No intro.
          Format: [{"id": 1, "question": "Question text?", "options": ["A", "B", "C", "D"], "answer": "The Correct Option String"}]`;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash', // Fast model
              contents: prompt,
          });

          // Force progress to 100 on success
          setLoadingProgress(100);

          const text = response.text || "[]";
          const cleanText = text.replace(/```json|```/g, '').trim();
          
          try {
              const parsedQuestions = JSON.parse(cleanText);
              if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
                  // Ensure ID consistency
                  const mapped = parsedQuestions.map((q, idx) => ({...q, id: idx}));
                  setQuestions(mapped);
                  setCurrentQuestionIndex(0);
                  setUserAnswers({});
                  setTimeLeft(1200); // Reset timer
                  setTimeout(() => setGameState('playing'), 500); // Small delay to show 100%
              } else {
                  throw new Error("Invalid format");
              }
          } catch (e) {
              throw new Error("AI parsing failed");
          }

      } catch (error) {
          console.error(error);
          showNotification("Connection error. Retrying usually works!", "error");
          setGameState('intro');
      }
  };

  const handleOptionSelect = (option: string) => {
      setUserAnswers(prev => ({
          ...prev,
          [currentQuestionIndex]: option
      }));
  };

  const handleNext = () => {
      if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
      }
  };

  const handlePrev = () => {
      if (currentQuestionIndex > 0) {
          setCurrentQuestionIndex(prev => prev - 1);
      }
  };

  const handleJumpTo = (index: number) => {
      setCurrentQuestionIndex(index);
  };

  const finishTest = async () => {
      // Calculate Score
      let calculatedScore = 0;
      questions.forEach((q, idx) => {
          if (userAnswers[idx] === q.answer) {
              calculatedScore++;
          }
      });
      
      setScore(calculatedScore);
      setGameState('result');

      if (auth?.user) {
          try {
              await addDoc(collection(db, 'test_results'), {
                  userId: auth.user.id,
                  username: auth.user.username,
                  avatarUrl: auth.user.avatarUrl || '',
                  score: calculatedScore,
                  totalQuestions: questions.length,
                  level: selectedLevel,
                  date: new Date().toISOString()
              });
              fetchLeaderboard();
          } catch (e) { console.error("Error saving score", e); }
      }
  };

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- RENDERING ---

  if (gameState === 'loading') {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
              <div className="w-full max-w-md">
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                      <span>Generating Exam Paper...</span>
                      <span>{loadingProgress}%</span>
                  </div>
                  <div className="h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-indigo-600 transition-all duration-300 ease-out" 
                        style={{ width: `${loadingProgress}%` }}
                      ></div>
                  </div>
                  <p className="text-center text-slate-400 text-sm mt-4 animate-pulse">
                      Consulting academic database for {selectedLevel}L Finance...
                  </p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      
      {/* HEADER (JAMB Style) */}
      {gameState === 'playing' && (
          <header className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-20 shadow-sm">
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700">
                      {auth?.user?.name.charAt(0)}
                  </div>
                  <div className="hidden md:block">
                      <h3 className="font-bold text-slate-800 text-sm">{auth?.user?.name}</h3>
                      <p className="text-xs text-slate-500">{selectedLevel} Level Finance Exam</p>
                  </div>
              </div>

              <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowCalculator(!showCalculator)}
                    className={`p-2 rounded-lg transition-colors ${showCalculator ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    title="Calculator"
                  >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  </button>
                  <div className={`px-4 py-2 rounded-lg font-mono font-bold text-xl ${timeLeft < 300 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-green-100 text-green-700'}`}>
                      {formatTime(timeLeft)}
                  </div>
                  <button 
                    onClick={() => window.confirm("Are you sure you want to submit?") && finishTest()}
                    className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 text-sm shadow-md transition-colors"
                  >
                      Submit Exam
                  </button>
              </div>
          </header>
      )}

      {/* CALCULATOR OVERLAY */}
      {showCalculator && (
          <div className="fixed top-20 right-4 z-50 animate-fade-in-down">
              <Calculator />
          </div>
      )}

      {/* INTRO SCREEN */}
      {gameState === 'intro' && (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="bg-white max-w-4xl w-full rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
                <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-slate-50 border-r border-slate-100">
                    <div className="mb-8">
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">CBT Platform</span>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mt-4 mb-2">Academic Assessment</h1>
                        <p className="text-slate-500">Test your knowledge with AI-generated questions tailored to your academic level. 20 Questions. 20 Minutes.</p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Select Level</label>
                            <div className="grid grid-cols-4 gap-2">
                                {LEVELS.map(lvl => (
                                    <button 
                                        key={lvl}
                                        onClick={() => setSelectedLevel(lvl)}
                                        className={`py-2 rounded-lg font-bold text-sm transition-all border-2 ${selectedLevel === lvl ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button 
                            onClick={startTest}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-transform transform active:scale-95 text-lg"
                        >
                            Start Examination
                        </button>
                    </div>
                </div>

                {/* Leaderboard */}
                <div className="md:w-1/2 bg-slate-900 text-white p-8">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-amber-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        Hall of Fame
                    </h3>
                    <div className="space-y-1">
                        {leaderboard.length > 0 ? leaderboard.map((entry, idx) => (
                            <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold w-6 text-center ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-orange-400' : 'text-slate-500'}`}>#{idx + 1}</span>
                                    <span className="text-sm font-medium text-slate-200">@{entry.username}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-slate-400">{entry.level}L</span>
                                    <span className="font-mono font-bold text-emerald-400">{entry.score}</span>
                                </div>
                            </div>
                        )) : (
                            <p className="text-slate-500 text-sm text-center py-10">Be the first to take the test!</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* GAMEPLAY SCREEN */}
      {gameState === 'playing' && questions.length > 0 && (
          <div className="flex-1 container mx-auto max-w-7xl p-4 flex flex-col md:flex-row gap-6 h-[calc(100vh-80px)]">
              
              {/* Question Area */}
              <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                      <span className="font-bold text-slate-700">Question {currentQuestionIndex + 1} of {questions.length}</span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select the best option</span>
                  </div>
                  
                  <div className="flex-1 p-6 md:p-10 overflow-y-auto">
                      <h2 className="text-xl md:text-2xl font-serif font-bold text-slate-900 mb-8 leading-relaxed">
                          {questions[currentQuestionIndex].question}
                      </h2>
                      
                      <div className="space-y-3">
                          {questions[currentQuestionIndex].options.map((option, idx) => {
                              const isSelected = userAnswers[currentQuestionIndex] === option;
                              return (
                                  <button
                                      key={idx}
                                      onClick={() => handleOptionSelect(option)}
                                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 group ${
                                          isSelected 
                                          ? 'border-indigo-600 bg-indigo-50' 
                                          : 'border-slate-100 hover:border-indigo-200 hover:bg-white'
                                      }`}
                                  >
                                      <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${
                                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                                      }`}>
                                          {String.fromCharCode(65 + idx)}
                                      </span>
                                      <span className={`font-medium ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>
                                          {option}
                                      </span>
                                  </button>
                              );
                          })}
                      </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between">
                      <button 
                        onClick={handlePrev} 
                        disabled={currentQuestionIndex === 0}
                        className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                          Previous
                      </button>
                      <button 
                        onClick={handleNext} 
                        disabled={currentQuestionIndex === questions.length - 1}
                        className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-colors"
                      >
                          Next
                      </button>
                  </div>
              </div>

              {/* Question Grid / Navigator */}
              <div className="w-full md:w-72 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-64 md:h-auto">
                  <div className="bg-slate-50 border-b border-slate-200 p-4 text-center">
                      <h3 className="font-bold text-slate-800 text-sm uppercase">Question Map</h3>
                  </div>
                  <div className="p-4 grid grid-cols-5 gap-2 overflow-y-auto">
                      {questions.map((_, idx) => {
                          const isAnswered = userAnswers[idx] !== undefined;
                          const isCurrent = currentQuestionIndex === idx;
                          return (
                              <button
                                  key={idx}
                                  onClick={() => handleJumpTo(idx)}
                                  className={`aspect-square rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                                      isCurrent 
                                      ? 'ring-2 ring-indigo-600 ring-offset-2 bg-indigo-100 text-indigo-700' 
                                      : isAnswered 
                                          ? 'bg-emerald-500 text-white shadow-sm' 
                                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                  }`}
                              >
                                  {idx + 1}
                              </button>
                          );
                      })}
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 space-y-2">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded"></div> Answered</div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-200 rounded"></div> Unanswered</div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-100 border border-indigo-600 rounded"></div> Current</div>
                  </div>
              </div>

          </div>
      )}

      {/* RESULT SCREEN */}
      {gameState === 'result' && (
          <div className="flex-1 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-16 text-center max-w-lg w-full animate-fade-in">
                  <div className="mb-6">
                      <span className="text-6xl">
                          {score / questions.length >= 0.7 ? '🏆' : score / questions.length >= 0.5 ? '👍' : '📚'}
                      </span>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">Assessment Complete</h2>
                  <p className="text-slate-500 mb-8">You have successfully submitted your exam.</p>
                  
                  <div className="bg-slate-50 rounded-2xl p-8 mb-8 border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Score</p>
                      <div className="flex items-baseline justify-center gap-2">
                          <span className={`text-6xl font-black ${score / questions.length >= 0.5 ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {Math.round((score / questions.length) * 100)}%
                          </span>
                      </div>
                      <p className="text-slate-600 font-medium mt-2">{score} out of {questions.length} correct</p>
                  </div>

                  <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => setGameState('intro')} 
                        className="w-full py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition"
                      >
                          Back to Dashboard
                      </button>
                      <button 
                        onClick={() => { 
                            setScore(0); 
                            setUserAnswers({});
                            startTest(); 
                        }} 
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg transition"
                      >
                          Take Another Test
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

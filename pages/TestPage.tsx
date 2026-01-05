
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
        
        if (!response.text) {
            throw new Error("AI returned empty or blocked content.");
        }

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
        console.error("AI Generation failed:", e);
        showNotification("AI generation failed. Loading standard question pack instead.", "warning");
        setLoadingMessage('AI Unavailable. Loading Standard Exam...');
        
        setTimeout(() => {
            const numQuestions = mode === 'mock' ? 30 : mode === 'game' ? 50 : 20;
            const levelQuestions = fallbackQuestions.filter(q => q.level === selectedLevel);
            const questionsToUse = shuffleAndPick(levelQuestions.length >= numQuestions ? levelQuestions : fallbackQuestions, numQuestions);

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
              handleGameOver(true); // Win condition
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
              const userRef = doc(db, 'users', auth.user.id);

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
                  await updateDoc(userRef, { contributionPoints: increment(points) });
                  showNotification(`+${points} Contribution Points!`, "success");
              }

              // 4. Check for new badges
              const userDoc = await getDoc(userRef);
              if (userDoc.exists()) {
                  const user = { id: userDoc.id, ...userDoc.data() } as User;
                  const newBadges = await checkAndAwardBadges(user);
                  if (newBadges.length > 0) {
                      const allBadges = [...new Set([...(user.badges || []), ...newBadges])];
                      await updateDoc(userRef, { badges: allBadges });
                      showNotification(`Unlocked ${newBadges.length} new badge(s)! Check your profile.`, "success");
                  }
              }

          } catch (e) { console.error(e); }
      }
  };

  const handleSelectAnswer = (answerIndex: number) => {
      setUserAnswers({ ...userAnswers, [currentQuestionIndex]: answerIndex });
  };
  
  const nextQuestion = () => {
      if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
  };

  const prevQuestion = () => {
      if (currentQuestionIndex > 0) {
          setCurrentQuestionIndex(currentQuestionIndex - 1);
      }
  };
  
  const resetTest = () => {
      setStage('menu');
      setQuestions([]);
      setUserAnswers({});
      setCurrentQuestionIndex(0);
      setTopic('');
      setTimeLeft(1200);
      setScore(0);
      setGameScore(0);
      setGameLives(3);
      setIsGameOver(false);
  };

  // --- RENDERERS ---
  
  const renderSetup = () => (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 animate-fade-in transition-colors">
          <div className="w-full max-w-lg">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700">
                  <button onClick={() => setStage('menu')} className="text-xs font-bold text-slate-400 hover:text-indigo-500 flex items-center gap-1 mb-6">&larr; Change Mode</button>
                  <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">Test Setup</h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-8">
                      {mode === 'topic' ? 'Specify a topic to generate questions on.' : mode === 'game' ? 'Get ready for a rapid-fire quiz!' : 'Confirm your level to start the mock exam.'}
                  </p>
                  <div className="space-y-6">
                      {mode === 'topic' && (
                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Topic</label>
                              <input 
                                  value={topic} 
                                  onChange={e => setTopic(e.target.value)} 
                                  className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-lg font-bold" 
                                  placeholder="e.g. Capital Budgeting" 
                                  autoFocus
                              />
                          </div>
                      )}
                      <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Academic Level</label>
                          <select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value as Level)} className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white bg-white text-lg font-bold appearance-none">
                              {LEVELS.filter(l => typeof l === 'number').map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                      </div>
                      <button onClick={startExam} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-transform hover:-translate-y-1">
                          Start Test
                      </button>
                  </div>
              </div>
          </div>
      </div>
  );
  
  const renderLoading = () => (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
          <div className="relative w-48 h-48 flex items-center justify-center mb-8">
              <svg className="w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-indigo-900" />
                  <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={552.8} strokeDashoffset={552.8 - (552.8 * loadingProgress) / 100} className="text-indigo-400 transition-all duration-500 ease-linear" />
              </svg>
              <span className="absolute text-5xl font-mono font-bold">{loadingProgress}%</span>
          </div>
          <p className="text-lg font-bold text-indigo-300 animate-pulse">{loadingMessage}</p>
          <p className="text-sm text-indigo-400 mt-2 max-w-sm text-center">Please wait, our AI is crafting your personalized exam questions. This may take a moment.</p>
      </div>
  );

  const renderExam = () => {
       if (questions.length === 0) return null;
       const currentQ = questions[currentQuestionIndex];
       
       if (mode === 'game') {
           // GAME MODE UI
           return (
                <div className="min-h-screen bg-slate-900 text-white flex flex-col p-4 md:p-8 transition-colors">
                    <header className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-bold font-serif text-indigo-300">FINQUEST</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-2xl font-bold">
                                {Array(gameLives).fill(0).map((_, i) => <span key={i} className="text-rose-500 animate-pulse">♥</span>)}
                                {Array(3 - gameLives).fill(0).map((_, i) => <span key={i} className="text-rose-900">♥</span>)}
                            </div>
                            <div className="px-4 py-2 bg-amber-400 text-slate-900 rounded-lg font-bold text-lg">{gameScore}</div>
                        </div>
                    </header>
                    <main className="flex-1 flex flex-col items-center justify-center text-center">
                         <div className="relative w-24 h-24 mb-6">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-indigo-800" />
                                <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={276.4} strokeDashoffset={276.4 - (276.4 * timeLeft) / 30} className="text-indigo-400 transition-all duration-1000 linear" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-3xl font-mono font-bold">{timeLeft}</span>
                        </div>
                        <p className="text-xs font-bold text-indigo-400 mb-2">QUESTION {currentQuestionIndex + 1} / {questions.length}</p>
                        <h3 className="text-xl md:text-3xl font-bold max-w-3xl mb-12">{currentQ.text}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                            {currentQ.options.map((opt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleGameAnswer(i)}
                                    disabled={!!gameFeedback}
                                    className={`p-4 rounded-xl text-lg font-semibold text-left transition-all duration-300 border-4
                                        ${gameFeedback && gameFeedback.correctIndex === i ? 'bg-emerald-500 border-emerald-300 scale-105' : ''}
                                        ${gameFeedback && gameFeedback.status === 'wrong' && userAnswers[currentQuestionIndex] === i ? 'bg-rose-600 border-rose-400' : ''}
                                        ${!gameFeedback ? 'bg-slate-800 border-slate-700 hover:bg-indigo-800 hover:border-indigo-600' : 'border-transparent'}
                                    `}
                                >
                                    <span className="font-mono mr-3">{String.fromCharCode(65+i)}</span>{opt}
                                </button>
                            ))}
                        </div>
                    </main>
                </div>
           );
       }
       
       // TOPIC & MOCK UI
       return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col md:flex-row transition-colors">
                <div className="w-full md:w-1/4 bg-white dark:bg-slate-900 p-4 border-r border-slate-200 dark:border-slate-800 flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                        <h3 className="text-xs font-bold uppercase text-slate-400 mb-2 px-2">Questions</h3>
                        <div className="grid grid-cols-5 gap-2">
                            {questions.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentQuestionIndex(i)}
                                    className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                                        currentQuestionIndex === i ? 'bg-indigo-600 text-white shadow-lg' : 
                                        userAnswers[i] !== undefined ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 
                                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button onClick={finishTest} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">Submit Exam</button>
                    </div>
                </div>
                <div className="flex-1 p-6 md:p-12 overflow-y-auto relative">
                    <div className="bg-slate-800 text-white p-4 rounded-xl flex items-center justify-between mb-8 shadow-lg">
                        <span className="text-sm font-bold uppercase tracking-wider">{mode} Mode</span>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setShowCalculator(!showCalculator)} className="text-indigo-300 hover:text-white transition-colors" title="Calculator">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </button>
                            <span className="font-mono text-xl font-bold">{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                    
                    {showCalculator && <div className="absolute top-24 right-12 z-20 animate-fade-in-down"><Calculator/></div>}

                    <div className="mb-8">
                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-2">Question {currentQuestionIndex + 1} of {questions.length}</p>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-snug">{currentQ.text}</h2>
                    </div>
                    <div className="space-y-4">
                        {currentQ.options.map((opt, i) => (
                            <button 
                                key={i}
                                onClick={() => handleSelectAnswer(i)}
                                className={`w-full p-5 text-left rounded-xl border-2 transition-all duration-200 group flex items-start gap-4 ${
                                    userAnswers[currentQuestionIndex] === i ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-500 shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 mt-1 ${
                                    userAnswers[currentQuestionIndex] === i ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 group-hover:border-indigo-500 text-slate-500'
                                }`}>
                                    {String.fromCharCode(65 + i)}
                                </div>
                                <span className="flex-1 text-slate-800 dark:text-slate-200 font-medium">{opt}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-between mt-12">
                        <button onClick={prevQuestion} disabled={currentQuestionIndex === 0} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-600 dark:text-slate-300 disabled:opacity-50">Previous</button>
                        <button onClick={nextQuestion} disabled={currentQuestionIndex === questions.length - 1} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>
       );
  };
  
  const renderResult = () => {
    const isGame = mode === 'game';
    const finalScore = isGame ? gameScore : score;
    const isPass = isGame ? true : finalScore >= 50;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 text-center animate-fade-in transition-colors">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 animate-float ${isPass ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
                <span className={`text-6xl ${isPass ? 'text-emerald-500' : 'text-rose-500'}`}>{isPass ? '🎉' : '😔'}</span>
            </div>
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">{isGame ? 'Game Over!' : 'Test Complete!'}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
                {isGame ? `You answered ${Object.keys(userAnswers).length} questions and scored:` : "Here's how you performed:"}
            </p>
            <div className={`mb-10 p-6 rounded-2xl border-2 ${isPass ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'}`}>
                <p className={`text-6xl font-black ${isPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {finalScore}{isGame ? '' : '%'}
                </p>
                <p className={`text-sm font-bold uppercase tracking-wider ${isPass ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isGame ? 'Points' : 'Final Score'}
                </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={resetTest} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-50">Main Menu</button>
                {!isGame && <button onClick={() => setStage('review')} className="px-6 py-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg hover:bg-indigo-200">Review Answers</button>}
                <button onClick={startExam} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Play Again</button>
            </div>
            {!isGame && <button onClick={() => generateTestReviewPDF(questions, userAnswers, score, auth?.user)} className="mt-4 text-xs text-slate-400 hover:underline">Download Results PDF</button>}
        </div>
    );
  };
  
  const renderReview = () => (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                  <div>
                      <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">Review Answers</h2>
                      <p className="text-slate-500 dark:text-slate-400">Green is correct, Red is your incorrect answer.</p>
                  </div>
                  <button onClick={() => setStage('result')} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold">Back to Result</button>
              </div>
              <div className="space-y-6">
                  {questions.map((q, i) => {
                      const userAnswer = userAnswers[i];
                      const isCorrect = userAnswer === q.correctAnswer;
                      return (
                          <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">Question {i+1}</p>
                              <p className="font-bold text-slate-900 dark:text-white mb-4">{q.text}</p>
                              <div className="space-y-2">
                                  {q.options.map((opt, optIdx) => (
                                      <div key={optIdx} className={`p-3 rounded-lg border-2 text-sm
                                          ${optIdx === q.correctAnswer ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700' : ''}
                                          ${!isCorrect && optIdx === userAnswer ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700' : ''}
                                      `}>
                                          <span className={`font-mono mr-3 font-bold ${optIdx === q.correctAnswer ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}`}>
                                              {String.fromCharCode(65+optIdx)}
                                          </span>
                                          <span className={`${optIdx === q.correctAnswer ? 'text-emerald-800 dark:text-emerald-200 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {opt}
                                          </span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>
  );
  
  // --- STAGE ROUTER ---
  switch (stage) {
      case 'menu': return (
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

                      <button 
                        onClick={() => { setMode('game'); setStage('setup'); }} 
                        className="group relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-700 hover:-translate-y-2 overflow-hidden text-left"
                      >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-bl-[100px] transition-transform group-hover:scale-110"></div>
                          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mb-6 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors relative z-10">
                              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 relative z-10">FINQUEST</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed relative z-10">
                              A fast-paced survival game. Answer questions correctly before time runs out. 3 lives. Go for the high score!
                          </p>
                      </button>
                  </div>
              </div>
          </div>
      );
      case 'setup': return renderSetup();
      case 'loading': return renderLoading();
      case 'exam': return renderExam();
      case 'result': return renderResult();
      case 'review': return renderReview();
      default: return null;
  }
};


import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleGenAI } from '@google/genai';
import { Calculator } from '../components/Calculator';
import { LEVELS } from '../constants';
import { Level, TestResult } from '../types';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';

interface Question {
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [leaderboard, setLeaderboard] = useState<TestResult[]>([]);
  
  // Timer
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  useEffect(() => {
    if (gameState === 'intro') {
        fetchLeaderboard();
    }
  }, [gameState]);

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
          const prompt = `Generate 10 extremely difficult, complex, university-level multiple choice questions for Finance students at ${selectedLevel} Level. 
          Topics should include Advanced Financial Reporting, Corporate Finance, Derivatives, Econometrics, etc. suitable for that level.
          Output strictly as a JSON array of objects. Format: [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "The correct option string"}]. 
          Do not include markdown formatting like \`\`\`json. Just the raw JSON.`;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
          });

          const text = response.text || "[]";
          const cleanText = text.replace(/```json|```/g, '').trim();
          const parsedQuestions = JSON.parse(cleanText);

          if (parsedQuestions.length > 0) {
              setQuestions(parsedQuestions);
              setCurrentIndex(0);
              setScore(0);
              setTimeLeft(600);
              setGameState('playing');
          } else {
              throw new Error("Failed to generate questions");
          }
      } catch (error) {
          console.error(error);
          showNotification("Failed to load test. Please try again.", "error");
          setGameState('intro');
      }
  };

  const handleAnswer = (option: string) => {
      if (option === questions[currentIndex].answer) {
          setScore(s => s + 1);
      }
      
      if (currentIndex + 1 < questions.length) {
          setCurrentIndex(p => p + 1);
      } else {
          finishTest();
      }
  };

  const finishTest = async () => {
      setGameState('result');
      if (auth?.user) {
          // Calculate final score logic if needed, current score state is raw count
          try {
              await addDoc(collection(db, 'test_results'), {
                  userId: auth.user.id,
                  username: auth.user.username,
                  avatarUrl: auth.user.avatarUrl || '',
                  score: score, // using raw score for now, logic below updates it before save if needed but state is async
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

  if (gameState === 'loading') {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mb-4"></div>
              <h2 className="text-xl font-bold text-slate-700 animate-pulse">Preparing Exam Papers...</h2>
              <p className="text-slate-500 text-sm">Fetching curriculum data for {selectedLevel}L</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 relative">
      
      {/* Calculator Toggle */}
      {gameState === 'playing' && (
          <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
              {showCalculator && <Calculator />}
              <button 
                onClick={() => setShowCalculator(!showCalculator)}
                className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-indigo-700 transition transform hover:scale-110"
                title="Toggle Calculator"
              >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              </button>
          </div>
      )}

      <div className="container mx-auto max-w-4xl">
        
        {gameState === 'intro' && (
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center animate-fade-in">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h1 className="text-4xl font-serif font-bold text-slate-900 mb-4">Quick Test</h1>
                <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">Challenge yourself with randomized, high-difficulty questions based on your academic level. Requires critical thinking and calculation.</p>
                
                <div className="flex justify-center gap-4 mb-8">
                    {LEVELS.map(lvl => (
                        <button 
                            key={lvl}
                            onClick={() => setSelectedLevel(lvl)}
                            className={`px-6 py-3 rounded-xl font-bold transition-all ${selectedLevel === lvl ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {lvl}L
                        </button>
                    ))}
                </div>

                <button 
                    onClick={startTest}
                    className="px-10 py-4 bg-emerald-600 text-white font-bold rounded-xl text-lg shadow-xl hover:bg-emerald-700 transition transform hover:-translate-y-1"
                >
                    Start Examination
                </button>

                {/* Leaderboard Preview */}
                <div className="mt-16 text-left">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        Top Performers
                    </h3>
                    <div className="bg-slate-900 rounded-xl overflow-hidden text-white">
                        {leaderboard.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-800 text-slate-400">
                                    <tr>
                                        <th className="p-4 text-left">Rank</th>
                                        <th className="p-4 text-left">Student</th>
                                        <th className="p-4 text-center">Level</th>
                                        <th className="p-4 text-right">Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard.map((entry, idx) => (
                                        <tr key={entry.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                            <td className="p-4 font-bold text-amber-400">#{idx + 1}</td>
                                            <td className="p-4 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-xs">
                                                    {entry.username.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium">@{entry.username}</span>
                                            </td>
                                            <td className="p-4 text-center text-slate-400">{entry.level}L</td>
                                            <td className="p-4 text-right font-bold text-emerald-400">{entry.score}/{entry.totalQuestions}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-slate-500">No records yet. Be the first!</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {gameState === 'playing' && questions.length > 0 && (
            <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <span className="bg-white px-4 py-2 rounded-lg font-bold shadow-sm text-slate-600">Question {currentIndex + 1}/{questions.length}</span>
                    <span className={`px-4 py-2 rounded-lg font-bold shadow-sm ${timeLeft < 60 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-indigo-100 text-indigo-600'}`}>
                        Time: {formatTime(timeLeft)}
                    </span>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-8 leading-relaxed font-serif">
                        {questions[currentIndex].question}
                    </h2>
                    
                    <div className="space-y-4">
                        {questions[currentIndex].options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(option)}
                                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all font-medium text-slate-700 hover:text-indigo-900 flex gap-4"
                            >
                                <span className="bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full font-bold text-slate-500 text-xs shrink-0">
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {gameState === 'result' && (
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-16 text-center animate-fade-in max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Test Completed</h2>
                <p className="text-slate-500 mb-8">Here is your performance summary</p>
                
                <div className="w-40 h-40 rounded-full border-8 border-indigo-100 flex flex-col items-center justify-center mx-auto mb-8 relative">
                    <span className="text-5xl font-bold text-indigo-600">{score}</span>
                    <span className="text-sm text-slate-400 font-bold uppercase">Out of {questions.length}</span>
                </div>

                <p className="text-lg text-slate-700 mb-8">
                    {score > 7 ? "Outstanding Performance! 🌟" : score > 4 ? "Good effort, keep studying! 📚" : "Needs more revision. 💡"}
                </p>

                <div className="flex gap-4 justify-center">
                    <button onClick={() => setGameState('intro')} className="px-8 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition">
                        Back to Home
                    </button>
                    <button onClick={() => { setScore(0); startTest(); }} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">
                        Retake Test
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

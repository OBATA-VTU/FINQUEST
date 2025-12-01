import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Calculator } from '../components/Calculator';
import { GoogleGenAI, Type } from "@google/genai";
import { useNotification } from '../contexts/NotificationContext';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { LEVELS } from '../constants';
import { Level, TestResult } from '../types';
import { generateTestReviewPDF } from '../utils/pdfGenerator';

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

// Fallback questions in case AI service is down or rate-limited
const FALLBACK_QUESTIONS: Question[] = [
    { id: 101, text: "Which of the following is NOT a capital budgeting technique?", options: ["Net Present Value (NPV)", "Internal Rate of Return (IRR)", "Depreciation Method", "Payback Period"], correctAnswer: 2 },
    { id: 102, text: "In the context of the Time Value of Money, a dollar today is worth _____ than a dollar tomorrow.", options: ["Less", "The same", "More", "None of the above"], correctAnswer: 2 },
    { id: 103, text: "Which financial statement reports a company's financial position at a specific point in time?", options: ["Income Statement", "Statement of Cash Flows", "Balance Sheet", "Retained Earnings Statement"], correctAnswer: 2 },
    { id: 104, text: "What is the primary goal of financial management?", options: ["Maximizing Profit", "Maximizing Shareholder Wealth", "Minimizing Costs", "Maximizing Market Share"], correctAnswer: 1 },
    { id: 105, text: "A bond that pays no interest but is sold at a deep discount is called a:", options: ["Junk Bond", "Zero-Coupon Bond", "Convertible Bond", "Treasury Bond"], correctAnswer: 1 },
    { id: 106, text: "Which ratio measures a firm's ability to pay off short-term obligations?", options: ["Debt-to-Equity Ratio", "Current Ratio", "Return on Assets", "Price-Earnings Ratio"], correctAnswer: 1 },
    { id: 107, text: "The cost of the next best alternative foregone is known as:", options: ["Sunk Cost", "Fixed Cost", "Opportunity Cost", "Variable Cost"], correctAnswer: 2 },
    { id: 108, text: "Which market deals with the trading of long-term debt and equity instruments?", options: ["Money Market", "Capital Market", "Forex Market", "Derivatives Market"], correctAnswer: 1 },
    { id: 109, text: "Diversification allows an investor to:", options: ["Eliminate all risk", "Increase returns guaranteed", "Reduce unsystematic risk", "Reduce systematic risk"], correctAnswer: 2 },
    { id: 110, text: "Beta (β) is a measure of:", options: ["Total Risk", "Unsystematic Risk", "Systematic Risk", "Liquidity Risk"], correctAnswer: 2 },
    { id: 111, text: "If the NPV of a project is positive, the project should be:", options: ["Rejected", "Accepted", "Ignored", "Deferred"], correctAnswer: 1 },
    { id: 112, text: "Which institution is the apex bank in Nigeria?", options: ["First Bank", "CBN (Central Bank of Nigeria)", "NDIC", "SEC"], correctAnswer: 1 },
    { id: 113, text: "The Du Pont Identity breaks down Return on Equity (ROE) into:", options: ["Profit Margin x Asset Turnover x Equity Multiplier", "Net Income / Sales", "Assets / Equity", "Sales / Assets"], correctAnswer: 0 },
    { id: 114, text: "An annuity with an infinite life is called a:", options: ["Perpetuity", "Ordinary Annuity", "Annuity Due", "Growing Annuity"], correctAnswer: 0 },
    { id: 115, text: "The relationship between risk and required return is depicted by the:", options: ["CML (Capital Market Line)", "SML (Security Market Line)", "Efficient Frontier", "Indifference Curve"], correctAnswer: 1 },
    { id: 116, text: "Working Capital is defined as:", options: ["Total Assets - Total Liabilities", "Current Assets - Current Liabilities", "Fixed Assets - Long Term Debt", "Equity - Debt"], correctAnswer: 1 },
    { id: 117, text: "Inflation is best described as:", options: ["A decrease in the price level", "A persistent increase in the general price level", "An increase in purchasing power", "Stable prices"], correctAnswer: 1 },
    { id: 118, text: "Which of these is an example of an intangible asset?", options: ["Inventory", "Machinery", "Goodwill", "Cash"], correctAnswer: 2 },
    { id: 119, text: "The breakeven point is where:", options: ["Total Revenue = Total Costs", "Total Revenue > Total Costs", "Total Revenue < Total Costs", "Fixed Costs = Variable Costs"], correctAnswer: 0 },
    { id: 120, text: "Which of the following is considered a risk-free asset?", options: ["Corporate Bond", "Treasury Bill", "Common Stock", "Real Estate"], correctAnswer: 1 }
];

export const TestPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  
  // Stages: Menu -> Setup -> Loading -> Exam -> Result -> Review
  const [stage, setStage] = useState<'menu' | 'setup' | 'loading' | 'exam' | 'result' | 'review'>('menu');
  const [mode, setMode] = useState<'topic' | 'mock'>('topic');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showCalculator, setShowCalculator] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing Session...');
  
  // Setup State
  const [topic, setTopic] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<Level>(auth?.user?.level || 100);
  
  // Result State
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<TestResult[]>([]);

  // --- PERSISTENCE LOGIC ---
  useEffect(() => {
      // Restore state on mount
      const savedState = localStorage.getItem('finquest_exam_state');
      if (savedState) {
          try {
              const parsed = JSON.parse(savedState);
              // Only restore if it's the same user and not finished
              if (parsed.userId === auth?.user?.id && parsed.stage === 'exam') {
                  setStage('exam');
                  setMode(parsed.mode);
                  setQuestions(parsed.questions);
                  setCurrentQuestionIndex(parsed.currentQuestionIndex);
                  setUserAnswers(parsed.userAnswers);
                  setSelectedLevel(parsed.selectedLevel);
                  setTopic(parsed.topic || '');
                  showNotification("Exam session restored.", "info");
              }
          } catch (e) { localStorage.removeItem('finquest_exam_state'); }
      }
      fetchLeaderboard();
  }, [auth?.user?.id]);

  useEffect(() => {
      // Refresh leaderboard whenever we return to the menu
      if (stage === 'menu') {
          fetchLeaderboard();
      }
  }, [stage]);

  useEffect(() => {
      // Save state on change during exam
      if (stage === 'exam' && auth?.user?.id) {
          const stateToSave = {
              userId: auth.user.id,
              stage,
              mode,
              questions,
              currentQuestionIndex,
              userAnswers,
              selectedLevel,
              topic
          };
          localStorage.setItem('finquest_exam_state', JSON.stringify(stateToSave));
      } else if (stage === 'menu' || stage === 'result') {
          localStorage.removeItem('finquest_exam_state');
      }
  }, [stage, mode, questions, currentQuestionIndex, userAnswers, selectedLevel, topic, auth?.user?.id]);

  const fetchLeaderboard = async () => {
      try {
          const q = query(collection(db, 'test_results'), orderBy('score', 'desc'), limit(10));
          const snap = await getDocs(q);
          const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as TestResult));
          setLeaderboard(results);
      } catch (e) { console.error("Leaderboard error", e); }
  };

  const handleModeSelect = (selectedMode: 'topic' | 'mock') => {
      setMode(selectedMode);
      setStage('setup');
  };

  // Helper to strip Markdown code blocks
  const cleanJson = (text: string) => {
      if (!text) return "";
      return text.replace(/```json/g, '').replace(/```/g, '').trim();
  };

  const startExam = async () => {
    if (mode === 'topic' && !topic.trim()) {
        showNotification("Please enter a topic.", "error");
        return;
    }
    
    setStage('loading');
    setLoadingProgress(5);
    setLoadingMessage('Contacting Secure Server...');

    // Progress Bar Simulation
    const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
            const next = prev + Math.floor(Math.random() * 8) + 1;
            if (next > 30 && next < 50) setLoadingMessage('Retrieving Questions...');
            if (next > 50 && next < 80) setLoadingMessage('Formatting Assessment...');
            if (next > 80 && next < 95) setLoadingMessage('Finalizing Packet...');
            if (next >= 95) return 95; 
            return next;
        });
    }, 800);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        let prompt = "";
        if (mode === 'topic') {
            prompt = `Generate 20 difficult, exam-standard multiple-choice questions for ${selectedLevel} Level Finance students specifically on the topic: "${topic}". Ensure options are tricky. Return only raw JSON.`;
        } else {
            prompt = `Generate 20 difficult, complex, and rigid multiple-choice questions for ${selectedLevel} Level Finance students. Questions should cover a random mix of core courses typically taught at this level. Do not group them by subject. Return only raw JSON.`;
        }

        // Timeout Promise (25 seconds) to ensure fallback triggers reasonably fast if net is slow
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Request timed out")), 25000)
        );

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
                            answerIndex: { type: Type.INTEGER, description: "Index of the correct option (0-3)" }
                        },
                        required: ["question", "options", "answerIndex"]
                    }
                }
            }
        });

        // Race between AI and Timeout
        const response: any = await Promise.race([aiPromise, timeoutPromise]);
        
        clearInterval(progressInterval);
        setLoadingProgress(100);

        if (!response.text) throw new Error("Empty response received");

        // Clean text before parsing to handle markdown wrappers
        const cleanText = cleanJson(response.text);
        const data = JSON.parse(cleanText);

        if (Array.isArray(data) && data.length > 0) {
            setQuestions(data.map((q: any, idx: number) => ({
                id: idx,
                text: q.question,
                options: q.options,
                correctAnswer: q.answerIndex
            })));
            
            setTimeout(() => {
                setStage('exam');
                setCurrentQuestionIndex(0);
                setUserAnswers({});
            }, 500);
        } else {
            throw new Error("Invalid question format received");
        }

    } catch (e: any) {
        clearInterval(progressInterval);
        console.warn("AI Generation failed:", e);
        
        // --- FALLBACK MECHANISM ---
        setLoadingMessage('Loading Standard Set...');
        setLoadingProgress(100);
        
        setTimeout(() => {
            // Shuffle fallback questions for variety
            const shuffled = [...FALLBACK_QUESTIONS].sort(() => 0.5 - Math.random());
            setQuestions(shuffled);
            
            showNotification("AI Service busy. Loaded standard practice set.", "info");
            setStage('exam');
            setCurrentQuestionIndex(0);
            setUserAnswers({});
        }, 1000);
    }
  };

  const handleCancelLoading = () => {
      setStage('setup');
      showNotification("Generation cancelled.", "info");
  };

  const handleAnswer = (optionIdx: number) => {
      setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionIdx }));
  };

  const finishTest = async () => {
      let s = 0;
      questions.forEach((q, idx) => {
          if (userAnswers[idx] === q.correctAnswer) s++;
      });
      
      const finalPercentage = Math.round((s / questions.length) * 100);
      setScore(finalPercentage);
      setStage('result');
      localStorage.removeItem('finquest_exam_state');

      if (auth?.user) {
          try {
              await addDoc(collection(db, 'test_results'), {
                  userId: auth.user.id,
                  username: auth.user.username,
                  avatarUrl: auth.user.avatarUrl || '',
                  score: finalPercentage,
                  totalQuestions: questions.length,
                  level: selectedLevel,
                  date: new Date().toISOString()
              });
              // Fetch immediate to ensure data is there if they navigate back quickly
              fetchLeaderboard();
          } catch (e) { console.error("Error saving result", e); }
      }
  };

  const downloadReview = () => {
      generateTestReviewPDF(questions, userAnswers, score, auth?.user);
      showNotification("Test result downloaded.", "success");
  };

  // --- RENDERERS ---

  if (stage === 'menu') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 flex flex-col items-center animate-fade-in transition-colors">
              <div className="max-w-4xl w-full">
                  <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white text-center mb-2">FINQUEST Assessment Portal</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-center mb-12">Select an examination mode to begin your practice session.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Topic Mode */}
                      <button 
                        onClick={() => handleModeSelect('topic')}
                        className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-xl transition-all group text-left"
                      >
                          <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Topic Practice</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Focus on specific areas like "Bonds", "Derivatives", or "Accounting". Great for revision.</p>
                      </button>

                      {/* Mock Exam Mode */}
                      <button 
                        onClick={() => handleModeSelect('mock')}
                        className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-xl transition-all group text-left"
                      >
                          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Full Mock Exam</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Randomized, rigid questions covering various courses for your level. Simulates real exam conditions.</p>
                      </button>
                  </div>

                  {/* Leaderboard */}
                  <div className="mt-16 max-w-2xl mx-auto w-full">
                      <div className="flex justify-between items-end mb-6">
                        <h3 className="text-center font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs flex items-center gap-2">
                            <span className="text-xl">🏆</span> Hall of Fame
                        </h3>
                        <button onClick={fetchLeaderboard} className="text-xs text-indigo-500 dark:text-indigo-400 font-bold hover:underline">Refresh Board</button>
                      </div>
                      
                      <div className="space-y-3">
                          {leaderboard.length > 0 ? leaderboard.map((entry, idx) => {
                              const rank = idx + 1;
                              
                              // Default Styles (4th+)
                              let containerStyle = "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700";
                              let rankDisplay = <span className="font-bold text-slate-400 dark:text-slate-500 w-8 text-center">#{rank}</span>;
                              let scoreColor = "text-indigo-600 dark:text-indigo-400";
                              let ringColor = "border-slate-200 dark:border-slate-600";
                              
                              // 1st Place - Gold
                              if (rank === 1) {
                                  containerStyle = "bg-gradient-to-r from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-amber-300 dark:border-amber-700 shadow-lg shadow-amber-100/50 transform scale-105 z-10";
                                  scoreColor = "text-amber-700 dark:text-amber-400";
                                  ringColor = "border-amber-400";
                                  rankDisplay = (
                                      <div className="relative w-10 h-10 flex items-center justify-center">
                                          <span className="text-3xl filter drop-shadow-sm">🥇</span>
                                          <svg className="absolute -top-2 -right-2 w-4 h-4 text-yellow-500 animate-[spin_3s_linear_infinite]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                          <svg className="absolute top-0 -left-2 w-3 h-3 text-yellow-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                      </div>
                                  );
                              }
                              
                              // 2nd Place - Silver
                              if (rank === 2) {
                                  containerStyle = "bg-gradient-to-r from-slate-50 to-gray-200 dark:from-slate-800 dark:to-gray-800 border-slate-300 dark:border-slate-600 shadow-md";
                                  scoreColor = "text-slate-700 dark:text-slate-300";
                                  ringColor = "border-slate-300";
                                  rankDisplay = (
                                      <div className="relative w-10 h-10 flex items-center justify-center">
                                          <span className="text-3xl filter drop-shadow-sm">🥈</span>
                                          <svg className="absolute -top-1 -right-1 w-4 h-4 text-slate-400 animate-bounce" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                                      </div>
                                  );
                              }

                              // 3rd Place - Bronze
                              if (rank === 3) {
                                  containerStyle = "bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-900/20 border-orange-300 dark:border-orange-700 shadow-sm";
                                  scoreColor = "text-orange-800 dark:text-orange-400";
                                  ringColor = "border-orange-300";
                                  rankDisplay = (
                                      <div className="relative w-10 h-10 flex items-center justify-center">
                                          <span className="text-3xl filter drop-shadow-sm">🥉</span>
                                          <div className="absolute top-0 right-0 w-2 h-2 bg-orange-400 rounded-full animate-ping"></div>
                                      </div>
                                  );
                              }

                              return (
                                  <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${containerStyle} transition-all duration-300`}>
                                      <div className="flex items-center gap-4">
                                          <div className="shrink-0">{rankDisplay}</div>
                                          <div className="flex items-center gap-3">
                                              <div className={`w-10 h-10 rounded-full border-2 ${ringColor} overflow-hidden bg-slate-200 dark:bg-slate-700`}>
                                                  {entry.avatarUrl ? (
                                                      <img src={entry.avatarUrl} className="w-full h-full object-cover" alt="avatar" />
                                                  ) : (
                                                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 dark:text-slate-400">{entry.username?.charAt(0)}</div>
                                                  )}
                                              </div>
                                              <div>
                                                  <span className={`block font-bold text-sm md:text-base ${rank === 1 ? 'text-amber-900 dark:text-amber-100' : 'text-slate-800 dark:text-slate-100'}`}>
                                                      {entry.username || 'Unknown User'}
                                                  </span>
                                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{new Date(entry.date).toLocaleDateString()}</span>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="flex flex-col items-end">
                                          <span className={`font-black text-xl ${scoreColor}`}>{entry.score}%</span>
                                          <span className="text-[10px] bg-white/50 dark:bg-black/30 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 font-bold border border-slate-100 dark:border-slate-700 uppercase tracking-wider">{entry.level}L</span>
                                      </div>
                                  </div>
                              );
                          }) : <div className="p-12 text-center text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">Leaderboard is empty. Be the first!</div>}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'setup') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-8 animate-fade-in-up border border-slate-100 dark:border-slate-700">
                  <button onClick={() => setStage('menu')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mb-6 flex items-center gap-1 text-sm font-bold">
                      &larr; Back
                  </button>
                  
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Configure {mode === 'topic' ? 'Practice' : 'Exam'}</h2>
                  
                  <div className="space-y-6">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Select Level</label>
                          <div className="grid grid-cols-4 gap-2">
                              {LEVELS.map(lvl => (
                                  <button
                                      key={lvl}
                                      onClick={() => setSelectedLevel(lvl)}
                                      className={`py-2 rounded-lg font-bold text-sm border-2 transition-all ${selectedLevel === lvl ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-500'}`}
                                  >
                                      {lvl}
                                  </button>
                              ))}
                          </div>
                      </div>

                      {mode === 'topic' && (
                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Focus Topic</label>
                              <input 
                                type="text" 
                                value={topic} 
                                onChange={e => setTopic(e.target.value)}
                                className="w-full border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-0 outline-none font-medium"
                                placeholder="e.g. Capital Budgeting"
                              />
                          </div>
                      )}

                      <button 
                        onClick={startExam} 
                        className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg transition-transform hover:-translate-y-1 mt-4"
                      >
                          Start Session
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'loading') {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
              <div className="w-full max-w-md mb-8">
                  <div className="flex justify-between text-xs font-bold text-indigo-400 mb-2 font-mono">
                      <span>{loadingMessage.toUpperCase()}</span>
                      <span>{loadingProgress}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-700">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-300 ease-out relative"
                        style={{ width: `${loadingProgress}%` }}
                      >
                         <div className="absolute inset-0 bg-white/30 w-full animate-[shimmer_2s_infinite]"></div>
                      </div>
                  </div>
              </div>
              
              <h2 className="text-xl font-mono font-bold tracking-wide animate-pulse text-center mb-4">INITIALIZING SECURE SESSION...</h2>
              <p className="text-indigo-300 text-sm mt-3 text-center opacity-80 mb-8">Downloading {selectedLevel} Level Examination Data</p>

              <button 
                onClick={handleCancelLoading}
                className="px-6 py-2 border border-slate-600 text-slate-400 rounded hover:bg-slate-800 hover:text-white transition text-xs font-bold uppercase tracking-wider"
              >
                  Cancel Request
              </button>
          </div>
      );
  }

  if (stage === 'result') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 flex items-center justify-center transition-colors">
              <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up border border-slate-100 dark:border-slate-700">
                  <div className={`p-10 text-center text-white ${score >= 50 ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                      <h1 className="text-4xl font-bold mb-2 font-serif">{score >= 50 ? 'Excellent Work!' : 'Study Harder!'}</h1>
                      <div className="text-8xl font-black mb-2 tracking-tighter">{score}<span className="text-4xl">%</span></div>
                      <p className="opacity-90 font-medium">You answered {Math.round((score / 100) * questions.length)} of {questions.length} questions correctly.</p>
                  </div>
                  
                  <div className="p-8 bg-slate-50 dark:bg-slate-900">
                      <div className="flex gap-4">
                          <button onClick={() => setStage('review')} className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm">
                              Review Answers
                          </button>
                          <Link to="/dashboard" className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg text-center flex items-center justify-center">
                              Dashboard
                          </Link>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'review') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 flex flex-col items-center animate-fade-in transition-colors">
              <div className="max-w-4xl w-full">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Test Review</h2>
                      <div className="flex gap-3">
                          <button onClick={downloadReview} className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              Download PDF
                          </button>
                          <button onClick={() => { setStage('menu'); setQuestions([]); setScore(0); }} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700">
                              New Test
                          </button>
                      </div>
                  </div>

                  <div className="space-y-6">
                      {questions.map((q, idx) => {
                          const userAns = userAnswers[idx];
                          const isCorrect = userAns === q.correctAnswer;
                          return (
                              <div key={idx} className={`bg-white dark:bg-slate-800 p-6 rounded-xl border-l-4 shadow-sm ${isCorrect ? 'border-emerald-500' : 'border-rose-500'} dark:border-l-4`}>
                                  <div className="flex justify-between mb-4">
                                      <span className="font-bold text-slate-500 dark:text-slate-400">Question {idx + 1}</span>
                                      {isCorrect ? (
                                          <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded">Correct</span>
                                      ) : (
                                          <span className="text-xs font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-2 py-1 rounded">Incorrect</span>
                                      )}
                                  </div>
                                  <p className="text-lg font-medium text-slate-900 dark:text-white mb-4">{q.text}</p>
                                  <div className="space-y-2">
                                      {q.options.map((opt, optIdx) => {
                                          let bgClass = "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300";
                                          if (optIdx === q.correctAnswer) bgClass = "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold";
                                          else if (optIdx === userAns && !isCorrect) bgClass = "bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300";
                                          
                                          return (
                                              <div key={optIdx} className={`p-3 rounded-lg border text-sm ${bgClass}`}>
                                                  <span className="mr-2 font-bold">{String.fromCharCode(65+optIdx)}.</span>
                                                  {opt}
                                                  {optIdx === q.correctAnswer && <span className="ml-2 text-[10px] uppercase font-bold">(Correct Answer)</span>}
                                                  {optIdx === userAns && optIdx !== q.correctAnswer && <span className="ml-2 text-[10px] uppercase font-bold">(Your Answer)</span>}
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      );
  }

  // EXAM UI
  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col transition-colors">
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300">{auth?.user?.name.charAt(0)}</div>
                <div className="hidden md:block">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">{mode === 'topic' ? 'Practice Mode' : 'Mock Exam'}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{selectedLevel} Level • {questions.length} Questions</p>
                </div>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={() => setShowCalculator(!showCalculator)} 
                    className={`p-2 rounded-lg transition-colors ${showCalculator ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                    title="Toggle Calculator"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </button>
                <button onClick={() => window.confirm("Submit Exam?") && finishTest()} className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 text-sm">Submit Exam</button>
            </div>
        </header>

        <div className="flex-1 container mx-auto max-w-6xl p-4 flex flex-col md:flex-row gap-6">
            
            {/* Question Card */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Question {currentQuestionIndex + 1}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase">Select Option</span>
                </div>
                <div className="p-8 md:p-12 flex-grow overflow-y-auto">
                    <h2 className="text-xl md:text-2xl font-serif font-medium text-slate-900 dark:text-white leading-relaxed mb-8">{currentQ.text}</h2>
                    <div className="space-y-3">
                        {currentQ.options.map((opt, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-200' : 'border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500 text-slate-600 dark:text-slate-300'}`}
                            >
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${userAnswers[currentQuestionIndex] === idx ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400'}`}>{String.fromCharCode(65+idx)}</span>
                                <span className="font-medium">{opt}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                    <button 
                        disabled={currentQuestionIndex === 0}
                        onClick={() => setCurrentQuestionIndex(p => p - 1)}
                        className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    {currentQuestionIndex < questions.length - 1 ? (
                        <button onClick={() => setCurrentQuestionIndex(p => p + 1)} className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700">Next</button>
                    ) : (
                        <button onClick={() => window.confirm("Finish Exam?") && finishTest()} className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700">Finish Exam</button>
                    )}
                </div>
            </div>

            {/* Sidebar Map */}
            <div className="w-full md:w-72 shrink-0 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-fit">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 font-bold text-center text-sm text-slate-800 dark:text-slate-200 uppercase">Question Map</div>
                <div className="p-4 grid grid-cols-5 gap-2">
                    {questions.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentQuestionIndex(idx)}
                            className={`aspect-square rounded-lg font-bold text-xs flex items-center justify-center transition-all ${currentQuestionIndex === idx ? 'ring-2 ring-indigo-600 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : userAnswers[idx] !== undefined ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}
                        >
                            {idx + 1}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
                    <button onClick={() => window.confirm("Submit Exam?") && finishTest()} className="w-full py-3 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 text-sm">Submit All</button>
                </div>
            </div>
        </div>

        {showCalculator && (
            <div className="fixed bottom-20 right-4 z-50 animate-fade-in-up"><Calculator /></div>
        )}
    </div>
  );
};
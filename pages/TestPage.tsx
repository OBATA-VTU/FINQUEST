
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

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

export const TestPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  
  // Stages: Menu -> Setup -> Loading -> Exam -> Result
  const [stage, setStage] = useState<'menu' | 'setup' | 'loading' | 'exam' | 'result'>('menu');
  const [mode, setMode] = useState<'topic' | 'mock'>('topic');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showCalculator, setShowCalculator] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing AI...');
  
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
          setLeaderboard(snap.docs.map(d => ({ id: d.id, ...d.data() } as TestResult)));
      } catch (e) { console.error("Leaderboard error", e); }
  };

  const handleModeSelect = (selectedMode: 'topic' | 'mock') => {
      setMode(selectedMode);
      setStage('setup');
  };

  const startExam = async () => {
    if (mode === 'topic' && !topic.trim()) {
        showNotification("Please enter a topic.", "error");
        return;
    }
    
    setStage('loading');
    setLoadingProgress(5);
    setLoadingMessage('Contacting Gemini AI...');

    // Progress Bar Simulation
    const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
            const next = prev + Math.floor(Math.random() * 8) + 1;
            if (next > 30 && next < 50) setLoadingMessage('Generating Questions...');
            if (next > 50 && next < 80) setLoadingMessage('Formatting Response...');
            if (next > 80 && next < 95) setLoadingMessage('Finalizing...');
            if (next >= 95) return 95; 
            return next;
        });
    }, 800);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        let prompt = "";
        if (mode === 'topic') {
            prompt = `Generate 20 difficult, exam-standard multiple-choice questions for ${selectedLevel} Level Finance students specifically on the topic: "${topic}". Ensure options are tricky.`;
        } else {
            prompt = `Generate 20 difficult, complex, and rigid multiple-choice questions for ${selectedLevel} Level Finance students. Questions should cover a random mix of core courses typically taught at this level (e.g., Corporate Finance, Accounting, Economics, Quantitative Analysis). Do not group them by subject.`;
        }

        // Timeout Promise (30 seconds)
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("AI generation timed out. Please try again.")), 30000)
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

        if (!response.text) throw new Error("Empty response from AI");

        const data = JSON.parse(response.text);
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
            throw new Error("Invalid format received");
        }

    } catch (e: any) {
        clearInterval(progressInterval);
        console.error(e);
        showNotification(e.message || "Connection failed. Please try again.", "error");
        setStage('setup');
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
              fetchLeaderboard();
          } catch (e) { console.error("Error saving result", e); }
      }
  };

  // --- RENDERERS ---

  if (stage === 'menu') {
      return (
          <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center">
              <div className="max-w-4xl w-full">
                  <h1 className="text-3xl font-serif font-bold text-slate-900 text-center mb-2">Finance Assessment Portal</h1>
                  <p className="text-slate-500 text-center mb-12">Select an examination mode to begin your practice session.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Topic Mode */}
                      <button 
                        onClick={() => handleModeSelect('topic')}
                        className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-xl transition-all group text-left"
                      >
                          <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-110 transition-transform">
                              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-2">Topic Practice</h3>
                          <p className="text-slate-500 text-sm">Focus on specific areas like "Bonds", "Derivatives", or "Accounting". Great for revision.</p>
                      </button>

                      {/* Mock Exam Mode */}
                      <button 
                        onClick={() => handleModeSelect('mock')}
                        className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all group text-left"
                      >
                          <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 text-emerald-600 group-hover:scale-110 transition-transform">
                              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-2">Full Mock Exam</h3>
                          <p className="text-slate-500 text-sm">Randomized, rigid questions covering various courses for your level. Simulates real exam conditions.</p>
                      </button>
                  </div>

                  {/* Leaderboard */}
                  <div className="mt-16 max-w-2xl mx-auto w-full">
                      <h3 className="text-center font-bold text-slate-400 uppercase tracking-widest text-xs mb-6">Hall of Fame</h3>
                      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                          {leaderboard.length > 0 ? leaderboard.map((entry, idx) => (
                              <div key={idx} className={`flex items-center justify-between p-4 ${idx === 0 ? 'bg-amber-50' : idx === 1 ? 'bg-slate-50' : idx === 2 ? 'bg-orange-50' : ''}`}>
                                  <div className="flex items-center gap-4">
                                      <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm 
                                          ${idx===0?'bg-amber-100 text-amber-600':idx===1?'bg-slate-200 text-slate-600':idx===2?'bg-orange-100 text-orange-600':'bg-slate-100 text-slate-400'}`}>
                                          {idx + 1}
                                      </div>
                                      <span className={`font-bold ${idx < 3 ? 'text-slate-900' : 'text-slate-600'}`}>@{entry.username}</span>
                                  </div>
                                  <div className="flex gap-4 items-center">
                                      <span className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded text-slate-500 uppercase tracking-wide">{entry.level}L</span>
                                      <span className={`font-mono font-bold text-lg ${idx === 0 ? 'text-amber-500' : 'text-emerald-600'}`}>{entry.score}%</span>
                                  </div>
                              </div>
                          )) : <div className="p-4 text-center text-slate-400 text-sm">No records yet. Be the first!</div>}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (stage === 'setup') {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 animate-fade-in-up">
                  <button onClick={() => setStage('menu')} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-1 text-sm font-bold">
                      &larr; Back
                  </button>
                  
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Configure {mode === 'topic' ? 'Practice' : 'Exam'}</h2>
                  
                  <div className="space-y-6">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Select Level</label>
                          <div className="grid grid-cols-4 gap-2">
                              {LEVELS.map(lvl => (
                                  <button
                                      key={lvl}
                                      onClick={() => setSelectedLevel(lvl)}
                                      className={`py-2 rounded-lg font-bold text-sm border-2 transition-all ${selectedLevel === lvl ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 text-slate-500 hover:border-indigo-300'}`}
                                  >
                                      {lvl}
                                  </button>
                              ))}
                          </div>
                      </div>

                      {mode === 'topic' && (
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Focus Topic</label>
                              <input 
                                type="text" 
                                value={topic} 
                                onChange={e => setTopic(e.target.value)}
                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-0 outline-none font-medium"
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
              
              <h2 className="text-xl font-mono font-bold tracking-wide animate-pulse text-center mb-4">ESTABLISHING SECURE CONNECTION...</h2>
              <p className="text-indigo-300 text-sm mt-3 text-center opacity-80 mb-8">Retrieving {selectedLevel} Level Examination Packet from AI Core</p>

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
          <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
              <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
                  <div className={`p-10 text-center text-white ${score >= 50 ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                      <h1 className="text-4xl font-bold mb-2 font-serif">{score >= 50 ? 'Excellent Work!' : 'Study Harder!'}</h1>
                      <div className="text-8xl font-black mb-2 tracking-tighter">{score}<span className="text-4xl">%</span></div>
                      <p className="opacity-90 font-medium">You answered {Math.round((score / 100) * questions.length)} of {questions.length} questions correctly.</p>
                  </div>
                  
                  <div className="p-8 bg-slate-50">
                      <div className="flex gap-4">
                          <button onClick={() => { setStage('menu'); setQuestions([]); setScore(0); }} className="flex-1 py-4 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition shadow-sm">
                              Back to Menu
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

  // EXAM UI
  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
        {/* Header */}
        <header className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700">{auth?.user?.name.charAt(0)}</div>
                <div className="hidden md:block">
                    <h3 className="font-bold text-slate-800 text-sm">{mode === 'topic' ? 'Practice Mode' : 'Mock Exam'}</h3>
                    <p className="text-xs text-slate-500">{selectedLevel} Level • {questions.length} Questions</p>
                </div>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={() => setShowCalculator(!showCalculator)} 
                    className={`p-2 rounded-lg transition-colors ${showCalculator ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                    title="Toggle Calculator"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </button>
                <button onClick={() => window.confirm("Submit Exam?") && finishTest()} className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 text-sm">Submit Exam</button>
            </div>
        </header>

        <div className="flex-1 container mx-auto max-w-6xl p-4 flex flex-col md:flex-row gap-6">
            
            {/* Question Card */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between">
                    <span className="font-bold text-slate-700">Question {currentQuestionIndex + 1}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase">Select Option</span>
                </div>
                <div className="p-8 md:p-12 flex-grow overflow-y-auto">
                    <h2 className="text-xl md:text-2xl font-serif font-medium text-slate-900 leading-relaxed mb-8">{currentQ.text}</h2>
                    <div className="space-y-3">
                        {currentQ.options.map((opt, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-slate-100 hover:border-indigo-200 text-slate-600'}`}
                            >
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${userAnswers[currentQuestionIndex] === idx ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-300 text-slate-400'}`}>{String.fromCharCode(65+idx)}</span>
                                <span className="font-medium">{opt}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between">
                    <button 
                        disabled={currentQuestionIndex === 0}
                        onClick={() => setCurrentQuestionIndex(p => p - 1)}
                        className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-white disabled:opacity-50"
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
            <div className="w-full md:w-72 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-fit">
                <div className="p-4 border-b border-slate-100 font-bold text-center text-sm text-slate-800 uppercase">Question Map</div>
                <div className="p-4 grid grid-cols-5 gap-2">
                    {questions.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentQuestionIndex(idx)}
                            className={`aspect-square rounded-lg font-bold text-xs flex items-center justify-center transition-all ${currentQuestionIndex === idx ? 'ring-2 ring-indigo-600 bg-indigo-50 text-indigo-700' : userAnswers[idx] !== undefined ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                        >
                            {idx + 1}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100 space-y-2">
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

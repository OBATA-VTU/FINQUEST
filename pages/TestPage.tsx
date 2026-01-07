
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleGenAI } from "@google/genai";
import { useNotification } from '../contexts/NotificationContext';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { LEVELS } from '../constants';
import { Level, User } from '../types';
import { generateTestReviewPDF } from '../utils/pdfGenerator';
import { trackAiUsage } from '../utils/api';
import { Calculator } from '../components/Calculator';
import { fallbackQuestions, triviaQuestions, timelineQuestions } from '../utils/fallbackQuestions';
import { checkAndAwardBadges } from '../utils/badges';

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

type TestMode = 'mock' | 'ai' | 'trivia' | 'timeline';
type ViewState = 'select_mode' | 'configure' | 'loading' | 'in_game' | 'results';

const getSessionKey = (userId: string) => `cbt_session_${userId}`;

export const TestPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    
    // UI State
    const [view, setView] = useState<ViewState>('select_mode');
    const [selectedMode, setSelectedMode] = useState<TestMode | null>(null);

    // Config State
    const [level, setLevel] = useState<Level>(auth?.user?.level || 100);
    const [topic, setTopic] = useState('');
    
    // Game State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showCalculator, setShowCalculator] = useState(false);
    
    const sessionRef = useRef<any>(null); // Holds session data to avoid stale closures

    // Load session on mount or user change
    useEffect(() => {
        if (!auth?.user) return;
        
        const sessionKey = getSessionKey(auth.user.id);
        const savedSessionJSON = localStorage.getItem(sessionKey);

        if (savedSessionJSON) {
            try {
                const savedSession = JSON.parse(savedSessionJSON);
                const now = Date.now();
                const timeLeftSeconds = Math.round((savedSession.sessionEndTime - now) / 1000);

                if (timeLeftSeconds > 1) {
                    showNotification("Resuming your previous test session.", "info");
                    setQuestions(savedSession.questions);
                    setUserAnswers(savedSession.userAnswers || {});
                    setCurrentQuestionIndex(savedSession.currentQuestionIndex || 0);
                    setSelectedMode(savedSession.mode);
                    setTimeLeft(timeLeftSeconds);
                    setScore(savedSession.score || 0);
                    sessionRef.current = savedSession;
                    setView('in_game');
                } else {
                    showNotification("Previous session timed out and was auto-submitted.", "warning");
                    endTest(savedSession.questions, savedSession.userAnswers || {});
                }
            } catch (e) {
                console.error("Failed to restore session", e);
                localStorage.removeItem(sessionKey);
            }
        }
    }, [auth?.user]);
    
    // Save session state whenever it changes during a game
    useEffect(() => {
        if (view === 'in_game' && auth?.user && questions.length > 0) {
            const sessionKey = getSessionKey(auth.user.id);
            const sessionEndTime = sessionRef.current?.sessionEndTime || (Date.now() + timeLeft * 1000);
            
            const sessionData = {
                mode: selectedMode,
                questions,
                userAnswers,
                currentQuestionIndex,
                sessionEndTime,
                score 
            };
            
            sessionRef.current = sessionData;
            localStorage.setItem(sessionKey, JSON.stringify(sessionData));
        }
    }, [userAnswers, currentQuestionIndex, questions, view, score, auth?.user, selectedMode]);

    // Timer logic
    useEffect(() => {
        let timer: any;
        if (view === 'in_game') {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        endTest();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [view]);

    const resetState = () => {
      if (auth?.user) localStorage.removeItem(getSessionKey(auth.user.id));
      sessionRef.current = null;
      setView('select_mode');
      setSelectedMode(null);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setScore(0);
    };

    const handleSelectMode = (mode: TestMode) => {
        setSelectedMode(mode);
        setView('configure');
    };

    const startSession = (generatedQuestions: Question[], duration: number) => {
        if (!auth?.user) return;
        const sessionKey = getSessionKey(auth.user.id);
        const sessionEndTime = Date.now() + duration * 1000;
        
        const sessionData = {
            mode: selectedMode,
            questions: generatedQuestions,
            userAnswers: {},
            currentQuestionIndex: 0,
            sessionEndTime,
            score: 0
        };
        
        sessionRef.current = sessionData;
        localStorage.setItem(sessionKey, JSON.stringify(sessionData));
        
        setQuestions(generatedQuestions);
        setUserAnswers({});
        setCurrentQuestionIndex(0);
        setScore(0);
        setTimeLeft(duration);
        setView('in_game');
    };
    
    const startStandardMock = () => {
        setView('loading');
        const filtered = fallbackQuestions.filter(q => q.level === level).sort(() => 0.5 - Math.random()).slice(0, 10);
        startSession(filtered.length > 0 ? filtered : fallbackQuestions.slice(0, 10), 600); // 10 minutes
    };

    const startAiMastery = async () => {
        if (!topic.trim()) { showNotification("Please enter a study topic.", "warning"); return; }
        setView('loading');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate 10 university-level multiple-choice finance questions for level ${level} on topic: "${topic}". Return JSON: Array<{id:number, text:string, options:string[4], correctAnswer:number(0-3)}>.`;
            const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
            trackAiUsage();
            startSession(JSON.parse(result.text.trim()), 900); // 15 minutes
        } catch (error) {
            showNotification("AI engine busy. Starting a standard mock instead.", "info");
            startStandardMock();
        }
    };
    
    // This function can now be called with specific data for auto-submission
    const endTest = async (qs: Question[] = questions, ans: Record<number, number> = userAnswers) => {
        if (view === 'results') return; // Prevent double submission
        
        const correct = qs.reduce((acc, q, i) => acc + (ans[i] === q.correctAnswer ? 1 : 0), 0);
        const finalScore = qs.length > 0 ? Math.round((correct / qs.length) * 100) : 0;
        setScore(finalScore);
        setView('results');
        
        if (auth?.user) {
            localStorage.removeItem(getSessionKey(auth.user.id));
            sessionRef.current = null;
            await addDoc(collection(db, 'test_results'), { userId: auth.user.id, score: finalScore, level, topic: selectedMode === 'ai' ? topic : 'Standard Mock', date: new Date().toISOString(), totalQuestions: qs.length });
            if (finalScore >= 50) {
                const userRef = doc(db, 'users', auth.user.id);
                await updateDoc(userRef, { contributionPoints: increment(finalScore >= 80 ? 10 : 5) });
                const snap = await getDoc(userRef);
                if (snap.exists()) {
                    const newBadges = await checkAndAwardBadges({ id: snap.id, ...snap.data() } as User);
                    if (newBadges.length > 0) await updateDoc(userRef, { badges: [...(snap.data().badges || []), ...newBadges] });
                }
            }
        }
    };

    // RENDER STATES
    if (view === 'loading') return <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 dark:text-slate-300"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div><p className="font-bold">Loading Session...</p></div>;

    if (view === 'results') return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl w-full max-w-lg text-center border dark:border-slate-800 animate-pop-in">
                <h2 className="text-2xl font-serif font-bold mb-2 text-slate-800 dark:text-slate-100">Session Summary</h2>
                <div className={`text-7xl font-black my-4 ${score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>{score}%</div>
                <p className="text-slate-500 dark:text-slate-400 mb-8">You've completed the practice session.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={resetState} className="py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100">New Session</button>
                    <button onClick={() => generateTestReviewPDF(questions, userAnswers, score, auth?.user)} className="py-3 bg-indigo-600 text-white rounded-xl font-bold">Review PDF</button>
                </div>
            </div>
        </div>
    );

    if (view === 'in_game') {
        const q = questions[currentQuestionIndex];
        if(!q) {
            // This can happen if state is corrupt, reset to be safe
            resetState();
            return null;
        }
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8">
                {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-10 shadow-lg animate-fade-in-up">
                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-4">Question {currentQuestionIndex + 1} of {questions.length}</p>
                        <p className="text-lg md:text-xl font-medium text-slate-800 dark:text-slate-100 mb-10 min-h-[100px]">{q.text}</p>
                        <div className="space-y-4">
                            {q.options.map((opt, idx) => (
                                <button key={idx} onClick={() => setUserAnswers({...userAnswers, [currentQuestionIndex]: idx})} className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center gap-4 group ${userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'}`}>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'}`}>
                                        {userAnswers[currentQuestionIndex] === idx && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{opt}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="w-full lg:w-80">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-lg mb-6 text-center">
                            <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Time Remaining</p>
                            <div className="font-mono text-5xl font-black text-rose-500">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-lg">
                            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-800 dark:text-slate-100">Progress</h3><button onClick={() => setShowCalculator(true)} className="text-xs font-bold flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">Calculator</button></div>
                            <div className="grid grid-cols-5 gap-2 mb-6">{questions.map((_, i) => <button key={i} onClick={() => setCurrentQuestionIndex(i)} className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${currentQuestionIndex === i ? 'bg-indigo-600 text-white scale-110' : userAnswers[i] !== undefined ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200' : 'bg-slate-100 dark:bg-slate-800'}`}>{i+1}</button>)}</div>
                            <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                                <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(p => p - 1)} className="px-5 py-2 rounded-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">Previous</button>
                                {currentQuestionIndex === (questions.length - 1) ? <button onClick={() => endTest()} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">Submit</button> : <button onClick={() => setCurrentQuestionIndex(p => p + 1)} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Next</button>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    if (view === 'configure') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 animate-fade-in flex flex-col items-center justify-center">
                <div className="w-full max-w-lg bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800">
                    <button onClick={() => setView('select_mode')} className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 flex items-center gap-2">← Back to Modes</button>
                    <h2 className="text-2xl font-bold font-serif mb-6 text-slate-800 dark:text-white">{selectedMode === 'mock' ? 'Configure Standard Mock' : 'Configure AI Session'}</h2>
                    <div className="space-y-6">
                        <div>
                            <label className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 block">Select Your Level</label>
                            <div className="flex flex-wrap gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">{LEVELS.filter(l => typeof l === 'number').map(l => <button key={l} onClick={() => setLevel(l as Level)} className={`flex-1 px-4 py-3 rounded-lg text-sm font-black transition-all ${level === l ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white'}`}>{l}L</button>)}</div>
                        </div>
                        {selectedMode === 'ai' && (
                            <div>
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 block">Enter Topic</label>
                                <input type="text" placeholder="e.g., Capital Budgeting" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full p-4 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none" />
                            </div>
                        )}
                        <button onClick={selectedMode === 'mock' ? startStandardMock : startAiMastery} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-transform hover:-translate-y-1">Start Session</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12"><h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white">FINQUEST Practice Center</h1><p className="text-slate-500 dark:text-slate-400 mt-2">Select your preferred session to begin your quest.</p></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ModeCard title="Standard Mock" description="A 10-question test mirroring the official exam format for your level." onClick={() => handleSelectMode('mock')} color="emerald" icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>} />
                    <ModeCard title="AI Topic Mastery" description="Our AI will generate custom questions on any topic you choose." onClick={() => handleSelectMode('ai')} color="indigo" icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>} />
                </div>
            </div>
        </div>
    );
};

const ModeCard: React.FC<{title: string, description: string, onClick: () => void, icon: React.ReactNode, color: string}> = ({title, description, onClick, icon, color}) => {
    const colors = {
        emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'hover:border-emerald-500/50', iconBg: 'bg-emerald-100 dark:bg-emerald-900', iconText: 'text-emerald-600 dark:text-emerald-300', button: 'bg-emerald-600 hover:bg-emerald-700' },
        indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'hover:border-indigo-500/50', iconBg: 'bg-indigo-100 dark:bg-indigo-900', iconText: 'text-indigo-600 dark:text-indigo-300', button: 'bg-indigo-600 hover:bg-indigo-700' },
        rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'hover:border-rose-500/50', iconBg: 'bg-rose-100 dark:bg-rose-900', iconText: 'text-rose-600 dark:text-rose-300', button: 'bg-rose-600 hover:bg-rose-700' },
        amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'hover:border-amber-500/50', iconBg: 'bg-amber-100 dark:bg-amber-900', iconText: 'text-amber-600 dark:text-amber-300', button: 'bg-amber-600 hover:bg-amber-700' },
    };
    const c = colors[color as keyof typeof colors];
    return (
        <div className={`bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col group transition-all ${c.border} hover:shadow-xl`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${c.iconBg} ${c.iconText}`}>{icon}</div>
            <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 flex-1">{description}</p>
            <button onClick={onClick} className={`w-full py-4 text-white font-bold rounded-2xl transition-transform hover:-translate-y-1 ${c.button}`}>Start Session</button>
        </div>
    );
};

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
import { fallbackQuestions } from '../utils/fallbackQuestions';
import { checkAndAwardBadges } from '../utils/badges';
import { useNavigate } from 'react-router-dom';

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}
type GameState = 'setup' | 'loading' | 'testing' | 'results';

export const TestPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [gameState, setGameState] = useState<GameState>('setup');
    const [level, setLevel] = useState<Level>(auth?.user?.level || 100);
    const [activeSessionType, setActiveSessionType] = useState<'mock' | 'ai'>('mock');
    const [topic, setTopic] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(600);
    const [showCalculator, setShowCalculator] = useState(false);
    const timerRef = useRef<any>(null);

    useEffect(() => {
        if (gameState === 'testing') {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) { endTest(); return 0; }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [gameState]);

    const startStandardMock = () => {
        setGameState('loading');
        setActiveSessionType('mock');
        setTimeLeft(600);
        // Pull 10 random questions from level bank
        const filtered = fallbackQuestions
            .filter(q => q.level === level)
            .sort(() => 0.5 - Math.random())
            .slice(0, 10);
        
        if (filtered.length === 0) {
            showNotification("No questions available for this level yet.", "info");
            setQuestions(fallbackQuestions.slice(0, 10));
        } else {
            setQuestions(filtered);
        }
        setGameState('testing');
    };

    const startAiMastery = async () => {
        if (!topic.trim()) {
            showNotification("Please enter a study topic.", "warning");
            return;
        }
        setGameState('loading');
        setActiveSessionType('ai');
        setTimeLeft(900); // More time for AI questions
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate 10 university-level multiple-choice finance questions for level ${level} on topic: "${topic}". Return JSON: Array<{id:number, text:string, options:string[4], correctAnswer:number(0-3)}>.`;
            const result = await ai.models.generateContent({ 
                model: 'gemini-3-flash-preview', 
                contents: prompt, 
                config: { responseMimeType: 'application/json' } 
            });
            trackAiUsage();
            setQuestions(JSON.parse(result.text.trim()));
            setGameState('testing');
        } catch (error) {
            showNotification("AI engine busy. Starting a relevant mock instead.", "info");
            startStandardMock();
        }
    };

    const endTest = async () => {
        clearInterval(timerRef.current);
        const correct = questions.reduce((acc, q, i) => acc + (userAnswers[i] === q.correctAnswer ? 1 : 0), 0);
        const finalScore = Math.round((correct / questions.length) * 100);
        setScore(finalScore);
        setGameState('results');
        
        if (auth?.user) {
            await addDoc(collection(db, 'test_results'), { 
                userId: auth.user.id, 
                score: finalScore, 
                level, 
                topic: activeSessionType === 'ai' ? topic : 'Standard Mock', 
                date: new Date().toISOString(),
                totalQuestions: questions.length
            });
            if (finalScore >= 50) {
                const userRef = doc(db, 'users', auth.user.id);
                await updateDoc(userRef, { contributionPoints: increment(finalScore >= 80 ? 10 : 5) });
                const snap = await getDoc(userRef);
                if (snap.exists()) {
                    const newBadges = await checkAndAwardBadges({ id: snap.id, ...snap.data() } as User);
                    if (newBadges.length > 0) {
                        await updateDoc(userRef, { badges: [...(snap.data().badges || []), ...newBadges] });
                    }
                }
            }
        }
    };

    if (gameState === 'setup') return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-serif font-bold text-slate-900 dark:text-white mb-4">CBT Training Center</h1>
                    <p className="text-slate-600 dark:text-slate-400">Master your exams through simulated testing and AI drills.</p>
                </div>

                <div className="flex flex-wrap justify-center gap-4 mb-10">
                    {LEVELS.filter(l => typeof l === 'number').map(l => (
                        <button 
                            key={l}
                            onClick={() => setLevel(l as Level)}
                            className={`px-8 py-2.5 rounded-full font-black transition-all border-2 ${level === l ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600'}`}
                        >
                            {l} Level
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Card 1: Standard Mock (Requested as Mode 1) */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col group hover:border-emerald-500 transition-all hover:-translate-y-1">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                            <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 font-serif">Examination Simulation</h3>
                        <p className="text-sm text-slate-500 mb-8 flex-1 leading-relaxed">The definitive departmental mock exam. Simulates exact time constraints and verified question distributions for your level.</p>
                        <button onClick={startStandardMock} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg hover:bg-emerald-700 transition-all active:scale-95 uppercase tracking-widest text-xs">Start Mock Exam</button>
                    </div>

                    {/* Card 2: AI Study Mastery (Requested as Mode 2) */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col group hover:border-indigo-500 transition-all hover:-translate-y-1">
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                            <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 font-serif">AI Topic Mastery</h3>
                        <p className="text-sm text-slate-500 mb-6 flex-1 leading-relaxed">Focus your study on a single complex topic. Our AI engine generates customized questions to sharpen your expertise.</p>
                        <input 
                            type="text" 
                            placeholder="Enter Topic (e.g. Leverage)" 
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl mb-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                        <button onClick={startAiMastery} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-widest text-xs">Generate Session</button>
                    </div>

                    {/* Card 3: FINQUEST Arcade (Requested addition) */}
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 shadow-2xl flex flex-col group hover:scale-[1.02] transition-all relative overflow-hidden border border-indigo-500/30">
                        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
                        <div className="w-16 h-16 bg-white/10 text-indigo-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform backdrop-blur-md border border-white/10">
                            <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a2 2 0 11-4 0V4zM4 14a2 2 0 114 0v1a2 2 0 11-4 0v-1zM17 14a2 2 0 114 0v1a2 2 0 11-4 0v-1z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 11V9a2 2 0 012-2h12a2 2 0 012 2v2M4 19v-2a2 2 0 012-2h12a2 2 0 012 2v2M4 15h16" /></svg>
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 font-serif">FINQUEST Arcade</h3>
                        <p className="text-sm text-indigo-100/70 mb-8 flex-1 leading-relaxed">The ultimate learning experience. Answer trivia, order historical timelines, and compete for the top of the leaderboard in gamified sessions.</p>
                        <button onClick={() => navigate('/arcade')} className="w-full py-4 bg-white text-indigo-950 font-black rounded-2xl shadow-xl hover:bg-indigo-50 transition-all active:scale-95 uppercase tracking-widest text-xs">Enter Arcade</button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (gameState === 'loading') return <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950"><div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent shadow-indigo-500/20"></div><p className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs animate-pulse">Initializing Portal...</p></div>;

    if (gameState === 'results') return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] shadow-2xl w-full max-w-lg text-center border border-slate-100 dark:border-slate-800 animate-pop-in">
                <h2 className="text-3xl font-serif font-black mb-2 text-slate-900 dark:text-white">Session Analysis</h2>
                <p className="text-slate-500 mb-10 font-medium">{activeSessionType === 'ai' ? `AI Study: ${topic}` : 'Official Simulation'}</p>
                <div className={`text-8xl font-black mb-6 tracking-tighter ${score >= 70 ? 'text-emerald-500' : score >= 50 ? 'text-indigo-500' : 'text-rose-500'}`}>{score}%</div>
                <p className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.2em] text-[10px] mb-12">{score >= 70 ? 'Academic Distinction' : score >= 50 ? 'Portal Certified' : 'Review Required'}</p>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setGameState('setup')} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">Back to Hub</button>
                    <button onClick={() => generateTestReviewPDF(questions, userAnswers, score, auth?.user)} className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all">Review Results</button>
                </div>
            </div>
        </div>
    );

    const q = questions[currentQuestionIndex];
    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 min-h-[90vh]">
            {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 md:p-12 relative">
                    <div className="flex justify-between items-center mb-10">
                        <span className="px-5 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-black rounded-full uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">ITEM {currentQuestionIndex + 1} OF {questions.length}</span>
                        <div className="flex items-center gap-6">
                            <button onClick={() => setShowCalculator(true)} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-indigo-600 transition-all shadow-sm"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m2 10h-8a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2z" /></svg></button>
                            <div className="px-4 py-2 bg-rose-50 dark:bg-rose-900/20 rounded-xl font-mono text-xl font-black text-rose-600 border border-rose-100 dark:border-rose-800 shadow-sm">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
                        </div>
                    </div>
                    <div className="mb-12">
                        <p className="text-2xl md:text-3xl font-medium text-slate-800 dark:text-white leading-relaxed min-h-[140px] font-serif">{q.text}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options.map((opt, idx) => (
                            <button key={idx} onClick={() => setUserAnswers({...userAnswers, [currentQuestionIndex]: idx})} className={`w-full text-left p-6 rounded-3xl border-2 transition-all flex items-center gap-5 ${userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-100 shadow-md scale-[1.02]' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black shrink-0 text-sm ${userAnswers[currentQuestionIndex] === idx ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800'}`}>{String.fromCharCode(65+idx)}</span>
                                <span className="font-bold text-sm md:text-base">{opt}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-between mt-16 pt-10 border-t border-slate-100 dark:border-slate-800">
                        <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(prev => prev - 1)} className="px-8 py-3 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-indigo-600 disabled:opacity-20 transition-colors">Previous</button>
                        {currentQuestionIndex === (questions.length - 1) ? <button onClick={endTest} className="px-12 py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 active:scale-95 uppercase tracking-widest text-xs">Complete Exam</button> : <button onClick={() => setCurrentQuestionIndex(prev => prev + 1)} className="px-12 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 uppercase tracking-widest text-xs">Next Question</button>}
                    </div>
                </div>
                <div className="w-full lg:w-64 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-[0.2em] border-b border-slate-50 dark:border-slate-800 pb-2">Status Grid</h4>
                        <div className="grid grid-cols-5 gap-3">
                            {questions.map((_, i) => (
                                <button key={i} onClick={() => setCurrentQuestionIndex(i)} className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all ${currentQuestionIndex === i ? 'bg-indigo-600 text-white shadow-xl ring-4 ring-indigo-100 dark:ring-indigo-900/50' : userAnswers[i] !== undefined ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>{i+1}</button>
                            ))}
                        </div>
                    </div>
                    <div className="p-8 bg-indigo-950 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <h4 className="font-black text-sm uppercase tracking-widest mb-3 text-indigo-400">Security Note</h4>
                            <p className="text-[10px] text-indigo-200/60 leading-relaxed font-medium">Session integrity is actively monitored. Progress is committed to permanent storage upon final submission only.</p>
                        </div>
                        <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-700"><svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 4.925-3.467 9.47-8 10.655-4.533-1.185-8-5.73-8-10.655 0-.681.056-1.35.166-2.001zm11.548 4.708a1 1 0 00-1.414-1.414L9 11.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

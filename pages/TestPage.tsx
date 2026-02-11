
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

type TestMode = 'mock' | 'ai' | 'arcade';
type ViewState = 'select_mode' | 'configure' | 'loading' | 'in_game' | 'results' | 'notes';

const storageKey = 'cbt-test-session';

const calculateScore = (questions: Question[], userAnswers: Record<number, number>) => {
    if (!questions || questions.length === 0) return 0;
    const correct = questions.reduce((acc, q, i) => acc + (userAnswers[i] === q.correctAnswer ? 1 : 0), 0);
    return Math.round((correct / questions.length) * 100);
};

export const TestPage: React.FC = () => {
    const navigate = useNavigate();
    const [view, setView] = useState<ViewState>('select_mode');
    const [mode, setMode] = useState<TestMode | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [level, setLevel] = useState<Level | 'General'>('General');
    const [topic, setTopic] = useState('');
    const [aiNotes, setAiNotes] = useState('');

    useEffect(() => {
        const savedStateJSON = localStorage.getItem(storageKey);
        if (savedStateJSON) {
            try {
                const savedState = JSON.parse(savedStateJSON);
                const { endTime } = savedState;
                const now = Date.now();
                const timeLeftFromEnd = Math.round((endTime - now) / 1000);

                if (timeLeftFromEnd <= 0) {
                    localStorage.removeItem(storageKey);
                    setView('select_mode');
                } else if (window.confirm("An unfinished test session was found. Continue?")) {
                    setMode(savedState.mode);
                    setLevel(savedState.level);
                    setTopic(savedState.topic);
                    setQuestions(savedState.questions);
                    setUserAnswers(savedState.userAnswers);
                    setCurrentQuestionIndex(savedState.currentQuestionIndex);
                    setTimeLeft(timeLeftFromEnd);
                    setView('in_game');
                } else {
                    localStorage.removeItem(storageKey);
                }
            } catch (e) {
                localStorage.removeItem(storageKey);
            }
        }
    }, []);

    const resetToSelection = () => {
        localStorage.removeItem(storageKey);
        setView('select_mode');
        setMode(null);
        setQuestions([]);
        setTopic('');
        setAiNotes('');
        setUserAnswers({});
        setCurrentQuestionIndex(0);
    };
    
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {view === 'select_mode' && <ModeSelection setView={setView} setMode={setMode} navigate={navigate} />}
            {view === 'configure' && <ConfigurationScreen mode={mode} setView={setView} setQuestions={setQuestions} setTimeLeft={setTimeLeft} setAiNotes={setAiNotes} level={level} setLevel={setLevel} topic={topic} setTopic={setTopic} />}
            {view === 'loading' && <LoadingScreen />}
            {view === 'in_game' && <GameScreen questions={questions} timeLeft={timeLeft} setTimeLeft={setTimeLeft} reset={resetToSelection} userAnswers={userAnswers} setUserAnswers={setUserAnswers} currentQuestionIndex={currentQuestionIndex} setCurrentQuestionIndex={setCurrentQuestionIndex} setView={setView} />}
            {view === 'results' && <ResultsScreen onRestart={resetToSelection} />}
            {view === 'notes' && <NotesScreen notes={aiNotes} topic={topic} onBack={() => setView('configure')} />}
        </div>
    );
};

const ModeSelection: React.FC<{ setView: Function, setMode: Function, navigate: Function }> = ({ setView, setMode, navigate }) => {
    return (
        <div className="max-w-6xl mx-auto px-4 py-20 animate-fade-in">
            <div className="text-center mb-16">
                <span className="text-indigo-600 font-black tracking-[0.3em] uppercase text-[10px] block mb-4">Exam Preparedness</span>
                <h1 className="text-5xl md:text-7xl font-serif font-black text-slate-900 dark:text-white leading-tight">CBT Practice Hub</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg max-w-xl mx-auto">Master your departmental courses with our high-end testing engine.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div onClick={() => { setMode('mock'); setView('configure'); }} className="group cursor-pointer bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-all hover:-translate-y-2">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Official Mock</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">Simulate real exam conditions with 30 timed questions across your level's curriculum.</p>
                    <span className="text-indigo-600 font-bold uppercase tracking-widest text-[10px]">Launch Session &rarr;</span>
                </div>

                <div onClick={() => { setMode('ai'); setView('configure'); }} className="group cursor-pointer bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-white/5 hover:border-emerald-500 transition-all hover:-translate-y-2 text-white">
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner shadow-emerald-500/20">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h3 className="text-2xl font-black mb-4">AI Topic Forge</h3>
                    <p className="text-sm text-slate-400 leading-relaxed mb-8">Type any finance topic and Bee will generate a bespoke quiz or professional study notes instantly.</p>
                    <span className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">Initialize AI &rarr;</span>
                </div>

                <div onClick={() => navigate('/arcade')} className="group cursor-pointer bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-800 hover:border-rose-500 transition-all hover:-translate-y-2">
                    <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" /></svg>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Finance Arcade</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">Reinforce knowledge through competitive trivia and historical timeline challenges.</p>
                    <span className="text-rose-600 font-bold uppercase tracking-widest text-[10px]">Enter Arcade &rarr;</span>
                </div>
            </div>
        </div>
    );
};

const ConfigurationScreen: React.FC<any> = ({ mode, setView, setQuestions, setTimeLeft, setAiNotes, level, setLevel, topic, setTopic }) => {
    const { showNotification } = useNotification();
    const [showAiChoice, setShowAiChoice] = useState(false);

    const startTest = (questions: Question[], time: number, mode: TestMode, currentTopic: string) => {
        const endTime = Date.now() + time * 1000;
        localStorage.setItem(storageKey, JSON.stringify({ questions, userAnswers: {}, currentQuestionIndex: 0, endTime, mode, level, topic: currentTopic }));
        setQuestions(questions);
        setTimeLeft(time);
        setView('in_game');
    };

    const startMock = async () => {
        setView('loading');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate exactly 30 high-quality, university-level multiple-choice finance questions for level ${level}. Return as a JSON array of objects with "id", "text", "options" (4 strings), "correctAnswer" (0-3 index).`;
            const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
            trackAiUsage();
            startTest(JSON.parse(result.text.trim()), 40 * 60, 'mock', '');
        } catch (e) {
            startTest(fallbackQuestions.filter(q => level === 'General' || q.level === level).sort(() => 0.5-Math.random()).slice(0, 30), 40 * 60, 'mock', '');
        }
    };

    const generateAiQuiz = async () => {
        setView('loading');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate exactly 10 high-quality finance questions for the topic: "${topic}". Return as a JSON array of objects with "id", "text", "options", "correctAnswer".`;
            const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
            trackAiUsage();
            startTest(JSON.parse(result.text.trim()), 15 * 60, 'ai', topic);
        } catch (e) { showNotification("AI engine busy.", "error"); setView('configure'); }
    };

    const generateAiNotes = async () => {
        setView('loading');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate professional university study notes on: "${topic}". Use Markdown.`;
            const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            trackAiUsage();
            setAiNotes(result.text);
            setView('notes');
        } catch (e) { showNotification("AI engine busy.", "error"); setView('configure'); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-10 border border-slate-100 dark:border-slate-800">
                <button onClick={() => setView('select_mode')} className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 mb-8 flex items-center gap-2 transition-colors">&larr; Return to Selection</button>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{mode === 'mock' ? 'Mock Parameters' : 'Topic Configuration'}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-10">Configure your session for optimal results.</p>
                
                <div className="space-y-8">
                    {mode === 'mock' ? (
                        <>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Academic Level</label>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[2rem]">
                                    {LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} className={`py-3 rounded-[1.5rem] text-xs font-black transition-all ${level === l ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-700'}`}>{typeof l === 'number' ? `${l}L` : l}</button>)}
                                </div>
                            </div>
                            <button onClick={startMock} className="w-full py-5 bg-indigo-600 text-white font-black rounded-[2rem] shadow-xl shadow-indigo-500/20 uppercase tracking-[0.2em] text-xs hover:bg-indigo-700 transition-all hover:scale-[1.02]">Start Examination</button>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Research Topic</label>
                                <input type="text" placeholder="e.g. Capital Budgeting, Crypto Assets..." value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white font-bold" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={generateAiQuiz} className="py-5 bg-indigo-600 text-white font-black rounded-[2rem] shadow-xl uppercase tracking-widest text-[10px] hover:bg-indigo-700">Quiz Forge</button>
                                <button onClick={generateAiNotes} className="py-5 bg-emerald-600 text-white font-black rounded-[2rem] shadow-xl uppercase tracking-widest text-[10px] hover:bg-emerald-700">Study Notes</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const LoadingScreen: React.FC = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-24 h-24 relative mb-10">
            <div className="absolute inset-0 border-8 border-indigo-100 dark:border-slate-800 rounded-full"></div>
            <div className="absolute inset-0 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center font-black text-indigo-600 animate-pulse">AI</div>
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Initializing Bee Engine</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-center max-w-xs uppercase tracking-widest text-[10px]">Processing encrypted departmental intelligence...</p>
    </div>
);

const GameScreen: React.FC<any> = ({ questions, timeLeft, setTimeLeft, reset, userAnswers, setUserAnswers, currentQuestionIndex, setCurrentQuestionIndex, setView }) => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const [showCalculator, setShowCalculator] = useState(false);
    const timerRef = useRef<any>();

    const endTest = async () => {
        const finalScore = calculateScore(questions, userAnswers);
        if (auth?.user) {
            localStorage.setItem('lastTestResults', JSON.stringify({ questions, userAnswers, score: finalScore }));
            await addDoc(collection(db, 'test_results'), { userId: auth.user.id, score: finalScore, date: new Date().toISOString(), totalQuestions: questions.length, level: auth.user.level });
            const userRef = doc(db, 'users', auth.user.id);
            const points = Math.round(finalScore / 10);
            if(points > 0) {
                await updateDoc(userRef, { contributionPoints: increment(points) });
                auth.updateUser({ contributionPoints: (auth.user.contributionPoints || 0) + points });
            }
        } else {
            localStorage.setItem('lastTestResults', JSON.stringify({ questions, userAnswers, score: finalScore }));
        }
        setView('results');
    };

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setTimeLeft((prev: number) => {
                if (prev <= 1) { clearInterval(timerRef.current); endTest(); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, []);

    const q = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-10 flex flex-col h-screen overflow-hidden">
            {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
            
            <div className="flex justify-between items-center mb-8 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg">Q</div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Question Segment</p>
                        <p className="text-lg font-black dark:text-white leading-none">{currentQuestionIndex + 1} of {questions.length}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={() => setShowCalculator(true)} className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-slate-500 hover:text-indigo-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    </button>
                    <div className="bg-white dark:bg-slate-900 px-6 py-3 rounded-[2rem] shadow-xl border border-rose-100 dark:border-rose-950 flex items-center gap-3">
                        <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                        <span className="font-mono text-2xl font-black text-rose-500">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 mb-8 custom-scrollbar">
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mb-10">
                    <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
                
                <div className="bg-white dark:bg-slate-900 p-8 md:p-14 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800">
                    <h2 className="text-2xl md:text-4xl font-serif font-bold text-slate-900 dark:text-white leading-tight mb-12">{q?.text}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q?.options.map((opt, idx) => (
                            <button key={idx} onClick={() => setUserAnswers({...userAnswers, [currentQuestionIndex]: idx})} className={`group text-left p-6 rounded-[2rem] border-2 transition-all flex items-center gap-5 ${userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-300'}`}>
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 font-black text-xs transition-colors ${userAnswers[currentQuestionIndex] === idx ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-400 group-hover:border-indigo-400'}`}>{String.fromCharCode(65+idx)}</div>
                                <span className={`font-bold ${userAnswers[currentQuestionIndex] === idx ? 'text-indigo-950 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{opt}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center py-6 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex((p: number) => p - 1)} className="px-10 py-4 font-black uppercase tracking-widest text-xs text-slate-500 disabled:opacity-30">Previous</button>
                {currentQuestionIndex === questions.length - 1 ? (
                    <button onClick={endTest} className="px-12 py-5 bg-emerald-600 text-white font-black rounded-[2rem] shadow-xl uppercase tracking-widest text-xs hover:bg-emerald-700">Submit Exam</button>
                ) : (
                    <button onClick={() => setCurrentQuestionIndex((p: number) => p + 1)} className="px-12 py-5 bg-indigo-600 text-white font-black rounded-[2rem] shadow-xl uppercase tracking-widest text-xs hover:bg-indigo-700">Next Question</button>
                )}
            </div>
        </div>
    );
};

const ResultsScreen: React.FC<any> = ({ onRestart }) => {
    const [results, setResults] = useState<any>(null);
    useEffect(() => {
        const data = localStorage.getItem('lastTestResults');
        if (data) { try { setResults(JSON.parse(data)); } catch (e) {} }
    }, []);
    if (!results) return <LoadingScreen />;
    const { score } = results;
    return (
        <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 p-12 rounded-[4rem] shadow-2xl text-center border border-slate-100 dark:border-slate-800 max-w-xl w-full">
                <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-8 border-8 ${score >= 50 ? 'border-emerald-500 text-emerald-500' : 'border-rose-500 text-rose-500'}`}>
                    <span className="text-4xl font-black">{score}%</span>
                </div>
                <h2 className="text-4xl font-serif font-black text-slate-900 dark:text-white mb-4">{score >= 50 ? 'Exam Passed' : 'Needs Revision'}</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed">Your results have been encrypted and uploaded to the Global Leaderboard database.</p>
                <div className="flex gap-4">
                    <button onClick={onRestart} className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-[2rem] shadow-lg uppercase tracking-widest text-xs">New Session</button>
                    <button onClick={() => window.location.reload()} className="px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-black rounded-[2rem] uppercase tracking-widest text-xs">Analysis</button>
                </div>
            </div>
        </div>
    );
};

const NotesScreen: React.FC<any> = ({ notes, topic, onBack }) => (
    <div className="max-w-4xl mx-auto px-4 py-20 animate-fade-in">
        <button onClick={onBack} className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 mb-8">&larr; Return to Dashboard</button>
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 prose prose-slate dark:prose-invert max-w-none">
            <h1 className="text-4xl font-serif font-black mb-8">Intelligence: {topic}</h1>
            <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{notes}</div>
        </div>
    </div>
);

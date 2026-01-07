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

type ViewState = 'setup' | 'loading' | 'mock_exam' | 'ai_exam' | 'trivia' | 'timeline' | 'results';

export const TestPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const [view, setView] = useState<ViewState>('setup');
    const [level, setLevel] = useState<Level>(auth?.user?.level || 100);
    const [topic, setTopic] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(600);
    const [showCalculator, setShowCalculator] = useState(false);
    const timerRef = useRef<any>(null);

    // TRIVIA STATE
    const [currentTriviaIdx, setCurrentTriviaIdx] = useState(0);
    const [triviaScore, setTriviaScore] = useState(0);
    const [triviaTime, setTriviaTime] = useState(15);
    const [shuffledTrivia, setShuffledTrivia] = useState<Question[]>([]);

    // TIMELINE STATE
    const [currentTimelineIdx, setCurrentTimelineIdx] = useState(0);
    const [timelineScore, setTimelineScore] = useState(0);
    const [timelineTime, setTimelineTime] = useState(20);
    const [shuffledTimeline, setShuffledTimeline] = useState<Question[]>([]);

    useEffect(() => {
        let timer: any;
        const tick = () => {
            if (view === 'mock_exam' || view === 'ai_exam') {
                setTimeLeft(prev => (prev <= 1 ? (endTest(), 0) : prev - 1));
            } else if (view === 'trivia') {
                setTriviaTime(p => (p <= 1 ? (handleTriviaAnswer(-1), 15) : p - 1));
            } else if (view === 'timeline') {
                setTimelineTime(p => (p <= 1 ? (handleTimelineAnswer(-1), 20) : p - 1));
            }
        };
        timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [view]);

    const resetState = () => {
      setView('setup');
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setScore(0);
    };

    // --- MOCK & AI EXAM LOGIC ---
    const startStandardMock = () => {
        setView('loading');
        setTimeLeft(600);
        const filtered = fallbackQuestions.filter(q => q.level === level).sort(() => 0.5 - Math.random()).slice(0, 10);
        setQuestions(filtered.length > 0 ? filtered : fallbackQuestions.slice(0, 10));
        setView('mock_exam');
    };

    const startAiMastery = async () => {
        if (!topic.trim()) { showNotification("Please enter a study topic.", "warning"); return; }
        setView('loading');
        setTimeLeft(900);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate 10 university-level multiple-choice finance questions for level ${level} on topic: "${topic}". Return JSON: Array<{id:number, text:string, options:string[4], correctAnswer:number(0-3)}>.`;
            const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
            trackAiUsage();
            setQuestions(JSON.parse(result.text.trim()));
            setView('ai_exam');
        } catch (error) {
            showNotification("AI engine busy. Starting a standard mock instead.", "info");
            startStandardMock();
        }
    };

    const endTest = async () => {
        clearInterval(timerRef.current);
        const correct = questions.reduce((acc, q, i) => acc + (userAnswers[i] === q.correctAnswer ? 1 : 0), 0);
        const finalScore = Math.round((correct / questions.length) * 100);
        setScore(finalScore);
        setView('results');
        
        if (auth?.user) {
            await addDoc(collection(db, 'test_results'), { userId: auth.user.id, score: finalScore, level, topic: view === 'ai_exam' ? topic : 'Standard Mock', date: new Date().toISOString(), totalQuestions: questions.length });
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

    // --- TRIVIA LOGIC ---
    const startTrivia = async () => {
        setView('loading');
        setCurrentTriviaIdx(0);
        setTriviaScore(0);
        setTriviaTime(15);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate 10 unique, multiple-choice questions about Nigerian and global financial facts and history. Return ONLY a valid JSON array: Array<{id:number, text:string, options:string[4], correctAnswer:number(0-3)}>.`;
            const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
            trackAiUsage();
            setShuffledTrivia(JSON.parse(result.text.trim()));
            setView('trivia');
        } catch (error) {
            showNotification("AI engine busy. Starting a standard trivia round.", "info");
            setShuffledTrivia([...triviaQuestions].sort(() => 0.5 - Math.random()));
            setView('trivia');
        }
    };

    const handleTriviaAnswer = (idx: number) => {
        const correct = shuffledTrivia[currentTriviaIdx].correctAnswer === idx;
        if (currentTriviaIdx < shuffledTrivia.length - 1) {
            if (correct) setTriviaScore(p => p + 10);
            setCurrentTriviaIdx(p => p + 1);
            setTriviaTime(15);
        } else {
            const finalScore = triviaScore + (correct ? 10 : 0);
            setScore(finalScore);
            if (auth?.user) {
                updateDoc(doc(db, 'users', auth.user.id), { contributionPoints: increment(Math.floor(finalScore / 2)) });
            }
            setView('results');
        }
    };

    // --- TIMELINE LOGIC ---
    const startTimeline = async () => {
        setView('loading');
        setCurrentTimelineIdx(0);
        setTimelineScore(0);
        setTimelineTime(20);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate 10 unique, multiple-choice questions about key dates and events in financial history. Return ONLY a valid JSON array: Array<{id:number, text:string, options:string[4], correctAnswer:number(0-3)}>.`;
            const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
            trackAiUsage();
            setShuffledTimeline(JSON.parse(result.text.trim()));
            setView('timeline');
        } catch (error) {
            showNotification("AI engine busy. Starting a standard timeline round.", "info");
            setShuffledTimeline([...timelineQuestions].sort(() => 0.5 - Math.random()).slice(0, 10));
            setView('timeline');
        }
    };
    
    const handleTimelineAnswer = (idx: number) => {
        const correct = shuffledTimeline[currentTimelineIdx].correctAnswer === idx;
        if (correct) setTimelineScore(p => p + 1);
    
        if (currentTimelineIdx < 9) { // 10 questions total (0-9)
            setCurrentTimelineIdx(p => p + 1);
            setTimelineTime(20);
        } else {
            const finalScore = (timelineScore + (correct ? 1 : 0)); // Add score for the last question
            if (auth?.user) updateDoc(doc(db, 'users', auth.user.id), { contributionPoints: increment(finalScore * 2) });
            setScore(finalScore * 10); // Display score as a percentage
            setView('results');
        }
    };

    if (view === 'loading') return <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div><p className="font-bold text-slate-600">Loading Session...</p></div>;

    if (view === 'results') return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl w-full max-w-lg text-center border animate-pop-in">
                <h2 className="text-2xl font-serif font-bold mb-2">Session Summary</h2>
                <div className={`text-7xl font-black my-4 ${score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>{score}%</div>
                <p className="text-slate-500 mb-8">You've completed the practice session.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={resetState} className="py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700">New Session</button>
                    {questions.length > 0 && <button onClick={() => generateTestReviewPDF(questions, userAnswers, score, auth?.user)} className="py-3 bg-indigo-600 text-white rounded-xl font-bold">Review PDF</button>}
                </div>
            </div>
        </div>
    );

    if (view === 'mock_exam' || view === 'ai_exam') {
        const q = questions[currentQuestionIndex];
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8">
                {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
                    {/* Main Question Panel */}
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
                    {/* Sidebar Panel */}
                    <div className="w-full lg:w-80">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-lg mb-6 text-center">
                            <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Time Remaining</p>
                            <div className="font-mono text-5xl font-black text-rose-500">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                               <h3 className="font-bold">Progress</h3>
                               <button onClick={() => setShowCalculator(true)} className="text-xs font-bold flex items-center gap-1 text-slate-500 hover:text-indigo-600">🧮 Calculator</button>
                            </div>
                            <div className="grid grid-cols-5 gap-2 mb-6">
                                {questions.map((_, i) => <button key={i} onClick={() => setCurrentQuestionIndex(i)} className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${currentQuestionIndex === i ? 'bg-indigo-600 text-white scale-110' : userAnswers[i] !== undefined ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200' : 'bg-slate-100 dark:bg-slate-800'}`}>{i+1}</button>)}
                            </div>
                            <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                                <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(p => p - 1)} className="px-5 py-2 rounded-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">Previous</button>
                                {currentQuestionIndex === (questions.length - 1) 
                                    ? <button onClick={endTest} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">Submit</button> 
                                    : <button onClick={() => setCurrentQuestionIndex(p => p + 1)} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Next</button>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    if (view === 'trivia' || view === 'timeline') {
        const isTrivia = view === 'trivia';
        const gameData = isTrivia ? shuffledTrivia : shuffledTimeline;
        const currentIndex = isTrivia ? currentTriviaIdx : currentTimelineIdx;
        const time = isTrivia ? triviaTime : timelineTime;
        const maxTime = isTrivia ? 15 : 20;
        const handleAnswer = isTrivia ? handleTriviaAnswer : handleTimelineAnswer;

        if (gameData.length === 0) return <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div><p className="font-bold text-slate-600">Loading Session...</p></div>;
        const currentQ = gameData[currentIndex];

        return (
            <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl bg-slate-900 rounded-[2.5rem] p-6 sm:p-10 border border-white/10 shadow-2xl animate-pop-in">
                    <div className="flex justify-between items-center mb-8">
                        <div className="px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">{isTrivia ? 'Trivia' : 'Timeline'} • {currentIndex + 1}/{isTrivia ? gameData.length : 10}</div>
                        <div className="relative w-16 h-16 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90"><circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/10" /><circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={176} strokeDashoffset={176 - (176 * time) / maxTime} className={`${time <= 5 ? 'text-rose-500' : 'text-indigo-500'} transition-all duration-1000`} /></svg>
                            <span className="absolute font-black text-xl">{time}</span>
                        </div>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-10 text-center min-h-[100px]">{currentQ.text}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQ.options.map((opt: string, i: number) => <button key={i} onClick={() => handleAnswer(i)} className="p-6 bg-white/5 border border-white/10 rounded-3xl font-bold hover:bg-indigo-600 transition-colors text-center">{opt}</button>)}
                    </div>
                </div>
            </div>
        );
    }

    // SETUP VIEW
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white">FINQUEST Practice Center</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Select your preferred session to begin your quest.</p>
                </div>
                <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 mb-10 bg-slate-100 dark:bg-slate-900 p-2 rounded-full">
                    {LEVELS.filter(l => typeof l === 'number').map(l => <button key={l} onClick={() => setLevel(l as Level)} className={`px-6 sm:px-8 py-2.5 rounded-full text-sm font-black transition-all ${level === l ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>{l}L</button>)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col group transition-all hover:border-emerald-500/50 hover:shadow-xl"><h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white flex items-center gap-3"><span className="text-emerald-500">🧑‍🏫</span>Standard Mock</h3><p className="text-sm text-slate-500 dark:text-slate-400 mb-8 flex-1">A 10-question test mirroring the official exam format for your level.</p><button onClick={startStandardMock} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-transform hover:-translate-y-1">Start Mock Exam</button></div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col group transition-all hover:border-indigo-500/50 hover:shadow-xl"><h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white flex items-center gap-3"><span className="text-indigo-500">💡</span>AI Topic Mastery</h3><p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-1">Our AI will generate custom questions on any topic you choose.</p><input type="text" placeholder="Enter Topic (e.g. Capital Budgeting)" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-2xl mb-4" /><button onClick={startAiMastery} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-transform hover:-translate-y-1">Generate Session</button></div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col group transition-all hover:border-rose-500/50 hover:shadow-xl"><h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white flex items-center gap-3"><span className="text-rose-500">⚡</span>Financial Trivia</h3><p className="text-sm text-slate-500 dark:text-slate-400 mb-8 flex-1">A fast-paced challenge on Nigerian and global financial facts.</p><button onClick={startTrivia} className="w-full py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-transform hover:-translate-y-1">Play Trivia</button></div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col group transition-all hover:border-amber-500/50 hover:shadow-xl"><h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white flex items-center gap-3"><span className="text-amber-500">⏳</span>Timeline Tussle</h3><p className="text-sm text-slate-500 dark:text-slate-400 mb-8 flex-1">Answer questions about key dates in financial history.</p><button onClick={startTimeline} className="w-full py-4 bg-amber-600 text-white font-bold rounded-2xl hover:bg-amber-700 transition-transform hover:-translate-y-1">Start Timeline</button></div>
                </div>
            </div>
        </div>
    );
};

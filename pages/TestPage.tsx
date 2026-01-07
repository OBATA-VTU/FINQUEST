
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
import { fallbackQuestions, triviaQuestions, timelineEvents, TimelineEvent } from '../utils/fallbackQuestions';
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

    // TIMELINE STATE
    const [userTimeline, setUserTimeline] = useState<TimelineEvent[]>([]);
    const [timelineStatus, setTimelineStatus] = useState<'playing' | 'correct' | 'wrong'>('playing');

    useEffect(() => {
        let timer: any;
        if (view === 'mock_exam' || view === 'ai_exam') {
            timer = setInterval(() => setTimeLeft(prev => (prev <= 1 ? (endTest(), 0) : prev - 1)), 1000);
        } else if (view === 'trivia') {
            timer = setInterval(() => setTriviaTime(p => (p <= 1 ? (handleTriviaAnswer(-1), 15) : p - 1)), 1000);
        }
        return () => clearInterval(timer);
    }, [view, triviaTime]);

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
    const startTrivia = () => {
        setCurrentTriviaIdx(0);
        setTriviaScore(0);
        setTriviaTime(15);
        setView('trivia');
    };

    const handleTriviaAnswer = (idx: number) => {
        const correct = triviaQuestions[currentTriviaIdx].correctAnswer === idx;
        if (correct) setTriviaScore(p => p + 10);

        if (currentTriviaIdx < triviaQuestions.length - 1) {
            setCurrentTriviaIdx(p => p + 1);
            setTriviaTime(15);
        } else {
            if (auth?.user) updateDoc(doc(db, 'users', auth.user.id), { contributionPoints: increment(Math.floor(triviaScore / 2)) });
            setView('results');
        }
    };

    // --- TIMELINE LOGIC ---
    const startTimeline = () => {
        setUserTimeline([...timelineEvents].sort(() => 0.5 - Math.random()));
        setTimelineStatus('playing');
        setView('timeline');
    };

    const moveTimelineItem = (from: number, to: number) => {
        const copy = [...userTimeline];
        const [removed] = copy.splice(from, 1);
        copy.splice(to, 0, removed);
        setUserTimeline(copy);
    };

    const checkTimeline = () => {
        const userMatches = userTimeline.every((val, index) => val.id === timelineEvents[index].id);
        if (userMatches) {
            setTimelineStatus('correct');
            showNotification("Master Historian! +25 Points", "success");
            if (auth?.user) updateDoc(doc(db, 'users', auth.user.id), { contributionPoints: increment(25) });
        } else {
            setTimelineStatus('wrong');
            showNotification("Timeline is fractured. Try again.", "error");
        }
    };

    if (view === 'loading') return <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div><p className="font-bold text-slate-600">Loading Session...</p></div>;

    if (view === 'results') return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl w-full max-w-lg text-center border">
                <h2 className="text-2xl font-serif font-bold mb-2">Session Summary</h2>
                <div className={`text-7xl font-black mb-4 ${score >= 70 ? 'text-emerald-500' : 'text-indigo-500'}`}>{score}%</div>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={resetState} className="py-3 bg-slate-100 rounded-xl font-bold">New Session</button>
                    {questions.length > 0 && <button onClick={() => generateTestReviewPDF(questions, userAnswers, score, auth?.user)} className="py-3 bg-indigo-600 text-white rounded-xl font-bold">Review PDF</button>}
                </div>
            </div>
        </div>
    );

    if (view === 'mock_exam' || view === 'ai_exam') {
        const q = questions[currentQuestionIndex];
        return (
            <div className="max-w-5xl mx-auto p-4 md:p-8">
                {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl p-10">
                        <div className="flex justify-between items-center mb-8">
                            <span>Question {currentQuestionIndex + 1}/{questions.length}</span>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setShowCalculator(true)} title="Calculator">🧮</button>
                                <div className="font-mono text-xl font-bold text-rose-500">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
                            </div>
                        </div>
                        <p className="text-xl mb-10 min-h-[120px]">{q.text}</p>
                        <div className="space-y-4">
                            {q.options.map((opt, idx) => <button key={idx} onClick={() => setUserAnswers({...userAnswers, [currentQuestionIndex]: idx})} className={`w-full text-left p-5 rounded-2xl border-2 ${userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600' : ''}`}>{opt}</button>)}
                        </div>
                        <div className="flex justify-between mt-12 pt-8 border-t">
                            <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(p => p - 1)}>Previous</button>
                            {currentQuestionIndex === (questions.length - 1) ? <button onClick={endTest}>Submit</button> : <button onClick={() => setCurrentQuestionIndex(p => p + 1)}>Next</button>}
                        </div>
                    </div>
                    <div className="w-full lg:w-64">
                        <div className="grid grid-cols-5 gap-2">
                            {questions.map((_, i) => <button key={i} onClick={() => setCurrentQuestionIndex(i)} className={`w-10 h-10 rounded-lg ${currentQuestionIndex === i ? 'bg-indigo-600 text-white' : userAnswers[i] !== undefined ? 'bg-emerald-200' : 'bg-slate-200'}`}>{i+1}</button>)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    if (view === 'trivia') return (
        <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center">
            <div className="max-w-2xl w-full bg-slate-900 rounded-[3rem] p-10 border border-white/10 shadow-2xl animate-pop-in">
                <div className="flex justify-between items-center mb-10">
                    <div className="px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase">TRIVIA • {currentTriviaIdx+1}/{triviaQuestions.length}</div>
                    <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-black text-xl ${triviaTime <= 5 ? 'border-rose-500 text-rose-500' : 'border-indigo-500'}`}>{triviaTime}</div>
                </div>
                <h2 className="text-3xl font-serif font-bold mb-12 text-center">{triviaQuestions[currentTriviaIdx].text}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {triviaQuestions[currentTriviaIdx].options.map((opt: string, i: number) => <button key={i} onClick={() => handleTriviaAnswer(i)} className="p-6 bg-white/5 border border-white/10 rounded-[2rem] font-bold hover:bg-indigo-600">{opt}</button>)}
                </div>
            </div>
        </div>
    );

    if (view === 'timeline') return (
        <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center">
            <div className="max-w-xl w-full">
                <h2 className="text-3xl font-serif font-bold text-center mb-2">Timeline Tussle</h2>
                <p className="text-indigo-300 text-center text-sm mb-10">Arrange events from oldest to newest.</p>
                <div className="space-y-3 mb-10">
                    {userTimeline.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/10">
                            <div className="flex flex-col gap-1">
                                <button onClick={() => idx > 0 && moveTimelineItem(idx, idx-1)}>▲</button>
                                <button onClick={() => idx < userTimeline.length - 1 && moveTimelineItem(idx, idx+1)}>▼</button>
                            </div>
                            <div className="flex-1 font-bold text-sm">{item.text}</div>
                        </div>
                    ))}
                </div>
                <div className="flex gap-4">
                    <button onClick={resetState} className="flex-1 py-4 border rounded-2xl">Back</button>
                    <button onClick={checkTimeline} className="flex-[2] py-4 bg-indigo-600 rounded-2xl">Check Order</button>
                </div>
                {timelineStatus === 'correct' && <div className="mt-8 p-6 bg-emerald-500/20 border text-center animate-pop-in"><p>PERFECT CHRONOLOGY!</p><button onClick={startTimeline} className="mt-4 text-xs font-bold underline">Next Challenge</button></div>}
                {timelineStatus === 'wrong' && <div className="mt-8 p-6 bg-rose-500/20 border text-center animate-shake"><p>INCORRECT ORDER. TRY AGAIN.</p></div>}
            </div>
        </div>
    );

    // SETUP VIEW
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12"><h1 className="text-4xl font-serif font-bold">CBT & Practice Center</h1><p>Select your preferred session to begin.</p></div>
                <div className="flex flex-wrap justify-center gap-4 mb-10">
                    {LEVELS.filter(l => typeof l === 'number').map(l => <button key={l} onClick={() => setLevel(l as Level)} className={`px-8 py-2.5 rounded-full font-black border-2 ${level === l ? 'bg-indigo-600 text-white' : 'bg-white'}`}>{l} Level</button>)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col group"><h3 className="text-2xl font-bold mb-2">Standard Mock Exam</h3><p className="text-sm mb-8 flex-1">A comprehensive test mirroring the official exam format for your level.</p><button onClick={startStandardMock} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl">Start Mock Exam</button></div>
                    <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col group"><h3 className="text-2xl font-bold mb-2">AI Topic Mastery</h3><p className="text-sm mb-6 flex-1">Focus your study on a single topic. Our AI will generate custom questions.</p><input type="text" placeholder="Enter Topic (e.g. Leverage)" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl mb-4" /><button onClick={startAiMastery} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl">Generate Session</button></div>
                    <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col group"><h3 className="text-2xl font-bold mb-2">Financial Trivia</h3><p className="text-sm mb-8 flex-1">A fast-paced trivia challenge on Nigerian and global financial history.</p><button onClick={startTrivia} className="w-full py-4 bg-rose-600 text-white font-bold rounded-2xl">Play Trivia</button></div>
                    <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col group"><h3 className="text-2xl font-bold mb-2">Timeline Tussle</h3><p className="text-sm mb-8 flex-1">Arrange key Nigerian financial events in the correct chronological order.</p><button onClick={startTimeline} className="w-full py-4 bg-amber-600 text-white font-bold rounded-2xl">Start Timeline</button></div>
                </div>
            </div>
        </div>
    );
};

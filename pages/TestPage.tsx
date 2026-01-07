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

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}
type GameState = 'setup' | 'loading' | 'testing' | 'results';

export const TestPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const [gameState, setGameState] = useState<GameState>('setup');
    const [level, setLevel] = useState<Level>(auth?.user?.level || 100);
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

    const startTest = async () => {
        if (!topic.trim()) { showNotification("Please enter a study topic.", "warning"); return; }
        setGameState('loading');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate 10 university-level multiple-choice finance questions for level ${level} on topic: "${topic}". Return JSON: Array<{id:number, text:string, options:string[4], correctAnswer:number(0-3)}>.`;
            const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
            trackAiUsage();
            setQuestions(JSON.parse(result.text.trim()));
            setGameState('testing');
        } catch (error) {
            showNotification("AI unavailable, using standard mock questions.", "info");
            setQuestions(fallbackQuestions.filter(q => q.level === level).sort(() => 0.5 - Math.random()).slice(0, 10));
            setGameState('testing');
        }
    };

    const endTest = async () => {
        clearInterval(timerRef.current);
        const correct = questions.reduce((acc, q, i) => acc + (userAnswers[i] === q.correctAnswer ? 1 : 0), 0);
        const finalScore = Math.round((correct / questions.length) * 100);
        setScore(finalScore);
        setGameState('results');
        if (auth?.user) {
            await addDoc(collection(db, 'test_results'), { userId: auth.user.id, score: finalScore, level, topic, date: new Date().toISOString() });
            if (finalScore >= 50) {
                const userRef = doc(db, 'users', auth.user.id);
                await updateDoc(userRef, { contributionPoints: increment(finalScore >= 80 ? 10 : 5) });
                const snap = await getDoc(userRef);
                if (snap.exists()) {
                    const newBadges = await checkAndAwardBadges({ id: snap.id, ...snap.data() } as User);
                    if (newBadges.length > 0) await updateDoc(userRef, { badges: increment(0) /* triggering update */, badges_list: [...(snap.data().badges || []), ...newBadges] });
                }
            }
        }
    };

    if (gameState === 'setup') return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100 dark:border-slate-800">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 mb-4"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg></div>
                    <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">CBT Practice</h2>
                    <p className="text-slate-500 text-sm">Prepare for exams with AI-generated mocks.</p>
                </div>
                <div className="space-y-4">
                    <div><label className="block text-xs font-bold uppercase text-slate-400 mb-1">Academic Level</label><select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500">{LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}</select></div>
                    <div><label className="block text-xs font-bold uppercase text-slate-400 mb-1">Study Topic</label><input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Capital Structure" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500" /></div>
                    <button onClick={startTest} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all">Start Examination</button>
                </div>
            </div>
        </div>
    );

    if (gameState === 'loading') return <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div><p className="font-bold text-slate-600">Generating Questions...</p></div>;

    if (gameState === 'results') return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl w-full max-w-lg text-center border border-slate-100 dark:border-slate-800 animate-pop-in">
                <h2 className="text-2xl font-serif font-bold mb-2">Examination Finished</h2>
                <p className="text-slate-500 mb-8">Performance Summary for {topic}</p>
                <div className={`text-7xl font-black mb-4 ${score >= 70 ? 'text-emerald-500' : score >= 50 ? 'text-indigo-500' : 'text-rose-500'}`}>{score}%</div>
                <p className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-xs mb-8">{score >= 70 ? 'Excellent' : score >= 50 ? 'Good Pass' : 'Needs Review'}</p>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setGameState('setup')} className="py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold">Try Again</button>
                    <button onClick={() => generateTestReviewPDF(questions, userAnswers, score, auth?.user)} className="py-3 bg-indigo-600 text-white rounded-xl font-bold">Download Review</button>
                </div>
            </div>
        </div>
    );

    const q = questions[currentQuestionIndex];
    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8">
            {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 md:p-10 relative">
                    <div className="flex justify-between items-center mb-8">
                        <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full">QUESTION {currentQuestionIndex + 1} OF 10</span>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setShowCalculator(true)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m2 10h-8a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2z" /></svg></button>
                            <div className="font-mono text-xl font-bold text-rose-500">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
                        </div>
                    </div>
                    <p className="text-xl md:text-2xl font-medium text-slate-800 dark:text-white mb-10 leading-relaxed min-h-[120px]">{q.text}</p>
                    <div className="space-y-4">
                        {q.options.map((opt, idx) => (
                            <button key={idx} onClick={() => setUserAnswers({...userAnswers, [currentQuestionIndex]: idx})} className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center gap-4 ${userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${userAnswers[currentQuestionIndex] === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{String.fromCharCode(65+idx)}</span>
                                <span className="font-medium">{opt}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-between mt-12 pt-8 border-t border-slate-50 dark:border-slate-800">
                        <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(prev => prev - 1)} className="px-6 py-2 text-slate-500 font-bold hover:text-indigo-600 disabled:opacity-30">Previous</button>
                        {currentQuestionIndex === 9 ? <button onClick={endTest} className="px-10 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg hover:bg-rose-700">Submit Exam</button> : <button onClick={() => setCurrentQuestionIndex(prev => prev + 1)} className="px-10 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700">Next Question</button>}
                    </div>
                </div>
                <div className="w-full lg:w-64 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Question Matrix</h4>
                        <div className="grid grid-cols-5 gap-2">
                            {questions.map((_, i) => (
                                <button key={i} onClick={() => setCurrentQuestionIndex(i)} className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${currentQuestionIndex === i ? 'bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-100 dark:ring-indigo-900' : userAnswers[i] !== undefined ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>{i+1}</button>
                            ))}
                        </div>
                    </div>
                    <div className="p-6 bg-indigo-950 rounded-3xl text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10">
                            <h4 className="font-bold mb-2">Exam Integrity</h4>
                            <p className="text-[10px] text-indigo-300 leading-relaxed">Questions are verified and updated regularly. Progress is saved only upon submission.</p>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-10"><svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 4.925-3.467 9.47-8 10.655-4.533-1.185-8-5.73-8-10.655 0-.681.056-1.35.166-2.001zm11.548 4.708a1 1 0 00-1.414-1.414L9 11.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

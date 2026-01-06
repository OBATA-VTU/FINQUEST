

import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleGenAI, Type } from "@google/genai";
import { useNotification } from '../contexts/NotificationContext';
import { db } from '../firebase';
// FIX: Added missing import for getDoc
import { collection, addDoc, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { LEVELS } from '../constants';
import { Level, User } from '../types';
import { generateTestReviewPDF } from '../utils/pdfGenerator';
import { trackAiUsage } from '../utils/api';
import { Calculator } from '../components/Calculator';
import { fallbackQuestions } from '../utils/fallbackQuestions';
// FIX: Added missing import for checkAndAwardBadges
import { checkAndAwardBadges } from '../utils/badges';

// --- TYPES ---
interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}
type GameState = 'setup' | 'loading' | 'testing' | 'results';
type GameMode = 'select' | 'cbt'; // Simplified for now

// --- MAIN PAGE COMPONENT ---
export const TestPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const [gameMode, setGameMode] = useState<GameMode>('select');

    if (!auth?.user) {
        return <div className="p-8 text-center">Please log in to access tests.</div>;
    }

    if (gameMode === 'select') {
        return <GameModeSelection onSelectMode={setGameMode} />;
    }
    if (gameMode === 'cbt') {
        return <CBTTest onBack={() => setGameMode('select')} />;
    }
    return <div>Invalid Game Mode</div>;
};


// --- GAME MODE SELECTION ---
const GameModeSelection: React.FC<{ onSelectMode: (mode: GameMode) => void; }> = ({ onSelectMode }) => (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 animate-fade-in transition-colors">
        <div className="container mx-auto max-w-4xl pt-10">
            <h1 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-2">Practice Center</h1>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-10">Choose a mode to test your knowledge.</p>
            <div className="grid md:grid-cols-2 gap-6">
                <button onClick={() => onSelectMode('cbt')} className="bg-white dark:bg-slate-900 p-8 rounded-3xl text-left border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Standard CBT</h3>
                    <p className="text-slate-500 dark:text-slate-400">Classic mock exam. Choose a topic and level to start.</p>
                </button>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl text-left border border-slate-200 dark:border-slate-700 shadow-sm opacity-50 relative">
                     <div className="absolute top-4 right-4 text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Coming Soon</div>
                    <h3 className="text-2xl font-bold text-slate-400 dark:text-slate-600 mb-2">CFO Challenge</h3>
                    <p className="text-slate-400 dark:text-slate-600">Roleplay as a CFO and make critical business decisions.</p>
                </div>
            </div>
        </div>
    </div>
);

// --- CBT TEST COMPONENT ---
const CBTTest: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const [gameState, setGameState] = useState<GameState>('setup');

    // Setup state
    const [level, setLevel] = useState<Level>(auth?.user?.level || 100);
    const [topic, setTopic] = useState('');

    // Test state
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
    const timerRef = useRef<any>(null);

    // Tools
    const [showCalculator, setShowCalculator] = useState(false);
    
    useEffect(() => {
        if (gameState === 'testing') {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        endTest();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [gameState]);

    const startTest = async () => {
        if (!topic) {
            showNotification("Please enter a topic.", "warning");
            return;
        }

        setGameState('loading');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate 10 multiple-choice questions for a university ${level}-level finance exam on the topic "${topic}". Each question must have exactly 4 options. Format the response as a JSON array, where each object has keys "id" (number), "text" (string), "options" (array of 4 strings), and "correctAnswer" (number index 0-3).`;

            const result = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            trackAiUsage();
            
            let parsedQuestions = JSON.parse(result.text.trim());
            setQuestions(parsedQuestions);
            setGameState('testing');
        } catch (error) {
            console.error("AI Generation Failed:", error);
            showNotification("AI failed, using standard questions.", "info");
            const standardQuestions = fallbackQuestions
                .filter(q => q.level === level)
                .sort(() => 0.5 - Math.random())
                .slice(0, 10);
            setQuestions(standardQuestions);
            setGameState('testing');
        }
    };

    const handleAnswer = (optionIndex: number) => {
        setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionIndex }));
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };
    
    const endTest = async () => {
        clearInterval(timerRef.current);
        let correctAnswers = 0;
        for (let i = 0; i < questions.length; i++) {
            if (userAnswers[i] === questions[i].correctAnswer) {
                correctAnswers++;
            }
        }
        const finalScore = (correctAnswers / questions.length) * 100;
        setScore(finalScore);
        setGameState('results');

        // Save result to Firestore
        if (auth?.user) {
            try {
                await addDoc(collection(db, 'test_results'), {
                    userId: auth.user.id,
                    username: auth.user.username,
                    avatarUrl: auth.user.avatarUrl,
                    score: finalScore,
                    totalQuestions: questions.length,
                    level,
                    date: new Date().toISOString()
                });

                let points = 0;
                if (finalScore >= 80) points = 5;
                else if (finalScore >= 50) points = 2;

                if (points > 0) {
                    const userRef = doc(db, 'users', auth.user.id);
                    await updateDoc(userRef, { contributionPoints: increment(points) });
                    showNotification(`You earned ${points} contribution points!`, "success");
                    
                    const userDoc = await getDoc(userRef);
                    if (userDoc.exists()) {
                        const updatedUser = { id: userDoc.id, ...userDoc.data() } as User;
                        const newBadges = await checkAndAwardBadges(updatedUser);
                        if(newBadges.length > 0) {
                           await updateDoc(userRef, { badges: [...(updatedUser.badges || []), ...newBadges] });
                           showNotification(`Unlocked: ${newBadges.join(", ")}!`, 'success');
                        }
                    }
                }
            } catch (e) { console.error("Failed to save test result", e); }
        }
    };

    const restartTest = () => {
        setGameState('setup');
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setScore(0);
        setTimeLeft(600);
    };

    if (gameState === 'setup') {
        return (
            <div className="p-8 max-w-lg mx-auto">
                <button onClick={onBack} className="text-sm text-indigo-600 dark:text-indigo-400 mb-4">&larr; Back to Modes</button>
                <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">CBT Setup</h2>
                <div className="space-y-4">
                    <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Level</label><select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full p-3 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white mt-1">{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                    <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Topic</label><input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Capital Budgeting" className="w-full p-3 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white mt-1" /></div>
                    <button onClick={startTest} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold">Start Test</button>
                </div>
            </div>
        );
    }

    if (gameState === 'loading') {
        return <div className="p-8 text-center text-slate-600 dark:text-slate-300">Generating questions with AI...</div>;
    }

    if (gameState === 'results') {
        return (
            <div className="p-8 text-center max-w-md mx-auto">
                <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Test Complete!</h2>
                <p className="text-6xl font-bold mb-4" style={{ color: score >= 50 ? '#10B981' : '#EF4444' }}>{score}%</p>
                <div className="flex gap-4 mt-8">
                    <button onClick={restartTest} className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg font-bold">Try Again</button>
                    <button onClick={onBack} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-bold">Back to Menu</button>
                </div>
                 <button onClick={() => generateTestReviewPDF(questions, userAnswers, score, auth?.user)} className="mt-4 w-full py-2 border border-indigo-500 text-indigo-500 rounded-lg text-sm font-bold">Download Review PDF</button>
            </div>
        );
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    
    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto relative">
            {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-sm font-bold text-slate-500 dark:text-slate-400">Question {currentQuestionIndex + 1} of {questions.length}</div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowCalculator(true)} className="text-slate-400 hover:text-indigo-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m2 10h-8a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2z" /></svg></button>
                        <div className="font-mono font-bold text-lg text-indigo-600 dark:text-indigo-400">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</div>
                    </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full mb-6"><div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div></div>
                
                <p className="text-lg font-semibold mb-6 min-h-[6em] text-slate-900 dark:text-white">{currentQuestion.text}</p>
                
                <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                        <button key={index} onClick={() => handleAnswer(index)} className={`w-full text-left p-4 border-2 rounded-lg transition-all ${userAnswers[currentQuestionIndex] === index ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                           <span className="font-bold mr-2">{String.fromCharCode(65 + index)}.</span> {option}
                        </button>
                    ))}
                </div>

                <div className="flex justify-between mt-8">
                    <button onClick={endTest} className="px-6 py-2 bg-rose-500 text-white rounded-lg font-bold">End Test</button>
                    <button onClick={nextQuestion} disabled={currentQuestionIndex === questions.length - 1} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold disabled:opacity-50">Next</button>
                </div>
            </div>
        </div>
    );
};
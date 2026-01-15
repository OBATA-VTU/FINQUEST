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

type TestMode = 'mock' | 'ai' | 'trivia' | 'timeline';
type ViewState = 'select_mode' | 'configure' | 'loading' | 'in_game' | 'results' | 'notes';

const storageKey = 'cbt-test-session';

// Helper function to calculate score
const calculateScore = (questions: Question[], userAnswers: Record<number, number>) => {
    if (!questions || questions.length === 0) return 0;
    const correct = questions.reduce((acc, q, i) => acc + (userAnswers[i] === q.correctAnswer ? 1 : 0), 0);
    return Math.round((correct / questions.length) * 100);
};

// Main Component
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
                    localStorage.setItem('lastTestResults', JSON.stringify({ questions: savedState.questions, userAnswers: savedState.userAnswers, score: calculateScore(savedState.questions, savedState.userAnswers) }));
                    localStorage.removeItem(storageKey);
                    setView('results');
                } else if (window.confirm("An unfinished test was found. Do you want to continue?")) {
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
                console.error("Failed to parse saved test state", e);
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
    
    switch (view) {
        case 'select_mode':
            return <ModeSelection setView={setView} setMode={setMode} navigate={navigate} />;
        case 'configure':
            return <ConfigurationScreen mode={mode} setView={setView} setQuestions={setQuestions} setTimeLeft={setTimeLeft} setAiNotes={setAiNotes} level={level} setLevel={setLevel} topic={topic} setTopic={setTopic} />;
        case 'loading':
            return <LoadingScreen />;
        case 'in_game':
            return <GameScreen questions={questions} timeLeft={timeLeft} setTimeLeft={setTimeLeft} reset={resetToSelection} userAnswers={userAnswers} setUserAnswers={setUserAnswers} currentQuestionIndex={currentQuestionIndex} setCurrentQuestionIndex={setCurrentQuestionIndex} setView={setView} />;
        case 'results':
            return <ResultsScreen onRestart={resetToSelection} />;
        case 'notes':
            return <NotesScreen notes={aiNotes} topic={topic} onBack={() => setView('configure')} />;
        default:
            return <ModeSelection setView={setView} setMode={setMode} navigate={navigate} />;
    }
};

const ModeSelection: React.FC<{ setView: Function, setMode: Function, navigate: Function }> = ({ setView, setMode, navigate }) => {
    const handleSelect = (mode: TestMode) => { setMode(mode); setView('configure'); };
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12"><h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white">Practice Center</h1><p className="text-slate-500 dark:text-slate-400 mt-2">Choose your preferred session to begin.</p></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ModeCard title="General Mock Exam" description="A 30-question, 40-minute test simulating official exam conditions." onClick={() => handleSelect('mock')} icon={<IconClipboardList />} color="emerald" />
                    <ModeCard title="AI Topic Mastery" description="Generate custom quizzes or comprehensive notes on any topic you choose." onClick={() => handleSelect('ai')} icon={<IconSparkles />} color="indigo" />
                    <ModeCard title="Arcade Games" description="Play fun, educational games like Trivia and Naija Timeline." onClick={() => navigate('/arcade')} icon={<IconGame />} color="rose" />
                </div>
            </div>
        </div>
    );
};
const ModeCard: React.FC<{ title: string, description: string, onClick: () => void, icon: React.ReactNode, color: string }> = ({ title, description, onClick, icon, color }) => {
    const colors = {
        emerald: { border: 'hover:border-emerald-500/50', iconBg: 'bg-emerald-100 dark:bg-emerald-900', iconText: 'text-emerald-600 dark:text-emerald-300', button: 'bg-emerald-600 hover:bg-emerald-700' },
        indigo: { border: 'hover:border-indigo-500/50', iconBg: 'bg-indigo-100 dark:bg-indigo-900', iconText: 'text-indigo-600 dark:text-indigo-300', button: 'bg-indigo-600 hover:bg-indigo-700' },
        rose: { border: 'hover:border-rose-500/50', iconBg: 'bg-rose-100 dark:bg-rose-900', iconText: 'text-rose-600 dark:text-rose-300', button: 'bg-rose-600 hover:bg-rose-700' },
    };
    const c = colors[color as keyof typeof colors];
    return (
        <div className={`bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col group transition-all ${c.border} hover:shadow-xl`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${c.iconBg} ${c.iconText}`}>{icon}</div>
            <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 flex-1">{description}</p>
            <button onClick={onClick} className={`w-full py-4 text-white font-bold rounded-2xl transition-transform hover:-translate-y-1 ${c.button}`}>Select</button>
        </div>
    );
};

const ConfigurationScreen: React.FC<{ mode: TestMode | null, setView: Function, setQuestions: Function, setTimeLeft: Function, setAiNotes: Function, level: Level | 'General', setLevel: Function, topic: string, setTopic: Function }> = (props) => {
    const { mode, setView, setQuestions, setTimeLeft, setAiNotes, level, setLevel, topic, setTopic } = props;
    const { showNotification } = useNotification();
    const [showAiChoice, setShowAiChoice] = useState(false);

    const startTest = (questions: Question[], time: number, mode: TestMode, currentTopic: string) => {
        const endTime = Date.now() + time * 1000;
        localStorage.setItem(storageKey, JSON.stringify({ questions, userAnswers: {}, currentQuestionIndex: 0, endTime, mode, level, topic: currentTopic }));
        setQuestions(questions);
        setTimeLeft(time);
        setView('in_game');
    };

    const startMockFallback = () => {
        const levelFilter = level === 'General' ? (q: any) => true : (q: any) => q.level === level;
        const filtered = fallbackQuestions.filter(levelFilter).sort(() => 0.5 - Math.random()).slice(0, 30);
        startTest(filtered.length > 0 ? filtered : fallbackQuestions.slice(0, 30), 40 * 60, 'mock', '');
    };

    const startMock = async () => {
        setView('loading');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate exactly 30 high-quality, university-level multiple-choice finance questions of varying difficulty suitable for a general mock exam. Return a valid JSON array of objects with keys: "id" (number from 1-30), "text" (string), "options" (array of 4 strings), and "correctAnswer" (number from 0-3).`;
            const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
            trackAiUsage();
            const aiQuestions = JSON.parse(result.text.trim());
            if (!Array.isArray(aiQuestions) || aiQuestions.length < 30) throw new Error("AI did not return a valid array of 30 questions.");
            startTest(aiQuestions, 40 * 60, 'mock', '');
        } catch (e) { console.warn("AI generation failed, falling back.", e); startMockFallback(); }
    };

    const generateAiQuiz = async () => {
        setView('loading');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate exactly 10 high-quality, university-level multiple-choice finance questions for the topic: "${topic}". Return a valid JSON array of objects with keys: "id" (number), "text" (string), "options" (array of 4 strings), and "correctAnswer" (number from 0-3).`;
            const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
            trackAiUsage();
            startTest(JSON.parse(result.text.trim()), 15 * 60, 'ai', topic);
        } catch (e) { showNotification("AI engine busy. Starting a standard mock instead.", "info"); startMock(); }
    };
    
    const handleAiProceed = () => { if (!topic.trim()) { showNotification("Please enter a study topic.", "warning"); return; } setShowAiChoice(true); };
    
    const generateAiNotes = async () => {
        setView('loading');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate comprehensive, university-level study notes on the topic: "${topic}". Format in clean Markdown. Include a summary, key concepts with detailed explanations, examples if applicable, and a conclusion.`;
            const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            trackAiUsage();
            const notes = result.text;
            if (!notes) throw new Error("AI failed to generate notes.");
            setAiNotes(notes);
            setView('notes');
        } catch (e) {
            console.error("AI notes generation failed", e);
            showNotification("AI engine is busy. Please try again later.", "error");
            setView('configure');
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 animate-fade-in flex flex-col items-center justify-center">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800">
                <button onClick={() => setView('select_mode')} className="text-sm font-bold text-slate-500 hover:text-indigo-600 mb-6 flex items-center gap-2">← Back</button>
                <h2 className="text-2xl font-bold font-serif mb-6 text-slate-800 dark:text-white">{mode === 'mock' ? 'Configure Mock Exam' : 'Configure Topic Mastery'}</h2>
                <div className="space-y-6">
                    {mode === 'mock' ? (
                        <>
                            <div>
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 block">Select Your Level</label>
                                <div className="flex flex-wrap gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">{LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} className={`flex-1 px-4 py-3 rounded-lg text-sm font-black transition-all ${level === l ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-700'}`}>{typeof l === 'number' ? `${l}L` : l}</button>)}</div>
                            </div>
                            <button onClick={startMock} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl">Start 40-Min Mock</button>
                        </>
                    ) : (
                         <>
                            <div>
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 block">Enter Topic</label>
                                <input type="text" placeholder="e.g., Capital Budgeting" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full p-4 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 outline-none" />
                            </div>
                            <button onClick={handleAiProceed} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl">Proceed</button>
                        </>
                    )}
                </div>
            </div>
             {showAiChoice && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAiChoice(false)}>
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl w-full max-w-sm shadow-xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Topic: "{topic}"</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">What would you like to do?</p>
                        <div className="space-y-3">
                            <button onClick={generateAiQuiz} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Generate 10-Question Quiz</button>
                            <button onClick={generateAiNotes} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">Generate Study Notes</button>
                        </div>
                        <button onClick={() => setShowAiChoice(false)} className="w-full mt-6 text-sm text-slate-500 font-bold hover:text-indigo-600">Cancel</button>
                    </div>
                </div>
             )}
        </div>
    );
};

const GameScreen: React.FC<{ questions: Question[], timeLeft: number, setTimeLeft: Function, reset: Function, userAnswers: Record<number, number>, setUserAnswers: Function, currentQuestionIndex: number, setCurrentQuestionIndex: Function, setView: Function }> = (props) => {
    const { questions, timeLeft, setTimeLeft, reset, userAnswers, setUserAnswers, currentQuestionIndex, setCurrentQuestionIndex, setView } = props;
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const [showCalculator, setShowCalculator] = useState(false);
    const timerRef = useRef<any>();

    useEffect(() => {
        const savedStateJSON = localStorage.getItem(storageKey);
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);
            localStorage.setItem(storageKey, JSON.stringify({ ...savedState, userAnswers, currentQuestionIndex }));
        }
    }, [userAnswers, currentQuestionIndex]);

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
                showNotification(`Test complete! You earned ${points} contribution points.`, 'success');
            }

            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                const updatedUser = { id: userDoc.id, ...userDoc.data() } as User;
                const newBadges = await checkAndAwardBadges(updatedUser);
                if (newBadges.length > 0) {
                    const allBadges = [...new Set([...(updatedUser.badges || []), ...newBadges])];
                    await updateDoc(userRef, { badges: allBadges });
                    auth.updateUser({ badges: allBadges });
                    showNotification(`Unlocked: ${newBadges.join(', ')}!`, "success");
                }
            }
        } else {
            localStorage.setItem('lastTestResults', JSON.stringify({ questions, userAnswers, score: finalScore }));
        }
        setView('results');
    };
    
    useEffect(() => {
        timerRef.current = setTimeout(() => {
            if (timeLeft > 0) {
                setTimeLeft(timeLeft - 1);
            } else {
                showNotification("Time's up! Submitting your test.", "info");
                endTest();
            }
        }, 1000);
        return () => clearTimeout(timerRef.current);
    }, [timeLeft]);
    
    if (!questions || questions.length === 0) return <LoadingScreen />;
    const q = questions[currentQuestionIndex];
    if (!q) return <LoadingScreen />;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8">
            {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-10 shadow-lg animate-fade-in-up">
                    <p className="text-sm font-bold text-indigo-600 mb-4">Question {currentQuestionIndex + 1} of {questions.length}</p>
                    <p className="text-lg md:text-xl font-medium text-slate-800 dark:text-slate-100 mb-10 min-h-[100px]">{q.text}</p>
                    <div className="space-y-4">
                        {q.options.map((opt, idx) => (
                            <button key={idx} onClick={() => setUserAnswers({...userAnswers, [currentQuestionIndex]: idx})} className={`w-full text-left p-5 rounded-2xl border-2 flex items-center gap-4 group ${userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-400'}`}><span className="text-xs font-bold">{String.fromCharCode(65+idx)}</span></div>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{opt}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="w-full lg:w-80">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-lg mb-6 text-center">
                        <p className="text-sm font-bold uppercase text-slate-400 dark:text-slate-400 mb-2">Time Remaining</p>
                        <div className="font-mono text-5xl font-black text-rose-500 dark:text-rose-400">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-lg">
                        <div className="flex justify-between items-center mb-4"><h3 className="font-bold dark:text-white">Progress</h3><button onClick={() => setShowCalculator(true)} className="text-xs font-bold text-slate-500 hover:text-indigo-600">Calculator</button></div>
                        <div className="grid grid-cols-5 gap-2 mb-6">{questions.map((_, i) => <button key={i} onClick={() => setCurrentQuestionIndex(i)} className={`h-10 rounded-lg font-bold text-sm ${currentQuestionIndex === i ? 'bg-indigo-600 text-white scale-110' : userAnswers[i] !== undefined ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 dark:bg-slate-800 text-white'}`}>{i+1}</button>)}</div>
                        <div className="flex justify-between border-t pt-4 border-slate-100 dark:border-slate-800">
                            <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex((p: number) => p - 1)} className="px-5 py-2 rounded-lg font-bold disabled:opacity-50 text-slate-700 dark:text-white">Previous</button>
                            {currentQuestionIndex === (questions.length - 1) ? <button onClick={endTest} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg">Submit</button> : <button onClick={() => setCurrentQuestionIndex((p: number) => p + 1)} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg">Next</button>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ResultsScreen: React.FC<{ onRestart: () => void }> = ({ onRestart }) => {
    const [results, setResults] = useState<{ questions: Question[], userAnswers: Record<number, number>, score: number } | null>(null);
    const auth = useContext(AuthContext);

    useEffect(() => {
        const data = localStorage.getItem('lastTestResults');
        if (data) {
            try { setResults(JSON.parse(data)); } catch (e) { console.error("Could not parse results", e); }
        }
        localStorage.removeItem('lastTestResults');
        localStorage.removeItem(storageKey);
    }, []);
    
    const handleShareResult = async () => {
        if (!results) return;
        const shareText = `I scored ${results.score}% on a FINSA practice test! 🚀 Can you beat my score? Challenge yourself on the FINSA AAUA Portal.`;
        const shareUrl = window.location.origin;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'FINSA Test Result',
                    text: shareText,
                    url: shareUrl,
                });
            } catch (error) {
                console.log('Sharing failed:', error);
            }
        } else {
            // Fallback for desktop browsers
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
            window.open(twitterUrl, '_blank');
        }
    };

    if (!results) {
        return <div className="min-h-screen flex items-center justify-center p-4"><div className="text-center"><h2 className="text-xl font-bold dark:text-white">No results to display.</h2><button onClick={onRestart} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg">Start New Test</button></div></div>
    }
    
    const { questions, userAnswers, score } = results;
    const handleDownloadReview = () => { if (auth?.user) generateTestReviewPDF(questions, userAnswers, score, auth.user); };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 animate-fade-in">
            <div className="max-w-4xl mx-auto">
                <div className="text-center bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 md:p-12 mb-8">
                    <h2 className="text-2xl font-serif font-bold text-slate-800 dark:text-white mb-2">Test Complete!</h2>
                    <p className="text-slate-500 dark:text-slate-400">Here's how you performed.</p>
                    <div className={`my-8 text-7xl font-black ${score >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>{score}%</div>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button onClick={onRestart} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Play Again</button>
                        <button onClick={handleShareResult} className="px-8 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600">Share Score</button>
                        <button onClick={handleDownloadReview} className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">Download Review</button>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">Review Your Answers</h3>
                    {questions.map((q, i) => {
                        const userAnswer = userAnswers[i];
                        return (
                            <div key={q.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <p className="font-bold text-slate-800 dark:text-white mb-3">Q{i+1}: {q.text}</p>
                                <div className="space-y-2">
                                    {q.options.map((opt, idx) => {
                                        const isCorrectAnswer = idx === q.correctAnswer;
                                        const isSelectedAnswer = idx === userAnswer;
                                        let classes = "border-slate-200 dark:border-slate-700";
                                        if (isCorrectAnswer) classes = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700";
                                        if (isSelectedAnswer && !isCorrectAnswer) classes = "bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700";
                                        return <div key={idx} className={`p-3 rounded-lg border-2 text-sm flex justify-between items-center ${classes}`}><span className="font-medium text-slate-700 dark:text-slate-300">{opt}</span>{isSelectedAnswer && !isCorrectAnswer && <span className="text-xs font-bold text-rose-600">Your Answer</span>}{isCorrectAnswer && <span className="text-xs font-bold text-emerald-600">Correct</span>}</div>
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const NotesScreen: React.FC<{ notes: string, topic: string, onBack: () => void }> = ({ notes, topic, onBack }) => {
    const createMarkup = () => {
        if (!notes) return { __html: '' };
        const html = notes
            .replace(/</g, "&lt;").replace(/>/g, "&gt;") // Security first
            .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-3 mb-1">$1</h3>') // H3
            .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>') // H2
            .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-5 mb-3">$1</h1>') // H1
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold with **
            .replace(/__(.*?)__/g, '<strong>$1</strong>') // Bold with __
            .replace(/\*(.*?)\*/g, '<em>$1</em>')       // Italic with *
            .replace(/_(.*?)_/g, '<em>$1</em>')         // Italic with _
            .replace(/~~(.*?)~~/g, '<s>$1</s>')         // Strikethrough
            .replace(/^- (.*$)/gim, '<li class="ml-5 list-disc">$1</li>') // Unordered list
            .replace(/^\* (.*$)/gim, '<li class="ml-5 list-disc">$1</li>') // Unordered list with *
            .replace(/\n/g, '<br />')
            .replace(/<br \/>(<h1|<h2|<h3|<li)/g, '$1')
            .replace(/(<\/h1>|<\/h2>|<\/h3>|<\/li>)<br \/>/g, '$1');
        return { __html: html };
    };
    
    const handleShareNotes = async () => {
        const shareText = `Check out these AI-generated study notes on "${topic}" from the FINSA Portal!`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `FINSA Notes: ${topic}`,
                    text: shareText,
                    url: window.location.origin,
                });
            } catch (error) {
                console.log('Sharing failed:', error);
            }
        } else {
            alert("Your browser doesn't support direct sharing. You can copy the notes manually.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 md:p-8 animate-fade-in">
            <div className="max-w-4xl mx-auto">
                <button onClick={onBack} className="text-sm font-bold text-slate-500 hover:text-indigo-600 mb-6 flex items-center gap-2">← Back to Configuration</button>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">Study Notes: {topic}</h2>
                        <button onClick={handleShareNotes} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-xs font-bold rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                            Share
                        </button>
                    </div>
                    <div 
                        className="prose prose-slate dark:prose-invert max-w-none leading-relaxed"
                        dangerouslySetInnerHTML={createMarkup()}
                    />
                </div>
            </div>
        </div>
    );
};
const LoadingScreen: React.FC = () => (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center text-center p-4">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <h2 className="mt-6 text-xl font-bold text-slate-800 dark:text-white">Generating Your Session...</h2>
        <p className="text-slate-500 dark:text-slate-400">Please wait a moment while the AI prepares your content.</p>
    </div>
);
const IconClipboardList = () => <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const IconSparkles = () => <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6.343 17.657l-2.828 2.828M20.485 3.515l2.828 2.828M17.657 6.343l2.828-2.828M3.515 20.485l2.828-2.828M12 21v-4M21 12h-4M12 3v4M3 12h4m6 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconGame = () => <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

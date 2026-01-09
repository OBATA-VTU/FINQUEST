
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

// Main Component
export const TestPage: React.FC = () => {
    const navigate = useNavigate();
    const [view, setView] = useState<ViewState>('select_mode');
    const [mode, setMode] = useState<TestMode | null>(null);

    // Config State
    const [level, setLevel] = useState<Level | 'General'>('General');
    const [topic, setTopic] = useState('');

    // Game State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);

    // AI Notes State
    const [aiNotes, setAiNotes] = useState('');

    const resetToSelection = () => {
        setView('select_mode');
        setMode(null);
        setQuestions([]);
        setTopic('');
        setAiNotes('');
    };
    
    // RENDER LOGIC
    switch (view) {
        case 'select_mode':
            return <ModeSelection setView={setView} setMode={setMode} navigate={navigate} />;
        case 'configure':
            return <ConfigurationScreen mode={mode} setView={setView} setQuestions={setQuestions} setTimeLeft={setTimeLeft} setAiNotes={setAiNotes} level={level} setLevel={setLevel} topic={topic} setTopic={setTopic} />;
        case 'loading':
            return <LoadingScreen />;
        case 'in_game':
            return <GameScreen questions={questions} timeLeft={timeLeft} setTimeLeft={setTimeLeft} reset={resetToSelection} />;
        case 'results':
            return <ResultsScreen onRestart={resetToSelection} />;
        case 'notes':
            return <NotesScreen notes={aiNotes} topic={topic} onBack={() => setView('configure')} />;
        default:
            return <ModeSelection setView={setView} setMode={setMode} navigate={navigate} />;
    }
};


// 1. Mode Selection Screen
const ModeSelection: React.FC<{ setView: Function, setMode: Function, navigate: Function }> = ({ setView, setMode, navigate }) => {
    const handleSelect = (mode: TestMode) => {
        setMode(mode);
        setView('configure');
    };
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white">Practice Center</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Choose your preferred session to begin.</p>
                </div>
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

// 2. Configuration Screen
const ConfigurationScreen: React.FC<{ mode: TestMode | null, setView: Function, setQuestions: Function, setTimeLeft: Function, setAiNotes: Function, level: Level | 'General', setLevel: Function, topic: string, setTopic: Function }> = (props) => {
    const { mode, setView, setQuestions, setTimeLeft, setAiNotes, level, setLevel, topic, setTopic } = props;
    const { showNotification } = useNotification();
    const [showAiChoice, setShowAiChoice] = useState(false);

    const startMockFallback = () => {
        const levelFilter = level === 'General' ? (q: any) => true : (q: any) => q.level === level;
        const filtered = fallbackQuestions.filter(levelFilter).sort(() => 0.5 - Math.random()).slice(0, 30);
        setQuestions(filtered.length > 0 ? filtered : fallbackQuestions.slice(0, 30));
        setTimeLeft(40 * 60); // 40 minutes
        setView('in_game');
    };

    const startMock = async () => {
        setView('loading');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate exactly 30 high-quality, university-level multiple-choice finance questions of varying difficulty suitable for a general mock exam. Return a valid JSON array of objects with keys: "id" (number from 1-30), "text" (string), "options" (array of 4 strings), and "correctAnswer" (number from 0-3).`;
            const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
            trackAiUsage();
            const aiQuestions = JSON.parse(result.text.trim());
            if (!Array.isArray(aiQuestions) || aiQuestions.length < 30) {
                throw new Error("AI did not return a valid array of 30 questions.");
            }
            setQuestions(aiQuestions);
            setTimeLeft(40 * 60);
            setView('in_game');
        } catch (e) {
            console.warn("AI generation for mock exam failed, falling back to question bank.", e);
            startMockFallback();
        }
    };

    const handleAiProceed = () => {
        if (!topic.trim()) { showNotification("Please enter a study topic.", "warning"); return; }
        setShowAiChoice(true);
    };

    const generateAiNotes = async () => {
        setView('loading');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate comprehensive, university-level study notes on the topic: "${topic}". Format in clean Markdown. Include a summary, key concepts with detailed explanations, examples, and a conclusion.`;
            const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            trackAiUsage();
            setAiNotes(result.text.trim());
            setView('notes');
        } catch (e) {
            showNotification("AI engine is busy. Please try again later.", "error");
            setView('configure');
        }
    };

    const generateAiQuiz = async () => {
        setView('loading');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate exactly 10 high-quality, university-level multiple-choice finance questions for the topic: "${topic}". Return a valid JSON array of objects with keys: "id" (number), "text" (string), "options" (array of 4 strings), and "correctAnswer" (number from 0-3).`;
            const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
            trackAiUsage();
            setQuestions(JSON.parse(result.text.trim()));
            setTimeLeft(15 * 60); // 15 minutes
            setView('in_game');
        } catch (e) {
            showNotification("AI engine busy. Starting a standard mock instead.", "info");
            startMock(); // Fallback to general mock
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
                                <div className="flex flex-wrap gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">{LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} className={`flex-1 px-4 py-3 rounded-lg text-sm font-black transition-all ${level === l ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white'}`}>{typeof l === 'number' ? `${l}L` : l}</button>)}</div>
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
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAiChoice(false)}>
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-xl text-center mb-2 dark:text-white">Topic: {topic}</h3>
                        <p className="text-center text-sm text-slate-500 mb-6">What would you like the AI to do?</p>
                        <div className="space-y-3">
                            <button onClick={generateAiNotes} className="w-full py-4 text-center bg-emerald-500 text-white font-bold rounded-xl">Generate Notes</button>
                            <button onClick={generateAiQuiz} className="w-full py-4 text-center bg-indigo-500 text-white font-bold rounded-xl">Generate 10 Questions</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 3. Game Screen
const GameScreen: React.FC<{ questions: Question[], timeLeft: number, setTimeLeft: Function, reset: Function }> = ({ questions, timeLeft, setTimeLeft, reset }) => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [showCalculator, setShowCalculator] = useState(false);

    const endTest = async () => {
        const correct = questions.reduce((acc, q, i) => acc + (userAnswers[i] === q.correctAnswer ? 1 : 0), 0);
        const finalScore = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
        
        if (auth?.user) {
            localStorage.setItem('lastTestResults', JSON.stringify({ questions, userAnswers, score: finalScore }));
            await addDoc(collection(db, 'test_results'), { userId: auth.user.id, score: finalScore, date: new Date().toISOString(), totalQuestions: questions.length, level: auth.user.level });
            
            let pointsAwarded = 0;
            if (finalScore >= 80) pointsAwarded = 5;
            else if (finalScore >= 50) pointsAwarded = 2;

            if (pointsAwarded > 0) {
                const userRef = doc(db, 'users', auth.user.id);
                await updateDoc(userRef, { contributionPoints: increment(pointsAwarded) });
                auth.updateUser({ contributionPoints: (auth.user.contributionPoints || 0) + pointsAwarded });
                showNotification(`You earned ${pointsAwarded} contribution points!`, 'success');

                const userDocAfterPoints = await getDoc(userRef);
                const updatedUser = { id: userDocAfterPoints.id, ...userDocAfterPoints.data() } as User;
                
                // Contextual badge checks
                const eventBadges: string[] = [];
                const currentBadges = new Set(updatedUser.badges || []);
                const hour = new Date().getHours();
                if ((hour >= 0 && hour < 4) && !currentBadges.has('NIGHT_OWL')) eventBadges.push('NIGHT_OWL');
                if (finalScore === 100 && !currentBadges.has('PERFECTIONIST')) eventBadges.push('PERFECTIONIST');
                
                const dbCheckedBadges = await checkAndAwardBadges(updatedUser);
                const allNewBadges = [...new Set([...eventBadges, ...dbCheckedBadges])];

                if (allNewBadges.length > 0) {
                    const finalBadges = [...new Set([...(updatedUser.badges || []), ...allNewBadges])];
                    await updateDoc(userRef, { badges: finalBadges });
                    auth.updateUser({ badges: finalBadges });
                    allNewBadges.forEach(b => showNotification(`Badge Unlocked: ${b.replace('_', ' ')}!`, "success"));
                }
            }
        }
        reset();
    };
    
    useEffect(() => {
        let timer: any;
        if (timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev: number) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        endTest();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
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
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${userAnswers[currentQuestionIndex] === idx ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:text-white'}`}><span className="text-xs font-bold">{String.fromCharCode(65+idx)}</span></div>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{opt}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="w-full lg:w-80">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-lg mb-6 text-center">
                        <p className="text-sm font-bold uppercase text-slate-400 mb-2">Time Remaining</p>
                        <div className="font-mono text-5xl font-black text-rose-500">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-lg">
                        <div className="flex justify-between items-center mb-4"><h3 className="font-bold dark:text-white">Progress</h3><button onClick={() => setShowCalculator(true)} className="text-xs font-bold text-slate-500 hover:text-indigo-600">Calculator</button></div>
                        <div className="grid grid-cols-5 gap-2 mb-6">{questions.map((_, i) => <button key={i} onClick={() => setCurrentQuestionIndex(i)} className={`h-10 rounded-lg font-bold text-sm ${currentQuestionIndex === i ? 'bg-indigo-600 text-white scale-110' : userAnswers[i] !== undefined ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 dark:bg-slate-800 dark:text-white'}`}>{i+1}</button>)}</div>
                        <div className="flex justify-between border-t pt-4 border-slate-100 dark:border-slate-800">
                            <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(p => p - 1)} className="px-5 py-2 rounded-lg font-bold disabled:opacity-50 dark:text-white">Previous</button>
                            {currentQuestionIndex === (questions.length - 1) ? <button onClick={endTest} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg">Submit</button> : <button onClick={() => setCurrentQuestionIndex(p => p + 1)} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg">Next</button>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 4. Results Screen
const ResultsScreen: React.FC<{ onRestart: () => void }> = ({ onRestart }) => {
    const auth = useContext(AuthContext);
    const [results, setResults] = useState<{ questions: Question[], userAnswers: Record<number, number>, score: number } | null>(null);

    useEffect(() => {
        const data = localStorage.getItem('lastTestResults');
        if (data) setResults(JSON.parse(data));
    }, []);

    if (!results) return <div className="min-h-screen flex items-center justify-center p-4">Loading results...</div>;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl w-full max-w-lg text-center border animate-pop-in">
                <h2 className="text-2xl font-serif font-bold mb-2 dark:text-white">Session Summary</h2>
                <div className={`text-7xl font-black my-4 ${results.score >= 70 ? 'text-emerald-500' : results.score >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>{results.score}%</div>
                <p className="text-slate-500 mb-8">You've completed the practice session.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={onRestart} className="py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold dark:text-white">New Session</button>
                    <button onClick={() => generateTestReviewPDF(results.questions, results.userAnswers, results.score, auth?.user)} className="py-3 bg-indigo-600 text-white rounded-xl font-bold">Review PDF</button>
                </div>
            </div>
        </div>
    );
};

// 5. AI Notes Screen
const NotesScreen: React.FC<{ notes: string, topic: string, onBack: () => void }> = ({ notes, topic, onBack }) => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 animate-fade-in">
            <div className="max-w-4xl mx-auto">
                <button onClick={onBack} className="text-sm font-bold text-slate-500 hover:text-indigo-600 mb-6 flex items-center gap-2">← Back to Topic Mastery</button>
                <div className="bg-white dark:bg-slate-800 p-8 md:p-12 rounded-2xl shadow-lg border">
                    <h1 className="text-3xl font-bold font-serif mb-2 dark:text-white">AI-Generated Notes: {topic}</h1>
                    <div className="prose prose-lg dark:prose-invert max-w-none mt-8" dangerouslySetInnerHTML={{ __html: notes.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
            </div>
        </div>
    );
};

// Loading Screen
const LoadingScreen: React.FC = () => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 dark:text-slate-300 bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
        <p className="font-bold text-indigo-700 dark:text-indigo-300">Preparing Your Session...</p>
    </div>
);


// Icons
const IconClipboardList = () => <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const IconSparkles = () => <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6.343 17.657l-2.828 2.828M20.485 3.515l2.828 2.828M17.657 6.343l2.828-2.828M3.515 20.485l2.828-2.828M12 21v-4M21 12h-4M12 3v4M3 12h4m6 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconGame = () => <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

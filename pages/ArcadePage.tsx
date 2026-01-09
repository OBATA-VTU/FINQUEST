
import React, { useState, useEffect, useContext } from 'react';
import { triviaQuestions, timelineQuestions, FallbackQuestion } from '../utils/fallbackQuestions';
import { GoogleGenAI } from "@google/genai";
import { trackAiUsage } from '../utils/api';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { db } from '../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

type Game = 'trivia' | 'timeline';
type ViewState = 'select' | 'in_game' | 'results';

// Main Arcade Component
export const ArcadePage: React.FC = () => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const [view, setView] = useState<ViewState>('select');
    const [activeGame, setActiveGame] = useState<Game | null>(null);
    const [score, setScore] = useState(0);
    const [total, setTotal] = useState(0);

    const startGame = (game: Game) => {
        setActiveGame(game);
        setView('in_game');
    };

    const finishGame = async (finalScore: number, totalQuestions: number) => {
        setScore(finalScore);
        setTotal(totalQuestions);
        setView('results');

        if (auth?.user && finalScore > 0) {
            try {
                const pointsAwarded = finalScore; // 1 point per correct answer
                const userRef = doc(db, 'users', auth.user.id);
                await updateDoc(userRef, { contributionPoints: increment(pointsAwarded) });
                auth.updateUser({ contributionPoints: (auth.user.contributionPoints || 0) + pointsAwarded });
                showNotification(`You earned ${pointsAwarded} contribution points!`, 'success');
            } catch(e) { console.error("Failed to award points for game", e); }
        }
    };

    const reset = () => {
        setView('select');
        setActiveGame(null);
    };

    if (view === 'select') {
        return <GameSelection onSelect={startGame} />;
    }

    if (view === 'in_game' && activeGame) {
        return <GamePlayer game={activeGame} onFinish={finishGame} />;
    }

    if (view === 'results') {
        return <ResultsScreen score={score} total={total} onRestart={reset} />;
    }

    return null;
};

// 1. Game Selection Screen
const GameSelection: React.FC<{ onSelect: (game: Game) => void }> = ({ onSelect }) => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 animate-fade-in">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white">FINSA Arcade</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Test your knowledge with these fun games.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <GameCard title="FINSA Trivia" description="How well do you know Nigerian finance history? Test your knowledge with these tricky questions." onClick={() => onSelect('trivia')} icon={<IconTrivia />} />
                    <GameCard title="Naija Timeline" description="Put your history skills to the test! Can you place these key financial events in the right order?" onClick={() => onSelect('timeline')} icon={<IconTimeline />} />
                </div>
            </div>
        </div>
    );
};

const GameCard: React.FC<{ title: string; description: string; onClick: () => void; icon: React.ReactNode }> = ({ title, description, onClick, icon }) => (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col group transition-all hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-2">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300">{icon}</div>
        <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 flex-1">{description}</p>
        <button onClick={onClick} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl transition-transform hover:bg-indigo-700">Play Now</button>
    </div>
);


// 2. Game Player
const GamePlayer: React.FC<{ game: Game; onFinish: (score: number, total: number) => void }> = ({ game, onFinish }) => {
    const [questions, setQuestions] = useState<FallbackQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    useEffect(() => {
        const setupGame = async () => {
            if (game === 'timeline') {
                setQuestions(timelineQuestions.sort(() => 0.5 - Math.random()).slice(0, 10));
                return;
            }

            // AI-first for Trivia
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const prompt = `Generate exactly 10 trivia questions about Nigerian finance, general finance calculations, and some basic world finance history. The first 5 should be relatively easy, and the last 5 should be progressively harder. Return a valid JSON array of objects with keys: "id" (number from 1-10), "text" (string), "options" (array of 4 strings), and "correctAnswer" (number from 0-3).`;
                const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
                trackAiUsage();
                const aiQuestions = JSON.parse(result.text.trim());
                if (!Array.isArray(aiQuestions) || aiQuestions.length < 10) throw new Error("AI did not return 10 questions.");
                setQuestions(aiQuestions);
            } catch (e) {
                console.warn("AI generation for trivia failed, falling back to bank.", e);
                setQuestions(triviaQuestions.sort(() => 0.5 - Math.random()).slice(0, 10));
            }
        };
        setupGame();
    }, [game]);


    const handleAnswer = (optionIndex: number) => {
        if (selectedOption !== null) return; // Prevent changing answer
        setSelectedOption(optionIndex);
        setAnswers(prev => ({ ...prev, [currentIndex]: optionIndex }));
        setIsCorrect(optionIndex === questions[currentIndex].correctAnswer);
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsCorrect(null);
        } else {
            // Game over
            const score = Object.keys(answers).reduce((acc, key) => {
                const idx = parseInt(key);
                return acc + (answers[idx] === questions[idx].correctAnswer ? 1 : 0);
            }, 0);
            onFinish(score, questions.length);
        }
    };

    if (questions.length === 0) return <div className="min-h-screen flex items-center justify-center">Loading Game...</div>;

    const question = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8 flex flex-col items-center justify-center animate-fade-in">
            <div className="w-full max-w-2xl">
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 mb-4">
                    <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-center font-bold text-indigo-600 dark:text-indigo-400 mb-8">Question {currentIndex + 1} of {questions.length}</p>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
                    <h2 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-white mb-8 text-center min-h-[100px]">{question.text}</h2>
                    <div className="space-y-3">
                        {question.options.map((opt, idx) => {
                            let buttonClass = 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600';
                            if (selectedOption !== null) {
                                if (idx === question.correctAnswer) {
                                    buttonClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300';
                                } else if (idx === selectedOption) {
                                    buttonClass = 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300';
                                }
                            }
                            return (
                                <button key={idx} onClick={() => handleAnswer(idx)} disabled={selectedOption !== null} className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium ${buttonClass}`}>
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                    {selectedOption !== null && (
                        <button onClick={handleNext} className="w-full mt-8 py-4 bg-indigo-600 text-white font-bold rounded-xl animate-pop-in">
                            {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Game'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// 3. Results Screen
const ResultsScreen: React.FC<{ score: number; total: number; onRestart: () => void }> = ({ score, total, onRestart }) => {
    const percentage = Math.round((score / total) * 100);
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl w-full max-w-md text-center border animate-pop-in">
                <h2 className="text-2xl font-serif font-bold mb-2">Game Over!</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">You scored</p>
                <div className={`text-7xl font-black my-4 ${percentage > 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {score}<span className="text-3xl text-slate-400">/{total}</span>
                </div>
                <button onClick={onRestart} className="mt-8 w-full py-4 bg-indigo-600 text-white font-bold rounded-xl">Play Again</button>
            </div>
        </div>
    );
};

// Icons
const IconTrivia = () => <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4 0 1.105-.448 2.105-1.172 2.828l-1.089 1.09a2 2 0 00-.586 1.415V18m0-3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconTimeline = () => <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;

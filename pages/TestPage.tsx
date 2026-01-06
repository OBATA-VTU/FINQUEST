import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleGenAI, Type } from "@google/genai";
import { useNotification } from '../contexts/NotificationContext';
import { db } from '../firebase';
import { collection, addDoc, getDoc, setDoc, updateDoc, increment, doc } from 'firebase/firestore';
import { LEVELS } from '../constants';
import { Level, User } from '../types';
import { generateTestReviewPDF } from '../utils/pdfGenerator';
import { trackAiUsage } from '../utils/api';
import { Calculator } from '../components/Calculator';
import { fallbackQuestions, timelineFallbackQuestions, FallbackQuestion } from '../utils/fallbackQuestions';
import { checkAndAwardBadges } from '../utils/badges';

// --- GAME DATA & TYPES ---

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

// --- CFO Challenge Data ---
interface CfoChoice { text: string; feedback: string; score: number; }
interface CfoScenario { id: number; icon: React.ReactNode; prompt: string; choices: CfoChoice[]; }
const cfoScenarios: CfoScenario[] = [
    { id: 1, icon: <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H21" /></svg>, prompt: "Hey {{name}}, big news! The board wants to build a new factory for ₦5 billion. As CFO, how do you advise we finance this massive project?", choices: [
        { text: "Take a long-term bank loan.", feedback: "Good choice. Debt financing is often cheaper than equity and doesn't dilute ownership. However, it increases financial risk.", score: 10 },
        { text: "Issue new corporate bonds.", feedback: "Excellent. Bonds can secure long-term funding at a fixed rate, often lower than bank loans, but involve complex regulatory steps.", score: 15 },
        { text: "Sell more company stock (equity).", feedback: "A safe option that brings in cash without debt, but it dilutes existing shareholders' ownership and can be expensive.", score: 5 },
        { text: "Use the company's saved cash reserves.", feedback: "The cheapest option, but it depletes your liquidity, leaving you vulnerable to unexpected market downturns. A very risky move.", score: 0 },
    ]},
    { id: 2, icon: <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>, prompt: "A competitor, 'FinCorp', is struggling. Analysts suggest acquiring them to gain market share. What's your immediate recommendation, {{name}}?", choices: [
        { text: "Acquire them immediately using debt.", feedback: "Aggressive move. This could be a huge win, but taking on debt for a struggling company is high-risk. Proper due diligence is critical.", score: 5 },
        { text: "Conduct thorough due diligence first.", feedback: "The perfect CFO answer. Never rush an acquisition. Analyze their financials, debts, and operational issues before making any offer.", score: 15 },
        { text: "Ignore them and focus on our own growth.", feedback: "A conservative and safe strategy, but you might miss a once-in-a-decade opportunity to eliminate a competitor and gain assets cheaply.", score: 5 },
        { text: "Initiate a hostile takeover.", feedback: "Very risky and expensive. This can lead to a prolonged, public battle that damages both companies' reputations, even if you win.", score: 0 },
    ]},
    { id: 3, icon: <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, prompt: "We have ₦10 billion in excess cash on the balance sheet. The CEO asks for your opinion on the best use for it. What do you suggest?", choices: [
        { text: "Pay a large one-time special dividend.", feedback: "Shareholders will love this, but it's a short-term reward. Does the company have better long-term investment opportunities?", score: 5 },
        { text: "Initiate a share buyback program.", feedback: "A great way to return value to shareholders by increasing Earnings Per Share (EPS). It signals confidence in the company's future.", score: 10 },
        { text: "Invest in a promising but risky R&D project.", feedback: "High risk, high reward. A successful project could secure the company's future, but failure means the cash is gone. Depends on risk appetite.", score: 5 },
        { text: "Pay down existing company debt.", feedback: "A solid, conservative choice. Reducing debt lowers interest payments and de-risks the company's balance sheet, improving financial stability.", score: 15 },
    ]},
    { id: 4, icon: <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
        prompt: "Oh no, {{name}}! A sudden market crash has reduced our quarterly revenue by 30%. The media is panicking. What is your first public statement?",
        choices: [
            { text: "Announce immediate cost-cutting measures.", feedback: "Shows proactive management, but can signal panic to the market and hurt employee morale. Timing is key.", score: 5 },
            { text: "Reassure investors of our strong fundamentals.", feedback: "Excellent. Confidence is crucial. Remind the market of your long-term strategy and solid balance sheet to calm nerves.", score: 15 },
            { text: "Blame external market forces entirely.", feedback: "While true, it can sound defensive and like you have no plan. A good response owns the situation while providing context.", score: 0 },
            { text: "Remain silent until the next earnings call.", feedback: "Silence can be interpreted as having something to hide, leading to more panic and speculation. Communication is vital.", score: 0 }
        ]
    },
];

type GameMode = 'select' | 'cbt' | 'cfo' | 'finquest' | 'timeline';

// --- MISSING COMPONENT DEFINITIONS ---

const GameModeSelection: React.FC<{ onSelectMode: (mode: GameMode) => void; user: User }> = ({ onSelectMode, user }) => {
    // Component implementation
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 animate-fade-in transition-colors">
            <div className="container mx-auto max-w-4xl pt-10">
                <h1 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-2">Practice Center</h1>
                <p className="text-center text-slate-500 dark:text-slate-400 mb-10">Choose a mode to test your knowledge and climb the leaderboard.</p>
                <div className="grid md:grid-cols-2 gap-6">
                    <button onClick={() => onSelectMode('cbt')} className="bg-white dark:bg-slate-900 p-8 rounded-3xl text-left border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Standard CBT</h3>
                        <p className="text-slate-500 dark:text-slate-400">Classic mock exam. Choose a topic and level to start.</p>
                    </button>
                    <button onClick={() => onSelectMode('cfo')} className="bg-white dark:bg-slate-900 p-8 rounded-3xl text-left border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">CFO Challenge</h3>
                        <p className="text-slate-500 dark:text-slate-400">Roleplay as a CFO and make critical business decisions.</p>
                    </button>
                    <button onClick={() => onSelectMode('finquest')} className="bg-white dark:bg-slate-900 p-8 rounded-3xl text-left border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">FinQuest</h3>
                        <p className="text-slate-500 dark:text-slate-400">A fast-paced quiz game with power-ups and boss questions.</p>
                    </button>
                    <button onClick={() => onSelectMode('timeline')} className="bg-white dark:bg-slate-900 p-8 rounded-3xl text-left border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Timeline Challenge</h3>
                        <p className="text-slate-500 dark:text-slate-400">Test your knowledge of Nigerian financial history.</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

const CBTTest: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    // Component implementation
    return <div><h2 className="text-white">CBT Test Component</h2><button onClick={onBack}>Back</button></div>;
};

const CFORoleplay: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const auth = useContext(AuthContext);
    const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
    const [totalScore, setTotalScore] = useState(0);
    const [feedback, setFeedback] = useState<string | null>(null);

    const handleChoice = (choice: CfoChoice) => {
        setTotalScore(s => s + choice.score);
        setFeedback(choice.feedback);
        setTimeout(() => {
            setFeedback(null);
            if (currentScenarioIndex < cfoScenarios.length - 1) {
                setCurrentScenarioIndex(i => i + 1);
            } else {
                // Game over
                setCurrentScenarioIndex(-1);
            }
        }, 3000);
    };

    if (currentScenarioIndex === -1) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-2xl font-bold text-white">Challenge Complete!</h2>
                <p className="text-lg text-slate-300">Your final CFO score is: {totalScore}</p>
                <button onClick={onBack} className="mt-4 px-4 py-2 bg-indigo-600 rounded">Back to Menu</button>
            </div>
        );
    }
    
    const scenario = cfoScenarios[currentScenarioIndex];

    return (
        <div className="p-8">
            <button onClick={onBack} className="text-indigo-300 mb-4">&larr; Back</button>
            <div className="text-center text-white">
                {scenario.icon}
                <p className="mt-4 text-lg">{scenario.prompt.replace('{{name}}', auth?.user?.name || 'CFO')}</p>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                {scenario.choices.map((choice, i) => (
                    <button key={i} onClick={() => handleChoice(choice)} disabled={!!feedback} className="p-4 bg-indigo-800 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                        {choice.text}
                    </button>
                ))}
            </div>
            {feedback && <div className="mt-4 p-4 bg-slate-800 text-white rounded-lg animate-fade-in">{feedback}</div>}
        </div>
    );
};

const FinQuestGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    return <div><h2 className="text-white">FinQuest Game Component</h2><button onClick={onBack}>Back</button></div>;
};

const TimelineChallenge: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    return <div><h2 className="text-white">Timeline Challenge Component</h2><button onClick={onBack}>Back</button></div>;
};

// --- MAIN PAGE COMPONENT ---
// Fix: Export the main TestPage component to be used in App.tsx
export const TestPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const [gameMode, setGameMode] = useState<GameMode>('select');

    if (!auth?.user) {
        return <div className="p-8 text-center">Please log in to access tests.</div>;
    }

    if (gameMode === 'select') {
        return <GameModeSelection onSelectMode={setGameMode} user={auth.user} />;
    }
    if (gameMode === 'cbt') {
        return <CBTTest onBack={() => setGameMode('select')} />;
    }
    if (gameMode === 'cfo') {
        return <CFORoleplay onBack={() => setGameMode('select')} />;
    }
    if (gameMode === 'finquest') {
        return <FinQuestGame onBack={() => setGameMode('select')} />;
    }
    if (gameMode === 'timeline') {
        return <TimelineChallenge onBack={() => setGameMode('select')} />;
    }
    return <div>Invalid Game Mode</div>;
};

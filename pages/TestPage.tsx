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
interface CfoScenario { id: number; prompt: string; choices: CfoChoice[]; }
const cfoScenarios: CfoScenario[] = [
    { id: 1, prompt: "Your company wants to build a new factory for ₦5 billion. How do you finance it?", choices: [
        { text: "Take a long-term bank loan.", feedback: "Good choice. Debt financing is often cheaper than equity and doesn't dilute ownership. However, it increases financial risk.", score: 10 },
        { text: "Issue new corporate bonds.", feedback: "Excellent. Bonds can secure long-term funding at a fixed rate, often lower than bank loans, but involve complex regulatory steps.", score: 15 },
        { text: "Sell more company stock (equity).", feedback: "A safe option that brings in cash without debt, but it dilutes existing shareholders' ownership and can be expensive.", score: 5 },
        { text: "Use the company's saved cash.", feedback: "The cheapest option, but it depletes your liquidity, leaving you vulnerable to unexpected market downturns. Risky.", score: 0 },
    ]},
    { id: 2, prompt: "A competitor is struggling. Analysts suggest acquiring them to gain market share. What do you advise?", choices: [
        { text: "Acquire them immediately using debt.", feedback: "Aggressive move. This could be a huge win, but taking on debt for a struggling company is high-risk. Proper due diligence is critical.", score: 5 },
        { text: "Conduct thorough due diligence first.", feedback: "The perfect CFO answer. Never rush an acquisition. Analyze their financials, debts, and operational issues before making any offer.", score: 15 },
        { text: "Ignore them and focus on organic growth.", feedback: "A conservative and safe strategy, but you might miss a once-in-a-decade opportunity to eliminate a competitor and gain assets cheaply.", score: 5 },
        { text: "Initiate a hostile takeover.", feedback: "Very risky and expensive. This can lead to a prolonged, public battle that damages both companies' reputations, even if you win.", score: 0 },
    ]},
    { id: 3, prompt: "The company has ₦10 billion in excess cash. What's the best use for it?", choices: [
        { text: "Pay a large one-time special dividend.", feedback: "Shareholders will love this, but it's a short-term reward. Does the company have better long-term investment opportunities?", score: 5 },
        { text: "Initiate a share buyback program.", feedback: "A great way to return value to shareholders by increasing Earnings Per Share (EPS). It signals confidence in the company's future.", score: 10 },
        { text: "Invest in a promising but risky R&D project.", feedback: "High risk, high reward. A successful project could secure the company's future, but failure means the cash is gone. Depends on risk appetite.", score: 5 },
        { text: "Pay down existing company debt.", feedback: "A solid, conservative choice. Reducing debt lowers interest payments and de-risks the company's balance sheet, improving financial stability.", score: 15 },
    ]},
     { id: 4, prompt: "Sales have dropped 20% due to a sudden recession. What is your immediate priority?", choices: [
        { text: "Cut costs across the board, including layoffs.", feedback: "A drastic but often necessary step to preserve cash. However, it can damage morale and long-term capabilities if not done carefully.", score: 5 },
        { text: "Secure a new line of credit immediately.", feedback: "Crucial move. Access to liquidity is king in a downturn. This gives you options and a safety net to navigate the crisis.", score: 15 },
        { text: "Increase marketing spend to win back customers.", feedback: "Counter-intuitive but can be effective. 'Spending your way out' can gain market share while competitors retreat, but it's a cash-intensive gamble.", score: 5 },
        { text: "Sell off a non-core business division.", feedback: "A good long-term strategic move to raise cash, but it's not an 'immediate' solution. The sale process can take months.", score: 0 },
    ]},
    { id: 5, prompt: "Your top-performing division needs a new ₦2bn machine. Their manager wants to lease it, not buy it. What do you say?", choices: [
        { text: "Approve the lease. It's cheaper upfront.", feedback: "Leasing (Operating Lease) keeps the large expense off the balance sheet and preserves cash. A flexible and often smart choice for rapidly evolving tech.", score: 15 },
        { text: "Deny the lease. Buying is always better for ownership.", feedback: "Not necessarily. Buying (Capital Expenditure) offers depreciation tax benefits, but it's a large cash outlay and you're stuck with an asset that may become obsolete.", score: 0 },
        { text: "Analyze the Net Advantage to Leasing (NAL).", feedback: "The textbook CFO answer. This calculation directly compares the present value of the costs of leasing vs. buying to make a purely financial decision.", score: 10 },
        { text: "Tell the manager to find a cheaper machine.", feedback: "While cost control is important, denying your best division a critical tool could hurt their performance and overall company profits.", score: 5 },
    ]},
];

// --- Stock Market Game Data ---
interface Stock { ticker: string; name: string; price: number; volatility: number; sector: string; }
const initialStocks: Stock[] = [
    { ticker: "GTCO", name: "GTCO Plc", price: 35.50, volatility: 0.08, sector: "BANKING" },
    { ticker: "ZENITHBANK", name: "Zenith Bank Plc", price: 34.20, volatility: 0.07, sector: "BANKING" },
    { ticker: "DANGCEM", name: "Dangote Cement", price: 320.00, volatility: 0.05, sector: "INDUSTRIAL" },
    { ticker: "MTNN", name: "MTN Nigeria", price: 235.00, volatility: 0.06, sector: "TELECOM" },
    { ticker: "OANDO", name: "Oando Plc", price: 10.80, volatility: 0.15, sector: "ENERGY" },
    { ticker: "DANGSUGAR", name: "Dangote Sugar", price: 42.10, volatility: 0.12, sector: "CONSUMER" },
];
const marketNewsEvents = [
    { text: "CBN increases interest rates to curb inflation.", effect: (s: Stock) => s.sector === 'BANKING' ? 1.05 : 0.98 },
    { text: "Global oil prices surge due to geopolitical tensions.", effect: (s: Stock) => s.sector === 'ENERGY' ? 1.15 : 1 },
    { text: "Government announces major infrastructure projects.", effect: (s: Stock) => s.sector === 'INDUSTRIAL' ? 1.10 : 0.99 },
    { text: "A major competitor to MTN reports disappointing earnings.", effect: (s: Stock) => s.ticker === 'MTNN' ? 1.08 : 1 },
    { text: "Bumper harvest season expected to lower raw material costs.", effect: (s: Stock) => s.sector === 'CONSUMER' ? 1.07 : 1 },
    // FIX: Made function signature consistent with others in the array to resolve a TypeScript inference error that caused downstream issues.
    { text: "A bearish sentiment grips the market; investors are selling off.", effect: (_s: Stock) => 0.96 },
];

const shuffleAndPick = (array: any[], num: number): any[] => [...array].sort(() => 0.5 - Math.random()).slice(0, num);

export const TestPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  
  // --- STATE MANAGEMENT ---
  const [stage, setStage] = useState<'menu' | 'finquest_arcade' | 'setup' | 'loading' | 'exam' | 'result' | 'review'>('menu');
  const [mode, setMode] = useState<'topic' | 'mock' | 'rapid_fire' | 'timeline' | 'stock_market' | 'cfo_challenge'>('topic');
  
  // Traditional CBT State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [score, setScore] = useState(0);
  const [topic, setTopic] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<Level>(auth?.user?.level || 100);

  // Gamified Modes State
  const [gameScore, setGameScore] = useState(0);
  const [gameLives, setGameLives] = useState(3);
  const [gameFeedback, setGameFeedback] = useState<{ status: 'correct' | 'wrong'; correctIndex: number; selectedIndex: number } | null>(null);
  
  // CFO Challenge State
  const [cfoGameState, setCfoGameState] = useState({ scenarioIndex: 0, score: 0, feedback: null as CfoChoice | null });

  // Stock Market State
  const [stockGameState, setStockGameState] = useState({ day: 1, cash: 1000000, holdings: {} as Record<string, number>, news: '', prices: initialStocks.reduce((acc, s) => ({...acc, [s.ticker]: s.price}), {} as Record<string, number>) });
  const [tradeModal, setTradeModal] = useState<{ type: 'buy' | 'sell', stock: Stock } | null>(null);
  const [tradeAmount, setTradeAmount] = useState(0);
  const [priceChanges, setPriceChanges] = useState<Record<string, 'up' | 'down'>>({});
  
  // General State
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing Session...');
  const timerRef = useRef<number | null>(null);

  // --- LIFECYCLE & TIMERS ---
  useEffect(() => {
    // This timer is only for traditional CBTs and rapid-fire games
    if (stage === 'exam' && ['topic', 'mock', 'rapid_fire', 'timeline'].includes(mode)) {
        timerRef.current = window.setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    if (['rapid_fire', 'timeline'].includes(mode)) handleGameOver(); else finishTest();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    } else {
        if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stage, mode]);

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  const formatNaira = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  // --- GAME LOGIC ---

  const startExam = async (selectedMode: typeof mode, setupDetails: any = {}) => {
    setMode(selectedMode);

    // AI/Traditional CBT modes
    if (['topic', 'mock', 'rapid_fire', 'timeline'].includes(selectedMode)) {
        if (selectedMode === 'topic' && !topic.trim()) { showNotification("Please enter a topic.", "error"); return; }
        setStage('loading');
        setLoadingProgress(10); setLoadingMessage('Consulting AI Expert...');
        const progressInterval = setInterval(() => setLoadingProgress(prev => Math.min(95, prev + 1)), 200);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            let prompt = "";
            let numQuestions = 20;
            if (selectedMode === 'topic') prompt = `Generate a JSON Array of 20 challenging multiple-choice questions for ${selectedLevel} Level Finance students on "${topic}". Format: [{"text": "Question?", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. Strictly JSON. No Markdown.`;
            else if (selectedMode === 'mock') { prompt = `Generate a JSON Array of 30 standard exam questions for ${selectedLevel} Level Finance students. Format: [{"text": "Question?", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. Strictly JSON. No Markdown.`; numQuestions = 30; }
            else if (selectedMode === 'rapid_fire') { prompt = `Generate a JSON Array of 50 rapid-fire finance trivia questions. Format: [{"text": "Question?", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. Strictly JSON.`; numQuestions = 50; }
            else if (selectedMode === 'timeline') { prompt = `Generate a JSON Array of 30 multiple-choice questions about Nigerian financial history and key economic events. Format: [{"text": "Question?", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]. Strictly JSON. No Markdown.`; numQuestions = 30; }
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview', contents: prompt,
                config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswer: { type: Type.INTEGER }}, required: ["text", "options", "correctAnswer"]}}}
            });
            trackAiUsage();
            if (!response.text) throw new Error("AI returned empty content.");
            const data = JSON.parse(response.text.replace(/```json|```/g, '').trim());
            if (!Array.isArray(data) || data.length === 0) throw new Error("Invalid question format");
            
            setQuestions(data.map((q: any, idx: number) => ({ id: idx, ...q })));

        } catch (e: any) {
            console.error("AI Generation failed:", e);
            showNotification("AI failed. Loading standard questions.", "warning");
            setLoadingMessage('AI Unavailable. Loading Standard Exam...');
            
            const fallbackSet = selectedMode === 'timeline' ? timelineFallbackQuestions : fallbackQuestions;
            const num = selectedMode === 'mock' ? 30 : selectedMode === 'rapid_fire' ? 50 : 20;
            const fallback = selectedMode !== 'timeline' ? fallbackSet.filter(q => q.level === selectedLevel) : fallbackSet;
            setQuestions(shuffleAndPick(fallback.length >= num ? fallback : fallbackSet, num));
        } finally {
            clearInterval(progressInterval);
            setLoadingProgress(100);
            if (selectedMode === 'topic') setTimeLeft(20 * 60); else if (selectedMode === 'mock') setTimeLeft(40 * 60); else setTimeLeft(30);
            setTimeout(() => { setStage('exam'); resetTestState(); }, 500);
        }
    } else {
        // Non-AI games
        setMode(selectedMode);
        setStage('exam');
        resetTestState();
    }
  };

  const handleRapidFireAnswer = (answerIndex: number) => {
      if (gameFeedback) return;
      const currentQ = questions[currentQuestionIndex];
      const isCorrect = answerIndex === currentQ.correctAnswer;
      setGameFeedback({ status: isCorrect ? 'correct' : 'wrong', correctIndex: currentQ.correctAnswer, selectedIndex: answerIndex });
      if (isCorrect) setGameScore(prev => prev + 10); else setGameLives(prev => prev - 1);
      
      setTimeout(() => {
          setGameFeedback(null);
          if (!isCorrect && gameLives <= 1) { handleGameOver(); return; }
          if (currentQuestionIndex < questions.length - 1) { setCurrentQuestionIndex(prev => prev + 1); setTimeLeft(30); }
          else handleGameOver(true);
      }, 1200);
  };

  const handleGameOver = async (isVictory = false) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setStage('result');
      if (auth?.user && !auth.user.badges?.includes('FINQUEST_SURVIVOR')) {
          const userRef = doc(db, 'users', auth.user.id);
          const allBadges = [...new Set([...(auth.user.badges || []), 'FINQUEST_SURVIVOR'])];
          await updateDoc(userRef, { badges: allBadges });
          auth.updateUser({ badges: allBadges });
          showNotification("Badge Unlocked: FinQuest Survivor!", "success");
      }
  };

  const finishTest = async () => {
      let s = 0;
      questions.forEach((q, idx) => { if (userAnswers[idx] === q.correctAnswer) s++; });
      const finalPercentage = questions.length > 0 ? Math.round((s / questions.length) * 100) : 0;
      setScore(finalPercentage);
      setStage('result');
      if (auth?.user && ['topic', 'mock'].includes(mode)) {
          try {
              const userRef = doc(db, 'users', auth.user.id);
              await addDoc(collection(db, 'test_results'), { userId: auth.user.id, score: finalPercentage, date: new Date().toISOString() });
              let points = finalPercentage >= 80 ? 5 : finalPercentage >= 50 ? 2 : 0;
              if (points > 0) { await updateDoc(userRef, { contributionPoints: increment(points) }); showNotification(`+${points} Points!`, "success"); }
          } catch (e) { console.error(e); }
      }
  };

  // Stock Market Game Actions
  const handleStockTrade = () => {
      if (!tradeModal) return;
      const { type, stock } = tradeModal;
      const currentPrice = stockGameState.prices[stock.ticker];
      
      if (type === 'buy') {
          const cost = tradeAmount * currentPrice;
          if (cost > stockGameState.cash) { showNotification("Not enough cash!", "error"); return; }
          setStockGameState(prev => ({ ...prev, cash: prev.cash - cost, holdings: { ...prev.holdings, [stock.ticker]: (prev.holdings[stock.ticker] || 0) + tradeAmount } }));
      } else { // sell
          const currentHolding = stockGameState.holdings[stock.ticker] || 0;
          if (tradeAmount > currentHolding) { showNotification("You don't own that many shares!", "error"); return; }
          const revenue = tradeAmount * currentPrice;
          setStockGameState(prev => ({ ...prev, cash: prev.cash + revenue, holdings: { ...prev.holdings, [stock.ticker]: currentHolding - tradeAmount } }));
      }
      setTradeModal(null); setTradeAmount(0);
  };
  
  const endStockDay = () => {
    const news = marketNewsEvents[Math.floor(Math.random() * marketNewsEvents.length)];
    const newPrices = { ...stockGameState.prices };
    const priceChanges: Record<string, 'up' | 'down'> = {};
    
    initialStocks.forEach(stock => {
        const oldPrice = newPrices[stock.ticker];
        const baseChange = (Math.random() - 0.5) * stock.volatility;
        const newsEffect = news.effect(stock);
        const newPrice = Math.max(1.00, oldPrice * (1 + baseChange) * newsEffect);
        newPrices[stock.ticker] = newPrice;
        if (newPrice > oldPrice) priceChanges[stock.ticker] = 'up';
        if (newPrice < oldPrice) priceChanges[stock.ticker] = 'down';
    });

    setPriceChanges(priceChanges);
    setTimeout(() => setPriceChanges({}), 1000); // Clear changes after animation

    if (stockGameState.day + 1 > 10) {
        setTimeout(() => setStage('result'), 500); // Delay for animation
    } else {
        setStockGameState(prev => ({ ...prev, day: prev.day + 1, prices: newPrices, news: news.text }));
    }
  };

  const handleCfoChoice = (choice: CfoChoice) => {
    setCfoGameState(prev => ({ ...prev, score: prev.score + choice.score, feedback: choice }));
  };

  const nextCfoScenario = () => {
    if (cfoGameState.scenarioIndex + 1 >= cfoScenarios.length) {
        setStage('result');
    } else {
        setCfoGameState(prev => ({ ...prev, scenarioIndex: prev.scenarioIndex + 1, feedback: null }));
    }
  };

  const resetTestState = () => {
      setUserAnswers({}); setCurrentQuestionIndex(0); setScore(0);
      setGameScore(0); setGameLives(3); setGameFeedback(null);
      setCfoGameState({ scenarioIndex: 0, score: 0, feedback: null });
      setStockGameState({ day: 1, cash: 1000000, holdings: {}, news: 'The market is open for trading!', prices: initialStocks.reduce((acc, s) => ({...acc, [s.ticker]: s.price}), {} as Record<string, number>) });
  };
  const resetTest = () => { setStage('menu'); resetTestState(); };

  // --- RENDERERS ---
  
  const renderSetup = () => ( <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 animate-fade-in"><div className="w-full max-w-lg"><div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700"><button onClick={() => setStage('menu')} className="text-xs font-bold text-slate-400 hover:text-indigo-500 flex items-center gap-1 mb-6">&larr; Back to Practice Hub</button><h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">Test Setup</h2><p className="text-slate-500 dark:text-slate-400 mb-8">{mode === 'topic' ? 'Specify a topic.' : 'Confirm to start standard mock exam.'}</p><div className="space-y-6">{mode === 'topic' && (<div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Topic</label><input value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-4 rounded-xl border" placeholder="e.g. Capital Budgeting" autoFocus /></div>)}<div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Level</label><select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value as Level)} className="w-full p-4 rounded-xl border appearance-none bg-white">{LEVELS.filter(l => typeof l === 'number').map(l => <option key={l} value={l}>{l}</option>)}</select></div><button onClick={() => startExam(mode)} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg">Start</button></div></div></div></div>);
  const renderLoading = () => ( <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white"><div className="relative w-48 h-48 flex items-center justify-center mb-8"><svg className="w-full h-full transform -rotate-90"><circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-indigo-900" /><circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={552.8} strokeDashoffset={552.8 - (552.8 * loadingProgress) / 100} className="text-indigo-400" /></svg><span className="absolute text-5xl font-mono font-bold">{loadingProgress}%</span></div><p className="text-lg font-bold text-indigo-300 animate-pulse">{loadingMessage}</p></div>);
  const renderResult = () => { 
    let finalScore = 0; let isPass = true; let title = "Game Over!"; let scoreLabel = "Points"; let scoreSuffix = "";

    if (['topic', 'mock'].includes(mode)) { finalScore = score; isPass = finalScore >= 50; title = "Test Complete!"; scoreLabel = "Score"; scoreSuffix = "%"; } 
    else if (['rapid_fire', 'timeline'].includes(mode)) { finalScore = gameScore; } 
    else if (mode === 'cfo_challenge') { finalScore = cfoGameState.score; let perfTitle = "Risky Business"; if (finalScore > 50) perfTitle = "Financial Guru"; else if (finalScore > 30) perfTitle = "Cautious Planner"; title = perfTitle; } 
    else if (mode === 'stock_market') {
        const portfolioValue = stockGameState.cash + Object.keys(stockGameState.holdings).reduce((acc, ticker) => acc + ((stockGameState.holdings[ticker] || 0) * (stockGameState.prices[ticker] || 0)), 0);
        finalScore = portfolioValue; const profit = finalScore - 1000000; isPass = profit >= 0; title = "Trading Closed!"; scoreLabel = "Final Portfolio";
        return ( <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 text-center"><h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">{title}</h2><p className={`text-xl font-bold ${isPass ? 'text-emerald-500' : 'text-rose-500'}`}>{isPass ? 'Profit' : 'Loss'}: {formatNaira(Math.abs(profit))}</p><div className="my-8 p-6 rounded-2xl bg-slate-100 dark:bg-slate-800"><p className="text-6xl font-black text-indigo-600 dark:text-indigo-400">{formatNaira(finalScore)}</p><p className="text-sm font-bold uppercase text-slate-500">{scoreLabel}</p></div><div className="flex gap-4"><button onClick={resetTest} className="px-6 py-3 bg-white border rounded-lg font-bold">Menu</button><button onClick={() => startExam('stock_market')} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg">Play Again</button></div></div>);
    }

    return ( <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 text-center"><div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 animate-float ${isPass ? 'bg-emerald-100' : 'bg-rose-100'}`}><span className="text-6xl">{isPass ? '🎉' : '😔'}</span></div><h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">{title}</h2><div className={`my-8 p-6 rounded-2xl border-2 ${isPass ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}><p className={`text-6xl font-black ${isPass ? 'text-emerald-600' : 'text-rose-600'}`}>{finalScore}{scoreSuffix}</p><p className="text-sm font-bold uppercase text-slate-500">{scoreLabel}</p></div><div className="flex gap-4"><button onClick={resetTest} className="px-6 py-3 bg-white border rounded-lg font-bold">Menu</button>{['topic', 'mock'].includes(mode) && <button onClick={() => setStage('review')} className="px-6 py-3 bg-indigo-100 text-indigo-700 font-bold">Review</button>}<button onClick={() => startExam(mode)} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg">Play Again</button></div>{['topic', 'mock'].includes(mode) && <button onClick={() => generateTestReviewPDF(questions, userAnswers, score, auth?.user)} className="mt-4 text-xs text-slate-400 hover:underline">Download PDF</button>}</div>);
  };
  const renderReview = () => ( <div className="min-h-screen bg-slate-100 p-8"><div className="max-w-4xl mx-auto"><div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-serif font-bold">Review Answers</h2><button onClick={() => setStage('result')} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold">Back</button></div><div className="space-y-6">{questions.map((q, i) => { const userAnswer = userAnswers[i]; const isCorrect = userAnswer === q.correctAnswer; return ( <div key={i} className="bg-white p-6 rounded-2xl border"><p className="font-bold mb-4">{i+1}. {q.text}</p><div className="space-y-2">{q.options.map((opt, optIdx) => ( <div key={optIdx} className={`p-3 rounded-lg border-2 text-sm ${optIdx === q.correctAnswer ? 'bg-emerald-50 border-emerald-300' : ''} ${!isCorrect && optIdx === userAnswer ? 'bg-rose-50 border-rose-300' : ''}`}>{String.fromCharCode(65+optIdx)}. {opt}</div>))}</div></div>);})}</div></div></div>);
  const renderTraditionalExam = () => { if (questions.length === 0) return null; return (<div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex"><div className="w-1/4 bg-white dark:bg-slate-900 p-4 border-r"><div className="overflow-y-auto"><h3 className="text-xs font-bold uppercase text-slate-400 mb-2 px-2">Questions</h3><div className="grid grid-cols-5 gap-2">{questions.map((_, i) => (<button key={i} onClick={() => setCurrentQuestionIndex(i)} className={`w-10 h-10 rounded-lg font-bold text-sm ${currentQuestionIndex === i ? 'bg-indigo-600 text-white' : userAnswers[i] !== undefined ? 'bg-emerald-100' : 'bg-slate-100'}`}>{i + 1}</button>))}</div></div><div className="mt-4 pt-4 border-t"><button onClick={finishTest} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg">Submit</button></div></div><div className="flex-1 p-12 overflow-y-auto relative"><div className="bg-slate-800 text-white p-4 rounded-xl flex items-center justify-between mb-8"><span>{mode} Mode</span><div className="flex items-center gap-4"><button onClick={() => setShowCalculator(!showCalculator)} title="Calculator"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 7h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></button><span className="font-mono text-xl">{formatTime(timeLeft)}</span></div></div>{showCalculator && <div className="absolute top-24 right-12 z-20"><Calculator/></div>}<div className="mb-8"><p className="text-sm font-bold text-indigo-600 mb-2">Question {currentQuestionIndex + 1} of {questions.length}</p><h2 className="text-2xl font-bold text-slate-900 dark:text-white">{questions[currentQuestionIndex].text}</h2></div><div className="space-y-4">{questions[currentQuestionIndex].options.map((opt, i) => (<button key={i} onClick={() => setUserAnswers({ ...userAnswers, [currentQuestionIndex]: i })} className={`w-full p-5 text-left rounded-xl border-2 flex items-start gap-4 ${userAnswers[currentQuestionIndex] === i ? 'bg-indigo-100 border-indigo-500' : 'bg-white'}`}><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 mt-1 ${userAnswers[currentQuestionIndex] === i ? 'bg-indigo-600 text-white' : 'border-slate-300'}`}>{String.fromCharCode(65 + i)}</div><span>{opt}</span></button>))}</div><div className="flex justify-between mt-12"><button onClick={() => {if(currentQuestionIndex > 0) setCurrentQuestionIndex(p=>p-1)}} disabled={currentQuestionIndex === 0}>Previous</button><button onClick={() => {if(currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(p=>p+1)}} disabled={currentQuestionIndex === questions.length - 1}>Next</button></div></div></div>); };
  const renderRapidFireGame = () => { if (questions.length === 0) return null; return ( <div className="min-h-screen bg-slate-900 text-white flex flex-col p-8"><header className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold font-serif text-indigo-300">{mode === 'timeline' ? 'Naija Finance Timeline' : 'Rapid Fire'}</h2><div className="flex items-center gap-4"><div className="flex gap-1 text-2xl">{Array(gameLives).fill(0).map((_, i) => <span key={i} className="text-rose-500 animate-pulse">♥</span>)}{Array(3-gameLives).fill(0).map((_, i) => <span key={i} className="text-rose-900">♥</span>)}</div><div className="px-4 py-2 bg-amber-400 text-slate-900 rounded font-bold"><span key={gameScore} className="inline-block animate-pop-in">{gameScore}</span></div></div></header><main className="flex-1 flex flex-col items-center justify-center text-center"><div className="relative w-24 h-24 mb-6"><svg className="w-full h-full transform -rotate-90"><circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-indigo-800" /><circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={276.4} strokeDashoffset={276.4 - (276.4 * timeLeft) / 30} className={timeLeft < 10 ? 'text-rose-500' : 'text-indigo-400'} style={{transition: 'stroke-dashoffset 1s linear, stroke 0.3s'}} /></svg><span className={`absolute inset-0 flex items-center justify-center text-3xl font-mono transition-colors ${timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-indigo-400'}`}>{timeLeft}</span></div><h3 key={currentQuestionIndex} className="text-3xl font-bold max-w-3xl mb-12 animate-fade-in-down">{questions[currentQuestionIndex].text}</h3><div className="grid grid-cols-2 gap-4 w-full max-w-3xl">{questions[currentQuestionIndex].options.map((opt, i) => (<button key={i} onClick={() => handleRapidFireAnswer(i)} disabled={!!gameFeedback} className={`p-4 rounded-xl text-lg font-semibold text-left border-4 transition-all duration-300 ${gameFeedback && gameFeedback.correctIndex === i ? 'bg-emerald-500 border-emerald-400 animate-pulse' : ''} ${gameFeedback?.status === 'wrong' && gameFeedback.selectedIndex === i ? 'bg-rose-600 border-rose-500 animate-shake' : ''} ${!gameFeedback ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'border-transparent'}`}>{opt}</button>))}</div></main></div>); };
  const renderCfoChallengeGame = () => { const scenario = cfoScenarios[cfoGameState.scenarioIndex]; return ( <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center"><h2 className="text-indigo-300 font-bold uppercase tracking-widest text-sm mb-4">CFO Challenge - Scenario {cfoGameState.scenarioIndex + 1}/{cfoScenarios.length}</h2><p key={cfoGameState.scenarioIndex} className="text-3xl font-serif font-bold max-w-3xl mb-12 animate-fade-in-down">{scenario.prompt}</p><div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">{scenario.choices.map((choice, i) => (<button key={i} onClick={() => handleCfoChoice(choice)} disabled={!!cfoGameState.feedback} className="p-6 bg-slate-800 rounded-xl text-left hover:bg-indigo-800 transition disabled:opacity-70">{choice.text}</button>))}</div>{cfoGameState.feedback && <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"><div className="bg-white text-slate-900 p-8 rounded-2xl max-w-lg animate-fade-in-up"><h3 className={`text-2xl font-bold mb-4 ${cfoGameState.feedback.score > 5 ? 'text-emerald-600' : 'text-amber-600'}`}>Consequence</h3><p className="mb-6">{cfoGameState.feedback.feedback}</p><button onClick={nextCfoScenario} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg">Next Scenario</button></div></div>}</div> ); };
  const renderStockMarketGame = () => { const portfolioValue = stockGameState.cash + Object.keys(stockGameState.holdings).reduce((acc, ticker) => acc + ((stockGameState.holdings[ticker] || 0) * (stockGameState.prices[ticker] || 0)), 0); return ( <div className="min-h-screen bg-slate-950 text-white p-6"><header className="flex justify-between items-center mb-6"><h2 className="text-2xl font-serif font-bold text-indigo-300">FINSA Stock Exchange</h2><div className="text-right"><p className="text-xs uppercase text-slate-400">Day {stockGameState.day}/10</p><p key={portfolioValue} className="text-2xl font-bold animate-pop-in">{formatNaira(portfolioValue)}</p></div></header><div className="bg-slate-800/50 p-3 rounded-xl text-sm mb-6 whitespace-nowrap overflow-hidden"><div className="animate-marquee inline-block">📢 {stockGameState.news}</div></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">{initialStocks.map(stock => { const change = priceChanges[stock.ticker]; const color = change === 'up' ? 'text-emerald-400' : change === 'down' ? 'text-rose-400' : 'text-white'; return (<div key={stock.ticker} className="bg-slate-800 p-4 rounded-xl border border-slate-700"><div className="flex justify-between items-center mb-2"><h3 className="font-bold">{stock.ticker}</h3><p key={`${stock.ticker}-${stockGameState.prices[stock.ticker]}`} className={`font-mono text-lg animate-pop-in transition-colors ${color}`}>{formatNaira(stockGameState.prices[stock.ticker])}</p></div><div className="flex gap-2"><button onClick={() => setTradeModal({type: 'buy', stock})} className="flex-1 py-2 bg-emerald-600 rounded text-xs font-bold">Buy</button><button onClick={() => setTradeModal({type: 'sell', stock})} className="flex-1 py-2 bg-rose-600 rounded text-xs font-bold">Sell</button></div></div>)})}</div><div className="bg-slate-800 p-6 rounded-2xl flex flex-col"><h3 className="font-bold mb-4">Your Portfolio</h3><p className="text-3xl font-bold text-emerald-400 mb-4">{formatNaira(stockGameState.cash)}</p><div className="space-y-2 flex-1 overflow-y-auto mb-4">{Object.entries(stockGameState.holdings).map(([ticker, shares]) => shares > 0 && (<div key={ticker} className="flex justify-between text-sm"><span className="font-bold">{ticker}: {shares}</span><span>{formatNaira(shares * stockGameState.prices[ticker])}</span></div>))}</div><button onClick={endStockDay} className="w-full py-3 bg-indigo-600 rounded-lg font-bold mt-auto">End Day</button></div></div>{tradeModal && <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"><div className="bg-slate-800 p-8 rounded-2xl w-full max-w-sm animate-fade-in-up"><h3 className="text-xl font-bold mb-4 capitalize">{tradeModal.type} {tradeModal.stock.ticker}</h3><input type="number" value={tradeAmount} onChange={e => setTradeAmount(parseInt(e.target.value) || 0)} className="w-full p-3 rounded bg-slate-700 text-white mb-4" placeholder="Number of shares" /><div className="flex gap-2"><button onClick={() => setTradeModal(null)} className="flex-1 py-2 border rounded">Cancel</button><button onClick={handleStockTrade} className="flex-1 py-2 bg-indigo-600 rounded font-bold">Confirm</button></div></div></div>}</div>); };
  
  const GameCard = ({ title, desc, icon, onClick, mode }: any) => ( <div onClick={() => onClick(mode)} className="group relative bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border border-slate-200 dark:border-slate-700 hover:-translate-y-2 text-left cursor-pointer overflow-hidden flex flex-col"><div className="absolute top-0 right-0 p-4 text-slate-100 dark:text-slate-800 text-8xl opacity-50 group-hover:opacity-100 group-hover:scale-125 transition-all duration-300 group-hover:rotate-6">{icon}</div><div className="relative z-10 flex-1 flex flex-col"><h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{title}</h3><p className="text-slate-500 dark:text-slate-400 text-sm flex-1">{desc}</p><div className="mt-6 text-sm font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">Play Now &rarr;</div></div></div> );
  const renderFinquestArcade = () => ( <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-16 px-4 animate-fade-in"><div className="container mx-auto max-w-7xl"><div className="flex justify-between items-center mb-12"><button onClick={() => setStage('menu')} className="text-sm font-bold text-slate-500 hover:text-indigo-500 flex items-center gap-2">&larr; Back to Practice Hub</button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><GameCard title="Rapid Fire Quiz" desc="A fast-paced survival quiz. Answer questions against the clock, three strikes and you're out!" icon="🕹️" onClick={startExam} mode="rapid_fire" /><GameCard title="Naija Finance Timeline" desc="Test your knowledge of Nigeria's key financial and economic events. Place historical moments in their correct time periods." icon="🇳🇬" onClick={startExam} mode="timeline" /><GameCard title="FINSA Stock Exchange" desc="Manage a virtual ₦1M portfolio. Buy and sell real Nigerian stocks over 10 simulated days, reacting to dynamic market news." icon="📈" onClick={startExam} mode="stock_market" /><GameCard title="The CFO Challenge" desc="Step into the shoes of a CFO and make tough corporate finance decisions. Your choices have real consequences." icon="👔" onClick={startExam} mode="cfo_challenge" /></div></div></div>);

  switch (stage) {
      case 'menu': return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-16 px-4 animate-fade-in">
            <div className="container mx-auto max-w-5xl">
                 <div className="text-center mb-16"><h1 className="text-5xl font-serif font-bold text-slate-900 dark:text-white mb-4">Practice Center</h1><p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Choose a mode to test your knowledge and prepare for exams.</p></div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div onClick={() => { setMode('mock'); setStage('setup'); }} className="group p-8 bg-white dark:bg-slate-800 rounded-3xl text-center shadow-lg hover:shadow-2xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-transform hover:-translate-y-2 flex flex-col items-center"><div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-3xl mb-4">📄</div><h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Standard Mock Exam</h3><p className="text-sm text-slate-500 dark:text-slate-400 flex-1">A timed, multi-topic exam simulating real test conditions.</p><div className="mt-6 text-sm font-bold text-indigo-600 dark:text-indigo-400">Start Exam &rarr;</div></div>
                    <div onClick={() => { setMode('topic'); setStage('setup'); }} className="group p-8 bg-white dark:bg-slate-800 rounded-3xl text-center shadow-lg hover:shadow-2xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-transform hover:-translate-y-2 flex flex-col items-center"><div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-3xl mb-4">🎯</div><h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Topic Mastery</h3><p className="text-sm text-slate-500 dark:text-slate-400 flex-1">Generate a custom test on any specific topic you choose.</p><div className="mt-6 text-sm font-bold text-indigo-600 dark:text-indigo-400">Specify Topic &rarr;</div></div>
                    <div onClick={() => setStage('finquest_arcade')} className="group p-8 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-3xl text-center shadow-2xl hover:shadow-purple-400/30 cursor-pointer transition-all hover:-translate-y-2 flex flex-col items-center"><div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-4">🎮</div><h3 className="text-xl font-bold mb-2">FINQUEST Arcade</h3><p className="text-sm text-indigo-100 flex-1">Play interactive finance games to learn in a fun, engaging way.</p><div className="mt-6 text-sm font-bold">Enter Arcade &rarr;</div></div>
                 </div>
            </div>
        </div>
      );
      case 'finquest_arcade': return renderFinquestArcade();
      case 'setup': return renderSetup();
      case 'loading': return renderLoading();
      case 'exam': 
        if (mode === 'rapid_fire' || mode === 'timeline') return renderRapidFireGame();
        if (mode === 'stock_market') return renderStockMarketGame();
        if (mode === 'cfo_challenge') return renderCfoChallengeGame();
        return renderTraditionalExam();
      case 'result': return renderResult();
      case 'review': return renderReview();
      default: return null;
  }
};

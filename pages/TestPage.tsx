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
    { id: 4, icon: <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>, prompt: "Disaster, {{name}}! Sales have dropped 20% due to a sudden recession. What is your immediate priority as CFO?", choices: [
        { text: "Cut costs across the board, including layoffs.", feedback: "A drastic but often necessary step to preserve cash. However, it can damage morale and long-term capabilities if not done carefully.", score: 5 },
        { text: "Secure a new line of credit immediately.", feedback: "Crucial move. Access to liquidity is king in a downturn. This gives you options and a safety net to navigate the crisis.", score: 15 },
        { text: "Increase marketing spend to win back customers.", feedback: "Counter-intuitive but can be effective. 'Spending your way out' can gain market share while competitors retreat, but it's a cash-intensive gamble.", score: 5 },
        { text: "Sell off a non-core business division.", feedback: "A good long-term strategic move to raise cash, but it's not an 'immediate' solution. The sale process can take months.", score: 0 },
    ]},
    { id: 5, icon: <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, prompt: "Your top-performing division needs a new ₦2bn machine. Their manager wants to lease it, not buy it. What's your final call?", choices: [
        { text: "Approve the lease. It's cheaper upfront.", feedback: "Leasing (Operating Lease) keeps the large expense off the balance sheet and preserves cash. A flexible and often smart choice for rapidly evolving tech.", score: 15 },
        { text: "Deny the lease. Buying is always better for ownership.", feedback: "Not necessarily. Buying (Capital Expenditure) offers depreciation tax benefits, but it's a large cash outlay and you're stuck with an asset that may become obsolete.", score: 0 },
        { text: "Analyze the Net Advantage to Leasing (NAL).", feedback: "The textbook CFO answer. This calculation directly compares the present value of the costs of leasing vs. buying to make a purely financial decision.", score: 10 },
        { text: "Tell the manager to find a cheaper machine.", feedback: "While cost control is important, denying your best division a critical tool could hurt their performance and overall company profits.", score: 5 },
    ]},
    { id: 6, icon: <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>, prompt: "The exchange rate has suddenly become volatile, threatening the cost of your imported raw materials. What's your hedging strategy, {{name}}?", choices: [
        { text: "Do nothing and hope the rate stabilizes.", feedback: "A high-risk 'wait and see' approach. If the Naira weakens further, your costs could skyrocket, erasing your profit margins.", score: 0 },
        { text: "Buy foreign currency forward contracts.", feedback: "Excellent. This locks in a future exchange rate today, protecting you from unfavorable movements and providing cost certainty.", score: 15 },
        { text: "Immediately buy a large amount of foreign currency.", feedback: "This protects you, but it ties up a significant amount of cash (working capital) that could be used elsewhere in the business.", score: 5 },
        { text: "Switch to a local supplier immediately.", feedback: "A good long-term solution, but finding and vetting a new supplier isn't an immediate fix for the current currency risk.", score: 5 },
    ]},
    { id: 7, icon: <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>, prompt: "A junior analyst discovers a potential accounting fraud in a small subsidiary. It's not material to the group's earnings, but it's unethical. How do you proceed?", choices: [
        { text: "Launch a full, independent internal audit immediately.", feedback: "The only correct answer. Integrity is non-negotiable. An immediate and thorough investigation is required to understand the scope and take action.", score: 15 },
        { text: "Fire the analyst for 'overreacting'.", feedback: "A terrible decision that promotes a culture of fear and cover-ups. This could lead to massive future scandals.", score: 0 },
        { text: "Tell the subsidiary manager to fix it quietly.", feedback: "Risky. You are relying on the person potentially responsible for the issue to resolve it. This lacks oversight and accountability.", score: 5 },
        { text: "Wait to see if external auditors discover it.", feedback: "A dangerous gamble. If they find it and you knew about it, you could be held personally liable for concealing fraud.", score: 0 },
    ]},
];

// --- Stock Market Game Data ---
interface Stock { ticker: string; name: string; price: number; volatility: number; sector: string; }
const initialStocks: Stock[] = [
    { ticker: "GTCO", name: "GTCO Plc", price: 35.50, volatility: 0.12, sector: "BANKING" },
    { ticker: "ZENITHBANK", name: "Zenith Bank Plc", price: 34.20, volatility: 0.11, sector: "BANKING" },
    { ticker: "DANGCEM", name: "Dangote Cement", price: 320.00, volatility: 0.08, sector: "INDUSTRIAL" },
    { ticker: "MTNN", name: "MTN Nigeria", price: 235.00, volatility: 0.10, sector: "TELECOM" },
    { ticker: "OANDO", name: "Oando Plc", price: 10.80, volatility: 0.25, sector: "ENERGY" },
    { ticker: "DANGSUGAR", name: "Dangote Sugar", price: 42.10, volatility: 0.18, sector: "CONSUMER" },
];
const marketNewsEvents = [
    { text: "CBN unexpectedly increases interest rates by 200 basis points to curb inflation.", effect: (s: Stock) => s.sector === 'BANKING' ? 1.08 : 0.96 },
    { text: "Global oil prices surge by 20% due to geopolitical tensions.", effect: (s: Stock) => s.sector === 'ENERGY' ? 1.20 : 1 },
    { text: "Government announces a massive ₦5 trillion infrastructure bond.", effect: (s: Stock) => s.sector === 'INDUSTRIAL' ? 1.15 : 0.99 },
    { text: "A major competitor to MTN reports disappointing earnings, citing regulatory headwinds.", effect: (s: Stock) => s.ticker === 'MTNN' ? 1.10 : 1 },
    { text: "Bumper harvest season expected to lower raw material costs for consumer goods companies.", effect: (s: Stock) => s.sector === 'CONSUMER' ? 1.09 : 1 },
    { text: "A bearish sentiment grips the market; foreign investors are selling off.", effect: (_s: Stock) => 0.94 },
    { text: "New NCC regulations cap data prices, putting pressure on Telecom revenues.", effect: (s: Stock) => s.sector === 'TELECOM' ? 0.92 : 1.01 },
    { text: "Unexpected fuel subsidy removal announcement sends shockwaves through the economy.", effect: (s: Stock) => s.sector === 'ENERGY' ? 1.25 : 0.95 },
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
  const [powerups, setPowerups] = useState({ fiftyFifty: 1 });
  const [displayedOptions, setDisplayedOptions] = useState<string[] | null>(null);
  
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
  const [showInstructionModal, setShowInstructionModal] = useState<{ show: boolean, mode: typeof mode | null }>({ show: false, mode: null });
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

  const handleStartGame = (selectedMode: typeof mode) => {
      setShowInstructionModal({ show: true, mode: selectedMode });
  }

  const startExam = async (selectedMode: typeof mode, setupDetails: any = {}) => {
    setShowInstructionModal({ show: false, mode: null });
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

  const useFiftyFifty = async () => {
    if (powerups.fiftyFifty > 0) {
        setPowerups(prev => ({ ...prev, fiftyFifty: prev.fiftyFifty - 1}));
    } else {
        if ((auth?.user?.contributionPoints || 0) < 10) {
            showNotification("Not enough points to buy 50/50!", "error");
            return;
        }
        if (!window.confirm("Use 10 points to buy a 50/50 power-up?")) return;
        try {
            const userRef = doc(db, 'users', auth!.user!.id);
            await updateDoc(userRef, { contributionPoints: increment(-10) });
            auth?.updateUser({ contributionPoints: (auth?.user?.contributionPoints || 0) - 10 });
        } catch (e) {
            showNotification("Purchase failed!", "error");
            return;
        }
    }
    
    const currentQ = questions[currentQuestionIndex];
    const correctIdx = currentQ.correctAnswer;
    const wrongOptions = currentQ.options.map((_, i) => i).filter(i => i !== correctIdx);
    const randomWrongIdx = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
    
    const newOptions = currentQ.options.map((opt, i) => {
        if (i === correctIdx || i === randomWrongIdx) return opt;
        return null;
    });
    setDisplayedOptions(newOptions as string[]);
  };

  const handleRapidFireAnswer = (answerIndex: number) => {
      if (gameFeedback) return;
      const currentQ = questions[currentQuestionIndex];
      const isCorrect = answerIndex === currentQ.correctAnswer;
      setGameFeedback({ status: isCorrect ? 'correct' : 'wrong', correctIndex: currentQ.correctAnswer, selectedIndex: answerIndex });
      if (isCorrect) setGameScore(prev => prev + 10); else setGameLives(prev => prev - 1);
      
      setTimeout(() => {
          setGameFeedback(null);
          setDisplayedOptions(null);
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
        let newPrice = oldPrice * (1 + baseChange) * newsEffect;
        newPrice = Math.max(0.50, Math.round(newPrice * 100) / 100);
        newPrices[stock.ticker] = newPrice;
        if (newPrice > oldPrice) priceChanges[stock.ticker] = 'up';
        if (newPrice < oldPrice) priceChanges[stock.ticker] = 'down';
    });

    setPriceChanges(priceChanges);
    setTimeout(() => setPriceChanges({}), 1000); // Clear changes after animation

    if (stockGameState.day + 1 > 15) {
        setTimeout(async () => {
            const portfolioValue = stockGameState.cash + Object.keys(stockGameState.holdings).reduce((acc, ticker) => acc + ((stockGameState.holdings[ticker] || 0) * (newPrices[ticker] || 0)), 0);
            const profit = portfolioValue - 1000000;
            const points = Math.max(0, Math.floor(profit / 20000));
            if (auth?.user && points > 0) {
                const userRef = doc(db, 'users', auth.user.id);
                await updateDoc(userRef, { contributionPoints: increment(points) });
                showNotification(`+${points} Points for trading performance!`, "success");
            }
            setStage('result');
        }, 500);
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
      setPowerups({ fiftyFifty: 1 }); setDisplayedOptions(null);
      setCfoGameState({ scenarioIndex: 0, score: 0, feedback: null });
      setStockGameState({ day: 1, cash: 1000000, holdings: {}, news: 'The market is open for trading!', prices: initialStocks.reduce((acc, s) => ({...acc, [s.ticker]: s.price}), {} as Record<string, number>) });
  };
  const resetTest = () => { setStage('menu'); resetTestState(); };

  // --- RENDERERS ---
  
  const renderResult = () => { 
    // FIX: Initialize `finalScore` as a number to prevent TypeScript from inferring it as 'unknown', which caused comparison errors.
    let finalScore: number = 0; 
    let isPass = true; 
    let title = "Game Over!"; 
    let scoreLabel = "Points"; 
    let scoreSuffix = "";

    if (['topic', 'mock'].includes(mode)) { 
        finalScore = score; 
        isPass = finalScore >= 50; 
        title = "Test Complete!"; 
        scoreLabel = "Score"; 
        scoreSuffix = "%"; 
    } 
    else if (['rapid_fire', 'timeline'].includes(mode)) { 
        finalScore = gameScore; 
    } 
    else if (mode === 'cfo_challenge') { 
        finalScore = cfoGameState.score; 
        let perfTitle = "Risky Business"; 
        if (finalScore > 50) perfTitle = "Financial Guru"; 
        else if (finalScore > 30) perfTitle = "Cautious Planner"; 
        title = perfTitle; 
    } 
    else if (mode === 'stock_market') {
        const portfolioValue = stockGameState.cash + Object.keys(stockGameState.holdings).reduce((acc, ticker) => acc + ((stockGameState.holdings[ticker] || 0) * (stockGameState.prices[ticker] || 0)), 0);
        finalScore = portfolioValue; 
        const profit = finalScore - 1000000;
        isPass = profit >= 0; 
        title = "Trading Closed!"; 
        scoreLabel = "Final Portfolio";
        return ( <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 text-center"><h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">{title}</h2><p className={`text-xl font-bold ${isPass ? 'text-emerald-500' : 'text-rose-500'}`}>{isPass ? 'Profit' : 'Loss'}: {formatNaira(Math.abs(profit))}</p><div className="my-8 p-6 rounded-2xl bg-slate-100 dark:bg-slate-800"><p className="text-6xl font-black text-indigo-600 dark:text-indigo-400">{formatNaira(finalScore)}</p><p className="text-sm font-bold uppercase text-slate-500">{scoreLabel}</p></div><div className="flex gap-4"><button onClick={resetTest} className="px-6 py-3 bg-white border rounded-lg font-bold">Menu</button><button onClick={() => handleStartGame('stock_market')} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg">Play Again</button></div></div>);
    }

    return ( <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 text-center"><div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 animate-float ${isPass ? 'bg-emerald-100' : 'bg-rose-100'}`}><span className="text-6xl">{isPass ? '🎉' : '😔'}</span></div><h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">{title}</h2><div className={`my-8 p-6 rounded-2xl border-2 ${isPass ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}><p className={`text-6xl font-black ${isPass ? 'text-emerald-600' : 'text-rose-600'}`}>{finalScore}{scoreSuffix}</p><p className="text-sm font-bold uppercase text-slate-500">{scoreLabel}</p></div><div className="flex gap-4"><button onClick={resetTest} className="px-6 py-3 bg-white border rounded-lg font-bold">Menu</button>{['topic', 'mock'].includes(mode) && <button onClick={() => setStage('review')} className="px-6 py-3 bg-indigo-100 text-indigo-700 font-bold">Review</button>}<button onClick={() => handleStartGame(mode)} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg">Play Again</button></div>{['topic', 'mock'].includes(mode) && <button onClick={() => generateTestReviewPDF(questions, userAnswers, score, auth?.user)} className="mt-4 text-xs text-slate-400 hover:underline">Download PDF</button>}</div>);
  };
  const renderReview = () => ( <div className="min-h-screen bg-slate-100 p-8"><div className="max-w-4xl mx-auto"><div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-serif font-bold">Review Answers</h2><button onClick={() => setStage('result')} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold">Back</button></div><div className="space-y-6">{questions.map((q, i) => { const userAnswer = userAnswers[i]; const isCorrect = userAnswer === q.correctAnswer; return ( <div key={i} className="bg-white p-6 rounded-2xl border"><p className="font-bold mb-4">{i+1}. {q.text}</p><div className="space-y-2">{q.options.map((opt, optIdx) => ( <div key={optIdx} className={`p-3 rounded-lg border-2 text-sm ${optIdx === q.correctAnswer ? 'bg-emerald-50 border-emerald-300' : ''} ${!isCorrect && optIdx === userAnswer ? 'bg-rose-50 border-rose-300' : ''}`}>{String.fromCharCode(65+optIdx)}. {opt}</div>))}</div></div>);})}</div></div></div>);
  const renderTraditionalExam = () => { if (questions.length === 0) return null; return (<div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex"><div className="w-1/4 bg-white dark:bg-slate-900 p-4 border-r"><div className="overflow-y-auto"><h3 className="text-xs font-bold uppercase text-slate-400 mb-2 px-2">Questions</h3><div className="grid grid-cols-5 gap-2">{questions.map((_, i) => (<button key={i} onClick={() => setCurrentQuestionIndex(i)} className={`w-10 h-10 rounded-lg font-bold text-sm ${currentQuestionIndex === i ? 'bg-indigo-600 text-white' : userAnswers[i] !== undefined ? 'bg-emerald-100' : 'bg-slate-100'}`}>{i + 1}</button>))}</div></div><div className="mt-4 pt-4 border-t"><button onClick={finishTest} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg">Submit</button></div></div><div className="flex-1 p-12 overflow-y-auto relative"><div className="bg-slate-800 text-white p-4 rounded-xl flex items-center justify-between mb-8"><span>{mode} Mode</span><div className="flex items-center gap-4"><button onClick={() => setShowCalculator(!showCalculator)} title="Calculator"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 7h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></button><span className="font-mono text-xl">{formatTime(timeLeft)}</span></div></div>{showCalculator && <div className="absolute top-24 right-12 z-20"><Calculator onClose={() => setShowCalculator(false)}/></div>}<div className="mb-8"><p className="text-sm font-bold text-indigo-600 mb-2">Question {currentQuestionIndex + 1} of {questions.length}</p><h2 className="text-2xl font-bold text-slate-900 dark:text-white">{questions[currentQuestionIndex].text}</h2></div><div className="space-y-4">{questions[currentQuestionIndex].options.map((opt, i) => (<button key={i} onClick={() => setUserAnswers({ ...userAnswers, [currentQuestionIndex]: i })} className={`w-full p-5 text-left rounded-xl border-2 flex items-start gap-4 ${userAnswers[currentQuestionIndex] === i ? 'bg-indigo-100 border-indigo-500' : 'bg-white'}`}><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 mt-1 ${userAnswers[currentQuestionIndex] === i ? 'bg-indigo-600 text-white' : 'border-slate-300'}`}>{String.fromCharCode(65 + i)}</div><span>{opt}</span></button>))}</div><div className="flex justify-between mt-12"><button onClick={() => {if(currentQuestionIndex > 0) setCurrentQuestionIndex(p=>p-1)}} disabled={currentQuestionIndex === 0}>Previous</button><button onClick={() => {if(currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(p=>p+1)}} disabled={currentQuestionIndex === questions.length - 1}>Next</button></div></div></div>); };
  const renderRapidFireGame = () => { if (questions.length === 0) return null; const currentQ = questions[currentQuestionIndex]; const options = displayedOptions || currentQ.options; return ( <div className="min-h-screen bg-slate-900 text-white flex flex-col p-8"><header className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold font-serif text-indigo-300">{mode === 'timeline' ? 'Naija Finance Timeline' : 'Rapid Fire'}</h2><div className="flex items-center gap-4"><div className="flex gap-1 text-2xl items-center">{Array(gameLives).fill(0).map((_, i) => <svg key={i} className="w-7 h-7 text-rose-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>)}{Array(3-gameLives).fill(0).map((_, i) => <svg key={i} className="w-7 h-7 text-rose-900/50" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>)}</div><div className="px-4 py-2 bg-amber-400 text-slate-900 rounded font-bold"><span key={gameScore} className="inline-block animate-pop-in">{gameScore}</span></div></div></header><main className="flex-1 flex flex-col items-center justify-center text-center"><div className="relative w-24 h-24 mb-6"><svg className="w-full h-full transform -rotate-90"><circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-indigo-800" /><circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={276.4} strokeDashoffset={276.4 - (276.4 * timeLeft) / 30} className={timeLeft < 10 ? 'text-rose-500' : 'text-indigo-400'} style={{transition: 'stroke-dashoffset 1s linear, stroke 0.3s'}} /></svg><span className={`absolute inset-0 flex items-center justify-center text-3xl font-mono transition-colors ${timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-indigo-400'}`}>{timeLeft}</span></div><h3 key={currentQuestionIndex} className="text-3xl font-bold max-w-3xl mb-12 animate-fade-in-down">{currentQ.text}</h3><div className="grid grid-cols-2 gap-4 w-full max-w-3xl">{options.map((opt, i) => (<button key={i} onClick={() => handleRapidFireAnswer(i)} disabled={!!gameFeedback || opt === null} className={`p-4 rounded-xl text-lg font-semibold text-left border-4 transition-all duration-300 ${opt === null ? 'opacity-0' : ''} ${gameFeedback && gameFeedback.correctIndex === i ? 'bg-emerald-500 border-emerald-400 animate-pulse' : ''} ${gameFeedback?.status === 'wrong' && gameFeedback.selectedIndex === i ? 'bg-rose-600 border-rose-500 animate-shake' : ''} ${!gameFeedback ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'border-transparent'}`}>{opt}</button>))}</div><div className="mt-8"><button onClick={useFiftyFifty} disabled={!!displayedOptions || (powerups.fiftyFifty === 0 && (auth?.user?.contributionPoints || 0) < 10)} className="bg-yellow-500 text-slate-900 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-yellow-400 transition disabled:opacity-50">50/50 <span className="text-xs">({powerups.fiftyFifty > 0 ? `${powerups.fiftyFifty} Free` : '10 Pts'})</span></button></div></main></div>); };
  const renderCfoChallengeGame = () => { const scenario = cfoScenarios[cfoGameState.scenarioIndex]; const prompt = scenario.prompt.replace(/{{name}}|{{username}}/g, auth?.user?.name || 'CFO'); return ( <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center"><div className="text-indigo-400 mb-6">{scenario.icon}</div><h2 className="text-indigo-300 font-bold uppercase tracking-widest text-sm mb-4">CFO Challenge - Scenario {cfoGameState.scenarioIndex + 1}/{cfoScenarios.length}</h2><p key={cfoGameState.scenarioIndex} className="text-3xl font-serif font-bold max-w-3xl mb-12 animate-fade-in-down">{prompt}</p><div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">{scenario.choices.map((choice, i) => (<button key={i} onClick={() => handleCfoChoice(choice)} disabled={!!cfoGameState.feedback} className="p-6 bg-slate-800 rounded-xl text-left hover:bg-indigo-800 transition disabled:opacity-70">{choice.text}</button>))}</div>{cfoGameState.feedback && <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"><div className="bg-white text-slate-900 p-8 rounded-2xl max-w-lg animate-fade-in-up"><h3 className={`text-2xl font-bold mb-4 ${cfoGameState.feedback.score > 5 ? 'text-emerald-600' : 'text-amber-600'}`}>Consequence</h3><p className="mb-6">{cfoGameState.feedback.feedback}</p><button onClick={nextCfoScenario} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg">Next</button></div></div>}</div> ); };
  const renderStockMarketGame = () => { const portfolioValue = stockGameState.cash + Object.keys(stockGameState.holdings).reduce((acc, ticker) => acc + ((stockGameState.holdings[ticker] || 0) * (stockGameState.prices[ticker] || 0)), 0); return ( <div className="min-h-screen bg-slate-950 text-white p-6"><header className="flex justify-between items-center mb-6"><h2 className="text-2xl font-serif font-bold text-indigo-300">FINSA Stock Exchange</h2><div className="text-right"><p className="text-xs uppercase text-slate-400">Day {stockGameState.day}/15</p><p key={portfolioValue} className="text-2xl font-bold animate-pop-in">{formatNaira(portfolioValue)}</p></div></header><div className="bg-slate-800/50 p-3 rounded-xl text-sm mb-6 whitespace-nowrap overflow-hidden"><div className="animate-marquee inline-block">📢 {stockGameState.news}</div></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">{initialStocks.map(stock => { const change = priceChanges[stock.ticker]; const color = change === 'up' ? 'text-emerald-400' : change === 'down' ? 'text-rose-400' : 'text-white'; return (<div key={stock.ticker} className="bg-slate-800 p-4 rounded-xl border border-slate-700"><div className="flex justify-between items-center mb-2"><h3 className="font-bold">{stock.ticker}</h3><p key={`${stock.ticker}-${stockGameState.prices[stock.ticker]}`} className={`font-mono text-lg animate-pop-in transition-colors ${color}`}>{formatNaira(stockGameState.prices[stock.ticker])}</p></div><div className="flex gap-2"><button onClick={() => setTradeModal({type: 'buy', stock})} className="flex-1 py-2 bg-emerald-600 rounded text-xs font-bold">Buy</button><button onClick={() => setTradeModal({type: 'sell', stock})} className="flex-1 py-2 bg-rose-600 rounded text-xs font-bold">Sell</button></div></div>)})}</div><div className="bg-slate-800 p-6 rounded-2xl flex flex-col"><h3 className="font-bold mb-4">Your Portfolio</h3><p className="text-3xl font-bold text-emerald-400 mb-4">{formatNaira(stockGameState.cash)}</p><div className="space-y-2 flex-1 overflow-y-auto mb-4">{Object.entries(stockGameState.holdings).map(([ticker, shares]) => shares > 0 && (<div key={ticker} className="flex justify-between text-sm"><span className="font-bold">{ticker}: {shares}</span><span>{formatNaira(shares * stockGameState.prices[ticker])}</span></div>))}</div><button onClick={endStockDay} className="w-full py-3 bg-indigo-600 rounded-lg font-bold mt-auto">End Day</button></div></div>{tradeModal && <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"><div className="bg-slate-800 p-8 rounded-2xl w-full max-w-sm animate-fade-in-up"><h3 className="text-xl font-bold mb-4 capitalize">{tradeModal.type} {tradeModal.stock.ticker}</h3><input type="number" value={tradeAmount} onChange={e => setTradeAmount(parseInt(e.target.value) || 0)} className="w-full p-3 rounded bg-slate-700 text-white mb-4" placeholder="Number of shares" /><div className="flex gap-2"><button onClick={() => setTradeModal(null)} className="flex-1 py-2 border rounded">Cancel</button><button onClick={handleStockTrade} className="flex-1 py-2 bg-indigo-600 rounded font-bold">Confirm</button></div></div></div>}</div>); };
  
  const GameCard = ({ title, desc, icon, onClick, mode }: {title: string, desc: string, icon: React.ReactNode, onClick: (mode: any) => void, mode: any}) => ( <div onClick={() => onClick(mode)} className="group relative bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border border-slate-200 dark:border-slate-700 hover:-translate-y-2 text-left cursor-pointer overflow-hidden flex flex-col"><div className="absolute top-0 right-0 p-4 text-slate-100 dark:text-slate-800 text-8xl opacity-10 group-hover:opacity-50 group-hover:scale-125 transition-all duration-300 group-hover:rotate-6">{icon}</div><div className="relative z-10 flex-1 flex flex-col"><h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{title}</h3><p className="text-slate-500 dark:text-slate-400 text-sm flex-1">{desc}</p><div className="mt-6 text-sm font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">Play Now &rarr;</div></div></div> );
  const renderFinquestArcade = () => ( <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-16 px-4 animate-fade-in"><div className="container mx-auto max-w-7xl"><div className="flex justify-between items-center mb-12"><button onClick={() => setStage('menu')} className="text-sm font-bold text-slate-500 hover:text-indigo-500 flex items-center gap-2">&larr; Back to Practice Hub</button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><GameCard title="Rapid Fire Quiz" desc="A fast-paced survival quiz. Answer questions against the clock, three strikes and you're out!" icon={<svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} onClick={handleStartGame} mode="rapid_fire" /><GameCard title="Naija Finance Timeline" desc="Test your knowledge of Nigeria's key financial and economic events." icon={<svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} onClick={handleStartGame} mode="timeline" /><GameCard title="FINSA Stock Exchange" desc="Manage a virtual ₦1M portfolio. Buy and sell stocks over 15 simulated days." icon={<svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} onClick={handleStartGame} mode="stock_market" /><GameCard title="The CFO Challenge" desc="Step into the shoes of a CFO and make tough corporate finance decisions." icon={<svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} onClick={handleStartGame} mode="cfo_challenge" /></div></div></div>);

  switch (stage) {
      case 'menu': return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-16 px-4 animate-fade-in">
            <div className="container mx-auto max-w-5xl">
                 <div className="text-center mb-16"><h1 className="text-5xl font-serif font-bold text-slate-900 dark:text-white mb-4">Practice Center</h1><p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Choose a mode to test your knowledge and prepare for exams.</p></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div onClick={() => { setMode('mock'); setStage('setup'); }} className="group p-8 bg-white dark:bg-slate-800 rounded-3xl text-center shadow-lg hover:shadow-2xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-transform hover:-translate-y-2 flex flex-col items-center"><div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-3xl mb-4 text-indigo-600 dark:text-indigo-400"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div><h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Standard Mock Exam</h3><p className="text-sm text-slate-500 dark:text-slate-400 flex-1">A timed, multi-topic exam simulating real test conditions.</p><div className="mt-6 text-sm font-bold text-indigo-600 dark:text-indigo-400">Start Exam &rarr;</div></div>
                    <div onClick={() => { setMode('topic'); setStage('setup'); }} className="group p-8 bg-white dark:bg-slate-800 rounded-3xl text-center shadow-lg hover:shadow-2xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-transform hover:-translate-y-2 flex flex-col items-center"><div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-3xl mb-4 text-indigo-600 dark:text-indigo-400"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg></div><h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Topic Mastery</h3><p className="text-sm text-slate-500 dark:text-slate-400 flex-1">Generate a custom test on any specific topic you choose.</p><div className="mt-6 text-sm font-bold text-indigo-600 dark:text-indigo-400">Specify Topic &rarr;</div></div>
                    <div onClick={() => setStage('finquest_arcade')} className="group p-8 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-3xl text-center shadow-2xl hover:shadow-purple-400/30 cursor-pointer transition-all hover:-translate-y-2 flex flex-col items-center"><div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-4"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><h3 className="text-xl font-bold mb-2">FINQUEST Arcade</h3><p className="text-sm text-indigo-100 flex-1">Play interactive finance games to learn in a fun, engaging way.</p><div className="mt-6 text-sm font-bold">Enter Arcade &rarr;</div></div>
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
      default: return (
        <>
            {showInstructionModal.show && <InstructionModal mode={showInstructionModal.mode!} onCancel={() => setShowInstructionModal({ show: false, mode: null })} onProceed={() => startExam(showInstructionModal.mode!)} />}
        </>
      );
  }
};

const InstructionModal: React.FC<{ mode: string, onCancel: () => void, onProceed: () => void }> = ({ mode, onCancel, onProceed }) => {
    const details: any = {
        rapid_fire: { title: "Rapid Fire Quiz", icon: "🕹️", desc: "Answer as many finance trivia questions as you can. You have only 30 seconds per question and 3 lives. Think fast, stay sharp!", points: "Earn 10 points for each correct answer." },
        timeline: { title: "Naija Finance Timeline", icon: "🇳🇬", desc: "Test your knowledge of Nigerian economic history. Place key events in their correct order or answer historical trivia. 3 lives, 30 seconds per question.", points: "Earn 10 points for each correct answer." },
        stock_market: { title: "FINSA Stock Exchange", icon: "📈", desc: "You have ₦1,000,000 to invest in Nigerian stocks over 15 simulated days. React to market news, buy low, sell high, and grow your portfolio.", points: "Points awarded based on your final profit." },
        cfo_challenge: { title: "The CFO Challenge", icon: "👔", desc: "Step into the shoes of a Chief Financial Officer. You will face tough business scenarios and must make critical decisions. Your choices determine your score.", points: "Points awarded for wise financial decisions." },
    };
    const current = details[mode];
    if (!current) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onCancel}>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl max-w-md w-full animate-fade-in-up shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="text-5xl text-center mb-4">{current.icon}</div>
                <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white text-center mb-3">{current.title}</h2>
                <div className="text-center bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3 mb-6">
                    <h3 className="font-bold text-yellow-800 dark:text-yellow-300">MUST READ</h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">This game is designed to build financial knowledge in an interactive way.</p>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-center mb-4">{current.desc}</p>
                <p className="text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg">{current.points}</p>
                <div className="flex gap-4 mt-8">
                    <button onClick={onCancel} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600">Cancel</button>
                    <button onClick={onProceed} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Proceed</button>
                </div>
            </div>
        </div>
    );
};

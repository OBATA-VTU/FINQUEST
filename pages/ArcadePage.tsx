
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { fallbackQuestions, timelineFallbackQuestions } from '../utils/fallbackQuestions';
import { db } from '../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
// Added missing import for routing
import { useNavigate } from 'react-router-dom';

type GameView = 'hub' | 'trivia' | 'timeline';

export const ArcadePage: React.FC = () => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    // Initialize navigation hook
    const navigate = useNavigate();
    const [view, setView] = useState<GameView>('hub');
    
    // TRIVIA TITAN STATE
    const [triviaQuestions, setTriviaQuestions] = useState<any[]>([]);
    const [currentTriviaIdx, setCurrentTriviaIdx] = useState(0);
    const [triviaScore, setTriviaScore] = useState(0);
    const [triviaTime, setTriviaTime] = useState(15);
    const [triviaActive, setTriviaActive] = useState(false);
    const [triviaEnded, setTriviaEnded] = useState(false);

    // TIMELINE TUSSLE STATE
    const [timelineItems, setTimelineItems] = useState<any[]>([]);
    const [userTimeline, setUserTimeline] = useState<any[]>([]);
    const [timelineStatus, setTimelineStatus] = useState<'playing' | 'checking' | 'correct' | 'wrong'>('playing');

    // --- TRIVIA LOGIC ---
    useEffect(() => {
        let timer: any;
        if (triviaActive && triviaTime > 0) {
            timer = setInterval(() => setTriviaTime(p => p - 1), 1000);
        } else if (triviaActive && triviaTime === 0) {
            handleTriviaAnswer(-1); // Timeout
        }
        return () => clearInterval(timer);
    }, [triviaActive, triviaTime]);

    const startTrivia = () => {
        const q = [...fallbackQuestions].sort(() => 0.5 - Math.random()).slice(0, 10);
        setTriviaQuestions(q);
        setCurrentTriviaIdx(0);
        setTriviaScore(0);
        setTriviaTime(15);
        setTriviaActive(true);
        setTriviaEnded(false);
        setView('trivia');
    };

    const handleTriviaAnswer = async (idx: number) => {
        const correct = triviaQuestions[currentTriviaIdx].correctAnswer === idx;
        if (correct) {
            setTriviaScore(p => p + 10);
            showNotification("+10 Points!", "success");
        }

        if (currentTriviaIdx < triviaQuestions.length - 1) {
            setCurrentTriviaIdx(p => p + 1);
            setTriviaTime(15);
        } else {
            setTriviaActive(false);
            setTriviaEnded(true);
            if (auth?.user) {
                const userRef = doc(db, 'users', auth.user.id);
                await updateDoc(userRef, { contributionPoints: increment(Math.floor(triviaScore / 2)) });
            }
        }
    };

    // --- TIMELINE LOGIC ---
    const startTimeline = () => {
        const q = [...timelineFallbackQuestions].sort(() => 0.5 - Math.random()).slice(0, 5);
        setTimelineItems(q);
        // Shuffle for user
        setUserTimeline([...q].sort(() => 0.5 - Math.random()));
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
        const sortedCorrectly = [...timelineItems].sort((a,b) => a.id - b.id); 
        const userMatches = userTimeline.every((val, index) => val.id === sortedCorrectly[index].id);

        if (userMatches) {
            setTimelineStatus('correct');
            showNotification("Master Historian! +25 Points", "success");
            if (auth?.user) updateDoc(doc(db, 'users', auth.user.id), { contributionPoints: increment(25) });
        } else {
            setTimelineStatus('wrong');
            showNotification("Timeline is fractured. Try again.", "error");
        }
    };

    const GameCard = ({ title, description, icon, onClick, color }: any) => (
        <button onClick={onClick} className={`bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl border-2 border-transparent hover:border-indigo-500 transition-all hover:-translate-y-2 group text-left flex flex-col h-full`}>
            <div className={`w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform`}>{icon}</div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 font-serif">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8 flex-1">{description}</p>
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600`}>Play Now &rarr;</span>
        </button>
    );

    if (view === 'trivia') return (
        <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center">
            {!triviaEnded ? (
                <div className="max-w-2xl w-full bg-slate-900 rounded-[3rem] p-10 border border-white/10 shadow-2xl animate-pop-in">
                    <div className="flex justify-between items-center mb-10">
                        <div className="px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">TITAN • {currentTriviaIdx+1}/10</div>
                        <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-black text-xl transition-colors ${triviaTime <= 5 ? 'border-rose-500 text-rose-500 animate-pulse' : 'border-indigo-500 text-indigo-400'}`}>{triviaTime}</div>
                    </div>
                    <h2 className="text-3xl font-serif font-bold mb-12 leading-tight text-center">{triviaQuestions[currentTriviaIdx].text}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {triviaQuestions[currentTriviaIdx].options.map((opt: string, i: number) => (
                            <button key={i} onClick={() => handleTriviaAnswer(i)} className="p-6 bg-white/5 border border-white/10 rounded-[2rem] font-bold hover:bg-indigo-600 hover:border-indigo-500 transition-all text-sm md:text-base">{opt}</button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center animate-fade-in">
                    <h2 className="text-6xl font-black mb-4 font-serif">Titan Finished!</h2>
                    <p className="text-2xl text-indigo-300 mb-10">You earned <span className="font-black text-white">{triviaScore}</span> points</p>
                    <button onClick={() => setView('hub')} className="px-10 py-4 bg-white text-indigo-950 font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl">Back to Arcade</button>
                </div>
            )}
        </div>
    );

    if (view === 'timeline') return (
        <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center">
            <div className="max-w-xl w-full">
                <h2 className="text-3xl font-serif font-bold text-center mb-2">Timeline Tussle</h2>
                <p className="text-indigo-300 text-center text-sm mb-10">Arrange the financial events from oldest to newest.</p>
                
                <div className="space-y-3 mb-10">
                    {userTimeline.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/10 group">
                            <div className="flex flex-col gap-1">
                                <button onClick={() => idx > 0 && moveTimelineItem(idx, idx-1)} className="p-1 hover:text-indigo-400 transition-colors opacity-30 group-hover:opacity-100">▲</button>
                                <button onClick={() => idx < userTimeline.length - 1 && moveTimelineItem(idx, idx+1)} className="p-1 hover:text-indigo-400 transition-colors opacity-30 group-hover:opacity-100">▼</button>
                            </div>
                            <div className="flex-1 font-bold text-sm">{item.text}</div>
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xs font-black">{idx + 1}</div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-4">
                    <button onClick={() => setView('hub')} className="flex-1 py-4 border border-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/5">Surrender</button>
                    <button onClick={checkTimeline} className="flex-[2] py-4 bg-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-700">Restore Order</button>
                </div>

                {timelineStatus === 'correct' && (
                    <div className="mt-8 p-6 bg-emerald-500/20 border border-emerald-500/40 rounded-[2rem] text-center animate-pop-in">
                        <p className="font-black text-emerald-400">PERFECT CHRONOLOGY!</p>
                        <button onClick={startTimeline} className="mt-4 text-xs font-bold underline">Next Challenge</button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 transition-colors">
            <div className="container mx-auto max-w-6xl">
                <div className="text-center mb-16">
                    <span className="inline-block py-1.5 px-4 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 text-[10px] font-black rounded-full uppercase tracking-[0.2em] mb-4 border border-indigo-200 dark:border-indigo-800">Department of Finance</span>
                    <h1 className="text-5xl md:text-7xl font-serif font-black text-slate-900 dark:text-white mb-4 tracking-tighter">FINQUEST Arcade</h1>
                    <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">Where financial theory meets high-score gaming.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
                    <GameCard 
                        title="Trivia Titan" 
                        description="A lightning-fast MCQ session. 15 seconds per question. Only the fastest minds survive the leaderboard."
                        icon="⚡"
                        onClick={startTrivia}
                        color="indigo"
                    />
                    <GameCard 
                        title="Timeline Tussle" 
                        description="The market has a history. Can you sort historical financial milestones in their correct chronological sequence?"
                        icon="⌛"
                        onClick={startTimeline}
                        color="amber"
                    />
                    <GameCard 
                        title="Stock Showdown" 
                        description="Real-time trading simulation. Respond to breaking news events and grow your portfolio."
                        icon="📈"
                        onClick={() => showNotification("Coming soon to the next session!", "info")}
                        color="emerald"
                    />
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
                    <div className="max-w-xl">
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white font-serif mb-2">Earn as you Play</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Successful arcade sessions award <span className="font-bold text-indigo-600">Contribution Points</span>. Higher streaks and faster times result in massive point multipliers.</p>
                    </div>
                    {/* Fixed button with navigate call */}
                    <button onClick={() => navigate('/leaderboard')} className="px-8 py-4 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-transform">Hall of Fame &rarr;</button>
                </div>
            </div>
        </div>
    );
};

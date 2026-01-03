import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';

// The target launch date and time (10th Jan 2026, 12:00 PM WAT which is UTC+1)
const LAUNCH_DATE_ISO = '2026-01-10T12:00:00+01:00';

const features = [
    { icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>, title: "Past Question Archive", description: "Access a comprehensive, verified library of past questions for all levels and courses." },
    { icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>, title: "AI-Powered CBT", description: "Generate custom tests on any topic or take full mock exams to prepare for success." },
    { icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, title: "Community Hub", description: "Connect with peers, join official study groups, and engage in the student lounge." },
    { icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>, title: "Gamified Leaderboard", description: "Earn points for academic activities and climb the ranks against your peers." },
    { icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>, title: "Private Notes", description: "Securely save your personal study notes and access them from any device." },
    { icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>, title: "Lost & Found", description: "A digital notice board to help reunite lost items with their owners on campus." }
];

const socialLinks = [
    { link: "https://whatsapp.com/channel/0029VbC0FW23QxS7OqFNcP0q", icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>, label: "WhatsApp" },
    { link: "https://x.com/FINSA_AAUA", icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, label: "X" },
    { link: "https://facebook.com/groups/8173545352661193/", icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, label: "Facebook" },
];

export const CountdownPage: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [impressedVotes, setImpressedVotes] = useState(0);
    const [notImpressedVotes, setNotImpressedVotes] = useState(0);
    const [hasVoted, setHasVoted] = useState(false);
    const [loadingPoll, setLoadingPoll] = useState(true);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +new Date(LAUNCH_DATE_ISO) - +new Date();
            setTimeLeft(difference > 0 ? {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            } : { days: 0, hours: 0, minutes: 0, seconds: 0 });
        };
        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let animationFrameId: number;
        let particles: any[] = [];
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            particles = [];
            for (let i = 0; i < (canvas.width > 768 ? 80 : 30); i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: Math.random() * 0.5 - 0.25,
                    vy: Math.random() * 0.5 - 0.25,
                    radius: Math.random() * 1.5 + 0.5,
                });
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(165, 180, 252, 0.7)';
                ctx.fill();
            });
            ctx.beginPath();
            for (let i = 0; i < particles.length; i++) {
                for (let j = i; j < particles.length; j++) {
                    const dist = Math.sqrt((particles[i].x - particles[j].x)**2 + (particles[i].y - particles[j].y)**2);
                    if (dist < 120) {
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                    }
                }
            }
            ctx.strokeStyle = 'rgba(129, 140, 248, 0.1)';
            ctx.stroke();
            animationFrameId = requestAnimationFrame(animate);
        };
        resizeCanvas();
        animate();
        window.addEventListener('resize', resizeCanvas);
        
        // Load poll data from localStorage
        const userVoted = localStorage.getItem('userHasVoted') === 'true';
        setHasVoted(userVoted);

        const fetchPollData = async () => {
            setLoadingPoll(true);
            try {
                const pollDocRef = doc(db, 'content', 'impression_poll');
                const pollDoc = await getDoc(pollDocRef);

                if (pollDoc.exists()) {
                    const data = pollDoc.data();
                    setImpressedVotes(data.impressed || 0);
                    setNotImpressedVotes(data.notImpressed || 0);
                } else {
                    // Fallback if doc doesn't exist, and create it on first vote.
                    setImpressedVotes(15);
                    setNotImpressedVotes(3);
                }
            } catch (error) {
                console.error("Error fetching poll data:", error);
                // Fallback on network error
                setImpressedVotes(15);
                setNotImpressedVotes(3);
            } finally {
                setLoadingPoll(false);
            }
        };

        fetchPollData();

        return () => {
            clearInterval(timer);
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []);

    const handleVote = async (voteType: 'impressed' | 'notImpressed') => {
        if (hasVoted) return;

        setHasVoted(true); // Optimistically disable buttons
        localStorage.setItem('userHasVoted', 'true');

        const pollDocRef = doc(db, 'content', 'impression_poll');

        try {
            if (voteType === 'impressed') {
                setImpressedVotes(prev => prev + 1); // Optimistic UI update
                await setDoc(pollDocRef, { impressed: increment(1) }, { merge: true });
            } else {
                setNotImpressedVotes(prev => prev + 1); // Optimistic UI update
                await setDoc(pollDocRef, { notImpressed: increment(1) }, { merge: true });
            }
        } catch (error) {
            console.error("Error saving vote:", error);
            // Revert state if something goes wrong so user can try again
            setHasVoted(false); 
            localStorage.removeItem('userHasVoted');
            if (voteType === 'impressed') {
                setImpressedVotes(prev => prev - 1);
            } else {
                setNotImpressedVotes(prev => prev - 1);
            }
        }
    };

    const totalVotes = impressedVotes + notImpressedVotes;
    const impressedPercentage = totalVotes > 0 ? (impressedVotes / totalVotes) * 100 : 50;
    const notImpressedPercentage = totalVotes > 0 ? (notImpressedVotes / totalVotes) * 100 : 50;

    const isLaunched = Object.values(timeLeft).every(val => val === 0);

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-start p-4 sm:p-6 relative overflow-hidden font-sans">
            <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-80" />
            
            <div className="relative z-10 flex flex-col items-center text-center max-w-7xl w-full">
                
                <header className="w-full flex justify-center items-center gap-3 p-4 mb-10 animate-fade-in-down">
                     <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-indigo-300 border border-white/20">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                     </div>
                     <div className="text-left">
                         <h2 className="font-serif font-bold text-xl leading-none">FINSA</h2>
                         <p className="text-xs text-indigo-300">Department of Finance</p>
                         <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-[0.1em]">AAUA Chapter</p>
                     </div>
                </header>

                <main className="flex flex-col items-center">
                    <h1 className="text-4xl md:text-6xl font-serif font-black leading-tight mb-4 drop-shadow-2xl tracking-tight animate-fade-in-down" style={{animationDelay: '200ms'}}>
                        A New Digital Chapter Begins
                    </h1>
                    <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto font-light leading-relaxed mb-10 drop-shadow-md animate-fade-in-down" style={{animationDelay: '400ms'}}>
                        Get ready for a new era of academic excellence and digital connectivity.
                    </p>

                    {isLaunched ? (
                         <div className="bg-emerald-500/20 border-2 border-emerald-400 p-8 rounded-2xl animate-pulse">
                            <h2 className="text-3xl font-bold text-white">We are Live!</h2>
                         </div>
                    ) : (
                        <div className="flex justify-center gap-2 sm:gap-4 md:gap-8 mb-12 animate-fade-in-up" style={{animationDelay: '600ms'}}>
                            {Object.entries(timeLeft).map(([unit, value]) => (
                                <div key={unit} className="text-center w-20 sm:w-24">
                                    <div className="bg-white/5 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-lg border border-white/10 mb-2">
                                        <span key={value} className="text-4xl md:text-5xl font-mono font-bold tracking-tighter block animate-flip-down">
                                            {String(value).padStart(2, '0')}
                                        </span>
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">{unit}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                {/* --- WHAT TO EXPECT SECTION --- */}
                <section className="w-full max-w-6xl mt-12 animate-fade-in-up" style={{animationDelay: '800ms'}}>
                    <h2 className="text-3xl font-bold font-serif mb-10 text-indigo-300">What to Expect</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, index) => (
                            <div key={index} className="bg-slate-900/50 backdrop-blur-lg p-6 rounded-2xl text-left border border-slate-700/50 hover:border-indigo-500/50 transition-all hover:-translate-y-1">
                                <div className="flex-shrink-0 w-12 h-12 bg-indigo-500/10 text-indigo-300 rounded-xl flex items-center justify-center border border-indigo-500/20 mb-4">
                                    {feature.icon}
                                </div>
                                <h3 className="font-bold text-white text-lg mb-2">{feature.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* --- IMPRESSION POLL --- */}
                <section className="w-full max-w-2xl mt-20 animate-fade-in-up" style={{ animationDelay: '900ms' }}>
                    <h2 className="text-2xl font-bold font-serif mb-6 text-indigo-300">What's Your First Impression?</h2>
                    
                    {loadingPoll ? (
                        <div className="h-40 flex items-center justify-center text-indigo-300">Loading Poll...</div>
                    ) : (
                        <>
                            <div className="w-full bg-slate-800 rounded-full h-8 flex overflow-hidden border border-slate-700 mb-4 text-xs font-bold shadow-inner">
                                <div 
                                    className="bg-emerald-500 flex items-center justify-start pl-3 text-white transition-all duration-500" 
                                    style={{ width: `${impressedPercentage}%` }}
                                >
                                    {impressedPercentage > 10 && `${Math.round(impressedPercentage)}%`}
                                </div>
                                <div 
                                    className="bg-rose-500 flex items-center justify-end pr-3 text-white transition-all duration-500" 
                                    style={{ width: `${notImpressedPercentage}%` }}
                                >
                                    {notImpressedPercentage > 10 && `${Math.round(notImpressedPercentage)}%`}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => handleVote('impressed')}
                                    disabled={hasVoted}
                                    className="flex flex-col items-center justify-center p-4 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                                >
                                    <span className="text-3xl mb-2">👍</span>
                                    <span className="font-bold text-emerald-300">Impressed</span>
                                    <span className="text-xs text-emerald-400 font-mono mt-1">{impressedVotes} votes</span>
                                </button>
                                <button 
                                    onClick={() => handleVote('notImpressed')}
                                    disabled={hasVoted}
                                    className="flex flex-col items-center justify-center p-4 bg-rose-500/10 border-2 border-rose-500/20 rounded-xl hover:bg-rose-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                                >
                                    <span className="text-3xl mb-2">👎</span>
                                    <span className="font-bold text-rose-300">Not Impressed</span>
                                    <span className="text-xs text-rose-400 font-mono mt-1">{notImpressedVotes} votes</span>
                                </button>
                            </div>
                        </>
                    )}

                    {hasVoted && (
                        <p className="text-center text-emerald-400 font-bold mt-6 text-sm animate-fade-in">Thanks for your feedback!</p>
                    )}
                </section>

                <footer className="w-full flex flex-col items-center mt-20 animate-fade-in-up" style={{animationDelay: '1100ms'}}>
                    <div className="flex gap-4 mb-4">
                        {socialLinks.map((social, idx) => (
                            <a key={idx} href={social.link} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white transition-all duration-300 hover:scale-110" aria-label={social.label}>
                                {social.icon}
                            </a>
                        ))}
                    </div>

                    <div className="text-xs text-slate-500 font-bold">
                        &copy; {new Date().getFullYear()} FINSA-OBA. All rights reserved.
                    </div>
                </footer>
            </div>
        </div>
    );
};

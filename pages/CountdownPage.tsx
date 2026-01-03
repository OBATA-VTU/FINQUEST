import React, { useState, useEffect, useRef } from 'react';
import { Logo } from '../components/Logo';

// The target launch date and time (10th Jan 2026, 12:00 PM WAT which is UTC+1)
const LAUNCH_DATE_ISO = '2026-01-10T12:00:00+01:00';

const features = [
    { title: "Past Question Archive", description: "Comprehensive library for all levels." },
    { title: "AI-Powered CBT", description: "Generate custom tests on any topic." },
    { title: "Community Contributions", description: "Upload materials to earn points." },
    { title: "Gamified Leaderboard", description: "Climb the ranks with academic activity." },
    { title: "Private Notes", description: "Securely save your personal study notes." },
    { title: "Lost & Found", description: "A hub to find misplaced items on campus." }
];

const socialLinks = [
    { link: "https://wa.me/2348142452729", icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>, label: "WhatsApp" },
    { link: "#", icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, label: "X" },
    { link: "#", icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, label: "Facebook" },
];

export const CountdownPage: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const canvasRef = useRef<HTMLCanvasElement>(null);

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
        
        // --- Canvas Particle Animation ---
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let animationFrameId: number;
        let particles: any[] = [];
        let mouse = { x: -200, y: -200 };

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

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
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
                ctx.fillStyle = 'rgba(165, 180, 252, 0.7)'; // Indigo-300
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
            const distToMouse = (p: any) => Math.sqrt((p.x - mouse.x)**2 + (p.y - mouse.y)**2);
            for(let p of particles){
                if(distToMouse(p) < 200){
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouse.x, mouse.y);
                }
            }
            ctx.strokeStyle = 'rgba(129, 140, 248, 0.1)'; // Indigo-400
            ctx.stroke();

            animationFrameId = requestAnimationFrame(animate);
        };

        resizeCanvas();
        animate();
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            clearInterval(timer);
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    const isLaunched = Object.values(timeLeft).every(val => val === 0);

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
            <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-80" />
            
            <div className="relative z-10 flex flex-col items-center text-center max-w-7xl w-full h-full justify-between">
                
                <header className="w-full flex justify-center items-center gap-3 p-4 animate-fade-in-down">
                     <Logo className="h-10 w-10" />
                     <div className="text-left">
                         <h2 className="font-serif font-bold text-xl leading-none">FINSA</h2>
                         <p className="text-xs text-indigo-300">Department of Finance</p>
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

                <footer className="w-full flex flex-col items-center animate-fade-in-up" style={{animationDelay: '800ms'}}>
                    <div className="w-full max-w-7xl relative mt-10 overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-12 before:bg-gradient-to-r before:from-slate-950 before:to-transparent before:z-10 after:absolute after:right-0 after:top-0 after:h-full after:w-12 after:bg-gradient-to-l after:from-slate-950 after:to-transparent after:z-10">
                        <div className="flex animate-marquee hover:[animation-play-state:paused]">
                            {[...features, ...features].map((feature, index) => (
                                <div key={index} className="flex-shrink-0 w-64 mx-4 p-4 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
                                    <h3 className="font-bold text-white text-sm">{feature.title}</h3>
                                    <p className="text-slate-400 text-xs">{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex gap-4 mt-12 mb-4">
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

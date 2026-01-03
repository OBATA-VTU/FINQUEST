import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Logo';

// The target launch date and time (10th Jan 2026, 12:00 PM WAT which is UTC+1)
const LAUNCH_DATE_ISO = '2026-01-10T12:00:00+01:00';

export const CountdownPage: React.FC = () => {
    const calculateTimeLeft = () => {
        const difference = +new Date(LAUNCH_DATE_ISO) - +new Date();
        let timeLeft: {days: number, hours: number, minutes: number, seconds: number};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        } else {
            timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearTimeout(timer);
    });

    const timerComponents: { value: number; label: string }[] = [
        { value: timeLeft.days, label: 'Days' },
        { value: timeLeft.hours, label: 'Hours' },
        { value: timeLeft.minutes, label: 'Minutes' },
        { value: timeLeft.seconds, label: 'Seconds' },
    ];
    
    // Check if countdown is finished
    const isLaunched = Object.values(timeLeft).every(val => val === 0);

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            <div className="absolute inset-0 z-0 opacity-20">
                <img
                    src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
                    alt="University Campus"
                    className="w-full h-full object-cover animate-kenburns"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-indigo-950/50"></div>
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center max-w-4xl w-full">
                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm inline-block mb-6 shadow-lg animate-fade-in-down">
                    <Logo className="h-20 w-20" />
                </div>
                <h1 className="text-4xl md:text-6xl font-serif font-black leading-tight mb-4 drop-shadow-2xl tracking-tight animate-fade-in-down" style={{animationDelay: '200ms'}}>
                    The Future of FINSA is Launching Soon
                </h1>
                <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto font-light leading-relaxed mb-10 drop-shadow-md animate-fade-in-down" style={{animationDelay: '400ms'}}>
                    Get ready for a new era of academic excellence and digital connectivity.
                </p>

                {isLaunched ? (
                    <div className="bg-emerald-500/20 border-2 border-emerald-400 p-8 rounded-2xl animate-pulse">
                        <h2 className="text-3xl font-bold text-white">We are Live!</h2>
                        <p className="text-emerald-200 mt-2">Please refresh your browser to access the portal.</p>
                    </div>
                ) : (
                    <div className="flex justify-center gap-4 md:gap-8 mb-12 animate-fade-in-up" style={{animationDelay: '600ms'}}>
                        {timerComponents.map((component, index) => (
                            <div key={index} className="text-center w-24">
                                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/10 mb-2">
                                    <span className="text-4xl md:text-5xl font-mono font-bold tracking-tighter">
                                        {String(component.value).padStart(2, '0')}
                                    </span>
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">{component.label}</span>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="bg-slate-900/50 backdrop-blur-lg p-8 rounded-3xl w-full border border-slate-700 animate-fade-in-up" style={{animationDelay: '800ms'}}>
                    <h2 className="text-2xl font-bold font-serif mb-4 text-indigo-300">What to Expect</h2>
                    <p className="text-slate-300 leading-relaxed mb-6 max-w-xl mx-auto">
                        The new FINSA portal will be your one-stop hub for academic resources. Access verified past questions, take AI-powered CBT practice tests, view your academic progress, and connect with the departmental community like never before.
                    </p>
                    
                    <a 
                        href="https://wa.me/2348142452729?text=Hello%2C%20I%20have%20a%20question%20about%20the%20new%20FINSA%20portal."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 text-white font-bold rounded-full shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:bg-green-700 transition-all uppercase tracking-widest text-xs hover:scale-105 transform duration-300"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                        Ask a Question
                    </a>
                </div>

                <div className="mt-12 text-xs text-slate-500 font-bold animate-fade-in-up" style={{animationDelay: '1000ms'}}>
                    &copy; {new Date().getFullYear()} FINSA-OBA. All rights reserved.
                </div>
            </div>
        </div>
    );
};

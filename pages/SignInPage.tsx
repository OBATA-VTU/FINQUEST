
import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useNotification } from '../contexts/NotificationContext';

export const SignInPage: React.FC = () => {
    const authCtx = useContext(AuthContext);
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'login' | 'forgot'>('login');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authCtx?.login(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            // Context handles generic display, but we can add specific ones here if needed
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const result = await authCtx!.loginWithGoogle();
            if (result?.needsProfileCompletion) {
                navigate('/signup', { state: { googleUser: result.googleUser } });
            } else {
                navigate('/dashboard');
            }
        } catch (err) {} 
        finally { setLoading(false); }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            showNotification("Please enter your registered email.", "warning");
            return;
        }
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            showNotification("Secure reset link sent to your email!", "success");
            setView('login');
        } catch (e: any) {
            showNotification(e.message || "Failed to send reset email.", "error");
        } finally {
            setLoading(false);
        }
    };

    if (view === 'forgot') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-white/5">
                    <div className="p-8 text-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <Logo className="h-16 w-16 mx-auto mb-4" />
                        <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">Recover Access</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Regain control of your academic portal.</p>
                    </div>
                    <form onSubmit={handleResetPassword} className="p-8 space-y-4">
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Student Email</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-2xl outline-none dark:text-white transition-all shadow-inner"
                                placeholder="name@student.aaua.edu.ng"
                                required
                            />
                        </div>
                        <button 
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 active:scale-95 uppercase tracking-widest text-xs"
                        >
                            {loading ? "Initializing..." : "Request Reset Link"}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setView('login')}
                            className="w-full text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors py-2"
                        >
                            &larr; Back to Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-white/5">
                <div className="p-8 text-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <Logo className="h-16 w-16 mx-auto mb-4" />
                    <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">Student Portal</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Log in to your departmental ecosystem.</p>
                </div>
                <div className="p-8 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Email Address</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-2xl outline-none dark:text-white transition-all shadow-inner"
                                placeholder="name@student.aaua.edu.ng"
                                required
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1.5 ml-1">
                                <label className="block text-xs font-black uppercase text-slate-400 tracking-widest">Password</label>
                                <button type="button" onClick={() => setView('forgot')} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-500">Forgot Code?</button>
                            </div>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-2xl outline-none dark:text-white transition-all shadow-inner"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <button 
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 active:scale-95 uppercase tracking-widest text-xs"
                        >
                            {loading ? "Authenticating..." : "Sign In to Portal"}
                        </button>
                    </form>
                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
                        <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-white dark:bg-slate-900 px-3 text-slate-400">Or use socials</span></div>
                    </div>
                    <button 
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-white flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm active:scale-95"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                        Continue with Google
                    </button>
                </div>
                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 text-center border-t border-slate-100 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        New student? <Link to="/signup" className="text-indigo-600 font-black hover:underline ml-1">Enrol Here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useContext, useEffect } from 'react';
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

    // EFFECT: Instantly take authenticated users to dashboard
    useEffect(() => {
        if (!authCtx?.loading && authCtx?.user) {
            navigate('/dashboard', { replace: true });
        }
    }, [authCtx?.user, authCtx?.loading, navigate]);

    // EFFECT: Check for session expiration flag
    useEffect(() => {
        const expired = sessionStorage.getItem('session_expired');
        if (expired === 'true') {
            showNotification("Session expired due to inactivity. Please log in again.", "warning");
            sessionStorage.removeItem('session_expired');
        }
    }, [showNotification]);

    // If still determining auth status, show a minimal loader to prevent UI flickering
    if (authCtx?.loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        
        setLoading(true);
        try {
            await authCtx?.login(email, password);
            // On success, the useEffect above will handle redirection automatically
            // but we call it here too as a fallback for faster transition
            navigate('/dashboard', { replace: true });
        } catch (err: any) {
            console.error("Login attempt failed:", err.code);
            let message = "Authentication failed. Please check your credentials.";
            
            if (err.code === 'auth/operation-not-allowed') {
                message = "Email/Password sign-in is not enabled in Firebase. Please enable it in the Firebase Console under Authentication > Sign-in method.";
            } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                message = "Invalid credentials. If you previously used Google to sign in, please click 'Forgot Code' below to set a password for your account.";
            } else if (err.code === 'auth/too-many-requests') {
                message = "Too many failed attempts. Please try again later.";
            }
            
            showNotification(message, "error");
            setLoading(false); // Reset loading so user can try again
        }
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
                        <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">Reset Password</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Get back into your account.</p>
                    </div>
                    <form onSubmit={handleResetPassword} className="p-8 space-y-4">
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Email</label>
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
                    <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">Sign In</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Access your materials and tests.</p>
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
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>
                </div>
                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 text-center border-t border-slate-100 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        New student? <Link to="/signup" className="text-indigo-600 font-black hover:underline ml-1">Sign Up</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

// export default SignInPage; (Removed to use named export)

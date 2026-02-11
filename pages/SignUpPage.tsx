
import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { Level } from '../types';
import { LEVELS } from '../constants';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export const SignUpPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    
    const googleData = location.state?.googleUser;

    const [formData, setFormData] = useState({
        name: googleData?.displayName || '',
        email: googleData?.email || '',
        username: '',
        matricNumber: '',
        password: '',
        level: (100 as Level)
    });
    
    const [loading, setLoading] = useState(false);
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<'available' | 'taken' | 'short' | null>(null);

    // Debounced Username Check
    useEffect(() => {
        const checkAvailability = async () => {
            const username = formData.username.trim().toLowerCase();
            
            if (username.length < 3) {
                setUsernameStatus(username.length > 0 ? 'short' : null);
                return;
            }

            setCheckingUsername(true);
            try {
                const q = query(
                    collection(db, 'users'), 
                    where('username', '==', username), 
                    limit(1)
                );
                const snapshot = await getDocs(q);
                setUsernameStatus(snapshot.empty ? 'available' : 'taken');
            } catch (err) {
                console.error("Username check failed", err);
            } finally {
                setCheckingUsername(false);
            }
        };

        const timeoutId = setTimeout(checkAvailability, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.username]);

    // Validation for Matric/JAMB
    const validateMatricOrJamb = (val: string) => {
        const clean = val.trim();
        if (!clean) return false;
        
        // Matric Number: Exactly 9 digits
        const isMatric = /^\d{9}$/.test(clean);
        // JAMB Reg: Up to 14 characters (typically 10-14, user specified 14 max)
        const isJamb = /^[A-Z0-9]{1,14}$/.test(clean);
        
        return isMatric || isJamb;
    };

    const isMatricOrJambValid = validateMatricOrJamb(formData.matricNumber);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (usernameStatus !== 'available' || !isMatricOrJambValid) return;
        
        setLoading(true);
        try {
            await auth?.signup({
                ...formData,
                matricNumber: formData.matricNumber.toUpperCase().trim(),
                pass: formData.password,
            });
            navigate('/dashboard');
        } catch (err) {
            // Handled by context notifications
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        setLoading(true);
        try {
            const result = await auth?.loginWithGoogle();
            if (result?.needsProfileCompletion) {
                if (auth?.user) {
                    setFormData(prev => ({
                        ...prev,
                        name: auth.user?.name || prev.name,
                        email: auth.user?.email || prev.email,
                    }));
                }
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            // Handled by context notifications
        } finally {
            setLoading(false);
        }
    };

    const isSubmitDisabled = loading || checkingUsername || usernameStatus === 'taken' || usernameStatus === 'short' || !isMatricOrJambValid;

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 py-12 transition-colors">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                <div className="p-8 text-center border-b border-slate-100 dark:border-slate-800">
                    <Logo className="h-16 w-16 mx-auto mb-4" />
                    <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">Create Account</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Join the official FINSA student portal.</p>
                </div>

                <div className="px-8 pt-8 pb-2 space-y-4">
                     {!googleData && (
                        <>
                            <button 
                                type="button"
                                onClick={handleGoogleSignUp}
                                disabled={loading}
                                className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-white flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
                            >
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                                Sign up with Google
                            </button>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
                                </div>
                                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                                    <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">Or use email</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Full Name</label>
                            <input 
                                type="text" 
                                required
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Username</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    required
                                    value={formData.username} 
                                    onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border ${usernameStatus === 'taken' ? 'border-rose-500 ring-1 ring-rose-500' : usernameStatus === 'available' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl outline-none dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all pr-10`}
                                    placeholder="johndoe"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {checkingUsername ? (
                                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    ) : usernameStatus === 'available' ? (
                                        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    ) : usernameStatus === 'taken' ? (
                                        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                    ) : null}
                                </div>
                            </div>
                            {usernameStatus === 'taken' && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">Username is already taken.</p>}
                            {usernameStatus === 'short' && <p className="text-[10px] text-slate-400 font-bold mt-1 ml-1">At least 3 characters required.</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Matric Number or JAMB Reg</label>
                        <input 
                            type="text" 
                            required
                            maxLength={14}
                            value={formData.matricNumber} 
                            onChange={e => setFormData({...formData, matricNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')})}
                            className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border ${formData.matricNumber && !isMatricOrJambValid ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl outline-none dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all`}
                            placeholder="9 digits (Matric) or up to 14 chars (JAMB)"
                        />
                        {formData.matricNumber && !isMatricOrJambValid && (
                            <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">
                                Invalid format. Enter 9 digits for Matric or max 14 chars for JAMB.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Email</label>
                            <input 
                                type="email" 
                                required
                                value={formData.email} 
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="email@aaua.edu.ng"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Level</label>
                            <select 
                                value={formData.level} 
                                onChange={e => setFormData({...formData, level: Number(e.target.value) as Level})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                            >
                                {LEVELS.filter(l => typeof l === 'number').map(l => <option key={l} value={l}>{l} Level</option>)}
                            </select>
                        </div>
                    </div>

                    {!googleData && (
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Password</label>
                            <input 
                                type="password" 
                                required
                                value={formData.password} 
                                onChange={e => setFormData({...formData, password: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="Min 6 characters"
                            />
                        </div>
                    )}

                    <button 
                        disabled={isSubmitDisabled}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 mt-4 active:scale-95"
                    >
                        {loading ? "Creating Account..." : "Create Account"}
                    </button>

                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
                        Already have an account? <Link to="/login" className="text-indigo-600 font-bold hover:underline">Sign In</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

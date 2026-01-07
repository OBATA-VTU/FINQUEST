
import React, { useState, useContext, FormEvent, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Logo } from '../components/Logo';
import { Level } from '../types';
import { LEVELS } from '../constants';
import { uploadToImgBB } from '../utils/api';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth as firebaseAuth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';

const getFriendlyErrorMessage = (error: any): string => {
    const code = error.code || '';
    const msg = error.message || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'Incorrect email or password.';
    if (code === 'auth/email-already-in-use') return 'Email already registered. Please log in.';
    if (code === 'auth/weak-password') return 'Password should be at least 6 characters.';
    return msg.replace('Firebase:', '').trim() || 'An unexpected error occurred.';
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [viewState, setViewState] = useState<'auth' | 'upload_photo' | 'google_setup'>('auth');
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [level, setLevel] = useState<Level>(100);
  const [username, setUsername] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'short' | 'invalid_format'>('idle');
  
  // Forgot Password
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (auth?.user && viewState === 'auth') {
        if (!auth.user.matricNumber || !auth.user.username) {
            setViewState('google_setup');
        } else {
            navigate('/dashboard');
        }
    }
  }, [auth?.user, navigate, viewState]);

  useEffect(() => {
      if ((isLogin && viewState === 'auth') || !username) { 
          setUsernameStatus('idle'); 
          return; 
      }
      
      const letterCount = (username.match(/[a-z]/g) || []).length;
      if (username.length < 3) {
          setUsernameStatus('short');
          return;
      }
      if (letterCount < 3) {
          setUsernameStatus('invalid_format');
          return;
      }
      
      const timer = setTimeout(async () => {
          setUsernameStatus('checking');
          try {
              if (auth) {
                  const available = await auth.checkUsernameAvailability(username);
                  setUsernameStatus(available ? 'available' : 'taken');
              }
          } catch (e) { setUsernameStatus('available'); }
      }, 700);
      return () => clearTimeout(timer);
  }, [username, isLogin, auth, viewState]);

  const handleMatricChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, ''); 
      if (val.length <= 9) setMatricNumber(val);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitizedUsername = e.target.value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ''); // Allow only letters and numbers
      setUsername(sanitizedUsername);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (!auth) return;
    try {
        if (isLogin) {
            await auth.login(email, password);
        } else {
            if (usernameStatus !== 'available') {
                showNotification("Please choose an available username with at least 3 letters.", "error");
                setIsLoading(false);
                return;
            }
            if (matricNumber.length !== 9) {
                showNotification("Matric number must be 9 digits.", "error");
                setIsLoading(false);
                return;
            }
            await auth.signup({ 
                name, email, pass: password, level, 
                username: username, 
                matricNumber 
            });
            setViewState('upload_photo');
        }
    } catch (err: any) {
        showNotification(getFriendlyErrorMessage(err), 'error');
    } finally {
        if (viewState === 'auth') setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      try {
          setIsLoading(true);
          if (!auth) throw new Error("Auth missing");
          const isIncomplete = await auth.loginWithGoogle();
          if (isIncomplete) { setViewState('google_setup'); setIsLoading(false); } 
      } catch (err: any) {
          // Error notification handled in context
          setIsLoading(false);
      }
  };

  const handleFinishSetup = async () => {
      if (!auth?.user) return;
      setIsLoading(true);
      try {
          let url = auth.user.avatarUrl;
          if (profileImage) {
              url = await uploadToImgBB(profileImage);
              if (firebaseAuth.currentUser) await updateProfile(firebaseAuth.currentUser, { photoURL: url });
          }
          const userRef = doc(db, 'users', auth.user.id);
          const updates: any = { avatarUrl: url };
          
          if (viewState === 'google_setup') { 
              if (usernameStatus !== 'available') throw new Error("Invalid or unavailable username. Ensure it has 3+ letters.");
              if (matricNumber.length !== 9) throw new Error("Invalid matric number (must be 9 digits).");
              updates.level = level; 
              updates.matricNumber = matricNumber; 
              updates.username = username;
          }
          
          await updateDoc(userRef, updates);
          auth.updateUser(updates);
          navigate('/dashboard', { replace: true });
      } catch (error: any) {
          showNotification(error.message || "Failed to save profile.", "error");
      } finally { setIsLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!resetEmail) return;
      setIsResetting(true);
      try {
          await sendPasswordResetEmail(firebaseAuth, resetEmail);
          showNotification("Reset link sent! Please check your email inbox and spam folder.", "success");
          setShowForgot(false); setResetEmail('');
      } catch (err: any) {
          showNotification(getFriendlyErrorMessage(err), "error");
      } finally { setIsResetting(false); }
  };

  const isUsernameInvalid = ['taken', 'short', 'invalid_format'].includes(usernameStatus);

  // Upload/Setup UI
  if (viewState !== 'auth') {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-100 dark:border-slate-700">
                <div className="text-center mb-6">
                    <Logo className="h-16 w-16 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Complete Setup</h2>
                    <p className="text-slate-500">Just a few more details.</p>
                </div>
                {viewState === 'google_setup' && (
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Username</label>
                            <div className="relative">
                                <input value={username} onChange={handleUsernameChange} className={`w-full p-3 rounded-lg border ${isUsernameInvalid ? 'border-red-500' : 'border-slate-300'} dark:bg-slate-700`} placeholder="Choose a unique username" />
                                {usernameStatus === 'checking' && <span className="absolute right-3 top-3 text-xs text-slate-400">Checking...</span>}
                                {usernameStatus === 'available' && <span className="absolute right-3 top-3 text-xs text-emerald-500 font-bold">Available</span>}
                                {usernameStatus === 'taken' && <span className="absolute right-3 top-3 text-xs text-red-500 font-bold">Taken</span>}
                                {usernameStatus === 'short' && <span className="absolute right-3 top-3 text-xs text-red-500 font-bold">Too short</span>}
                                {usernameStatus === 'invalid_format' && <span className="absolute right-3 top-3 text-xs text-red-500 font-bold">Needs 3+ letters</span>}
                            </div>
                        </div>
                        <input value={matricNumber} onChange={handleMatricChange} className="w-full p-3 rounded-lg border border-slate-300 dark:bg-slate-700" placeholder="Matric Number (9 digits)" />
                        <select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full p-3 rounded-lg border border-slate-300 dark:bg-slate-700">
                            {LEVELS.filter(l => typeof l === 'number').map(l => <option key={l} value={l}>{l} Level</option>)}
                        </select>
                    </div>
                )}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Profile Photo (Optional)</label>
                    <input type="file" onChange={e => e.target.files && setProfileImage(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                </div>
                <button onClick={handleFinishSetup} disabled={isLoading} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
                    {isLoading ? 'Saving...' : 'Finish Setup'}
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex transition-colors">
        <div className="hidden lg:flex w-1/2 bg-indigo-900 relative items-center justify-center text-white overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80')] bg-cover opacity-20 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-slate-900/90"></div>
            <div className="relative z-10 p-12 text-center">
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm inline-block mb-6 shadow-lg"><Logo className="h-24 w-24" /></div>
                <h1 className="text-5xl font-serif font-bold mb-4">FINSA Portal</h1>
                <p className="text-indigo-200 text-xl max-w-md mx-auto">Your gateway to academic excellence and departmental resources.</p>
            </div>
        </div>
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-50 dark:bg-slate-900">
            <div className="max-w-md w-full">
                <div className="lg:hidden text-center mb-8"><Logo className="h-16 w-16 mx-auto mb-2" /><h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">FINSA</h2></div>
                <div className="mb-8"><h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2><p className="text-slate-500 dark:text-slate-400">{isLogin ? 'Please enter your details to sign in.' : 'Join the department portal today.'}</p></div>
                <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-white font-bold mb-6 shadow-sm"><img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" /><span>Continue with Google</span></button>
                <div className="relative flex py-2 items-center mb-6"><div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div><span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">Or use email</span><div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div></div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <>
                            <div className="space-y-1"><label className="text-xs font-bold uppercase text-slate-500 ml-1">Full Name</label><input required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="John Doe" /></div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Username</label>
                                <div className="relative">
                                    <input required value={username} onChange={handleUsernameChange} className={`w-full px-4 py-3 rounded-xl border ${isUsernameInvalid ? 'border-red-500' : 'border-slate-200'} dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none`} placeholder="unique_username (no symbols)" />
                                    {usernameStatus === 'available' && <span className="absolute right-3 top-3.5 text-xs text-emerald-500 font-bold">✓ Available</span>}
                                    {usernameStatus === 'taken' && <span className="absolute right-3 top-3.5 text-xs text-red-500 font-bold">✕ Taken</span>}
                                    {usernameStatus === 'short' && <span className="absolute right-3 top-3.5 text-xs text-red-500 font-bold">✕ Too short</span>}
                                    {usernameStatus === 'invalid_format' && <span className="absolute right-3 top-3.5 text-xs text-red-500 font-bold">✕ Needs 3+ letters</span>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-xs font-bold uppercase text-slate-500 ml-1">Level</label><select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white outline-none">{LEVELS.filter(l => typeof l === 'number').map(l => <option key={l} value={l}>{l} Level</option>)}</select></div>
                                <div className="space-y-1"><label className="text-xs font-bold uppercase text-slate-500 ml-1">Matric No</label><input required value={matricNumber} onChange={handleMatricChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white outline-none" placeholder="9 digits" /></div>
                            </div>
                            <p className="text-xs text-amber-600 dark:text-amber-500 px-1 mt-2 font-medium">Please ensure these details are correct. They cannot be changed later and are required for verification.</p>
                        </>
                    )}
                    <div className="space-y-1"><label className="text-xs font-bold uppercase text-slate-500 ml-1">Email Address</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="student@example.com" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold uppercase text-slate-500 ml-1">Password</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" />{isLogin && <div className="flex justify-end"><button type="button" onClick={() => setShowForgot(true)} className="text-xs text-indigo-600 font-bold hover:underline">Forgot password?</button></div>}</div>
                    <button type="submit" disabled={isLoading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:-translate-y-1 disabled:opacity-70 disabled:transform-none">{isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}</button>
                </form>
                <div className="mt-8 text-center"><p className="text-slate-500 dark:text-slate-400 text-sm">{isLogin ? "Don't have an account? " : "Already have an account? "}<button onClick={() => setIsLogin(!isLogin)} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">{isLogin ? 'Sign Up' : 'Log In'}</button></p></div>
            </div>
        </div>
        {showForgot && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowForgot(false)}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm animate-fade-in-up" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Reset Password</h3><p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Enter your email to receive a reset link.</p>
                    <form onSubmit={handleForgotPassword}>
                        <input type="email" autoFocus required value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Enter your email" />
                        <div className="flex gap-3"><button type="button" onClick={() => setShowForgot(false)} className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button><button type="submit" disabled={isResetting} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">{isResetting ? 'Sending...' : 'Send Link'}</button></div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};


import React, { useState, useContext, FormEvent, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Logo } from '../components/Logo';
import { Level } from '../types';
import { LEVELS } from '../constants';
import { uploadToImgBB } from '../utils/api';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth as firebaseAuth, db } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';

const getFriendlyErrorMessage = (error: any): string => {
    const code = error.code || '';
    const msg = error.message || '';
    
    // Auth Errors
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'Incorrect email or password.';
    if (code === 'auth/email-already-in-use') return 'That email is already registered. Please log in.';
    if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
    if (code === 'auth/weak-password') return 'Password should be at least 6 characters.';
    
    // Popup / Network Errors
    if (code === 'auth/popup-closed-by-user') return 'Sign-in popup was closed.';
    if (code === 'auth/cancelled-popup-request') return 'Another popup is already open.';
    if (code === 'auth/network-request-failed') return 'Network Error. Check internet or Authorized Domains in Firebase Console.';
    
    // Permission Errors
    if (code === 'permission-denied') return 'Access denied. Please check your permissions.';

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
  const [loadingMessage, setLoadingMessage] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'short'>('idle');
  
  useEffect(() => {
    if (auth?.user && viewState === 'auth') {
        // STRICT PROFILE CHECK
        // If user is logged in but missing matric number or username, force setup
        if (!auth.user.matricNumber || !auth.user.username) {
            setViewState('google_setup');
        } else {
            navigate('/dashboard');
        }
    }
  }, [auth?.user, navigate, viewState]);

  useEffect(() => {
      // Logic for both Sign Up and Google Setup username check
      if ((isLogin && viewState === 'auth') || !username) { setUsernameStatus('idle'); return; }
      
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername.length < 3) { setUsernameStatus('short'); return; }
      
      const timer = setTimeout(async () => {
          setUsernameStatus('checking');
          try {
              if (auth) {
                  const available = await auth.checkUsernameAvailability(cleanUsername);
                  setUsernameStatus(available ? 'available' : 'taken');
              }
          } catch (e) { 
              // If check fails (e.g. network), assume available to not block user
              setUsernameStatus('available'); 
          }
      }, 700);
      return () => clearTimeout(timer);
  }, [username, isLogin, auth, viewState]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) setProfileImage(e.target.files[0]);
  };

  const handleMatricChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, ''); // Remove non-digits
      if (val.length <= 9) {
          setMatricNumber(val);
      }
  };

  const handleFinishSetup = async () => {
      if (!auth?.user) return;
      
      // Validation for Google Setup
      if (viewState === 'google_setup') {
          if (!matricNumber || matricNumber.length !== 9) {
              showNotification("Matric number must be exactly 9 digits.", "error");
              return;
          }
          if (!username || usernameStatus === 'taken' || usernameStatus === 'short') {
              showNotification("Please select a valid username.", "error");
              return;
          }
          if (!level) {
              showNotification("Please select your level.", "error");
              return;
          }
      }

      setIsLoading(true);
      setLoadingMessage('Finalizing profile...');
      try {
          let url = auth.user.avatarUrl;
          if (profileImage) {
              url = await uploadToImgBB(profileImage);
              if (firebaseAuth.currentUser) {
                  await updateProfile(firebaseAuth.currentUser, { photoURL: url });
              }
          }
          const userRef = doc(db, 'users', auth.user.id);
          const updates: any = { avatarUrl: url };
          
          if (viewState === 'google_setup') { 
              updates.level = level; 
              updates.matricNumber = matricNumber; 
              updates.username = username.trim().toLowerCase();
          }
          
          await updateDoc(userRef, updates);
          
          // Force reload or redirect
          window.location.href = '/dashboard';
      } catch (error) {
          console.error(error);
          showNotification("Failed to save profile. Try again.", "error");
      } finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (!auth) return;
    try {
        if (isLogin) {
            await auth.login(email, password);
            // Navigate is handled by useEffect
        } else {
            // Strict Validation on Submit
            if (usernameStatus === 'taken') {
                showNotification("Username is unavailable. Please choose another.", "error");
                return;
            }
            if (usernameStatus === 'short') {
                showNotification("Username must be at least 3 characters.", "error");
                return;
            }
            if (matricNumber.length !== 9) {
                showNotification("Matric number must be exactly 9 digits.", "error");
                return;
            }
            
            setLoadingMessage('Creating account...');
            await auth.signup({ 
                name, 
                email, 
                pass: password, 
                level, 
                username: username.trim().toLowerCase(), 
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
          
          if (isIncomplete) { 
              setViewState('google_setup'); 
              setIsLoading(false); 
          } 
          // If complete, AuthContext sets the user state, and useEffect will redirect.
      } catch (err: any) {
          showNotification(getFriendlyErrorMessage(err), 'error');
          setIsLoading(false);
      }
  };

  // --- SECONDARY VIEW: PROFILE COMPLETION ---
  if (viewState === 'upload_photo' || viewState === 'google_setup') {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden transition-colors">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            </div>

            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 text-center animate-fade-in-down border border-slate-100 dark:border-slate-700 relative z-10">
                <div className="mb-6 flex justify-center">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-full">
                        <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                </div>
                
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Final Step!</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Let's setup your academic identity to complete your registration.</p>
                
                {viewState === 'google_setup' && (
                    <div className="space-y-5 mb-8 text-left">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Preferred Username</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
                                <input 
                                    type="text" 
                                    value={username} 
                                    onChange={e => setUsername(e.target.value)} 
                                    className={`w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${usernameStatus === 'taken' ? 'border-rose-500 focus:ring-rose-200' : usernameStatus === 'available' ? 'border-emerald-500 focus:ring-emerald-200' : 'border-slate-200 dark:border-slate-600 focus:ring-indigo-200'}`}
                                    placeholder="username"
                                />
                                {usernameStatus === 'checking' && <span className="absolute right-3 top-3.5 text-xs text-indigo-500 font-bold">Checking...</span>}
                                {usernameStatus === 'taken' && <span className="absolute right-3 top-3.5 text-xs text-rose-500 font-bold">Taken</span>}
                                {usernameStatus === 'available' && <span className="absolute right-3 top-3.5 text-xs text-emerald-500 font-bold">Available</span>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Matric No (9 Digits)</label>
                            <div className="relative">
                                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0c0 .883-.393 1.627-1 2.172m.5.5L9.5 7.172M9 11h1" /></svg>
                                <input 
                                    type="text" 
                                    value={matricNumber} 
                                    onChange={handleMatricChange} 
                                    className="w-full pl-10 pr-16 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-200" 
                                    placeholder="170404001"
                                    inputMode="numeric"
                                />
                                <span className={`absolute right-3 top-3.5 text-xs font-bold ${matricNumber.length === 9 ? 'text-emerald-500' : 'text-slate-400'}`}>{matricNumber.length}/9</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Level</label>
                            <div className="relative">
                                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                <select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none">
                                    {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
                                </select>
                                <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-8">
                     <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Profile Picture</label>
                     <label htmlFor="photo-upload" className="block w-full cursor-pointer group">
                        <div className={`border-2 border-dashed rounded-2xl p-6 transition-all duration-300 flex flex-col items-center justify-center gap-3 ${profileImage ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            {profileImage ? (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">Image Selected</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Click to upload photo</span>
                                </>
                            )}
                        </div>
                        <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                     </label>
                </div>
                
                <button onClick={handleFinishSetup} disabled={isLoading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed">
                    {isLoading ? 'Processing...' : 'Complete Registration'}
                </button>
            </div>
        </div>
      );
  }

  // --- PRIMARY VIEW: LOGIN / SIGNUP ---
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 relative transition-colors">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800"></div>
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-300/30 dark:bg-purple-900/20 blur-3xl animate-blob"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-300/30 dark:bg-indigo-900/20 blur-3xl animate-blob animation-delay-2000"></div>
        </div>

        <Link to="/" className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-full shadow-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-sm transition-all hover:pr-6 group">
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            <span>Back to Home</span>
        </Link>

        <div className="relative z-10 w-full max-w-5xl h-auto min-h-[650px] bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-fade-in-up border border-white/50 dark:border-slate-700">
            
            {/* Left Panel - Hero/Brand */}
            <div className="hidden md:flex md:w-5/12 bg-indigo-900 relative flex-col justify-between p-12 text-white overflow-hidden">
                <div className="absolute inset-0">
                    <img src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" className="w-full h-full object-cover opacity-20 mix-blend-overlay" alt="Background" />
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/90 to-slate-900/90"></div>
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                            <Logo className="h-10 w-10 text-white" />
                        </div>
                        <span className="font-serif font-bold text-2xl tracking-wide">FINSA</span>
                    </div>
                    <div className="space-y-6">
                        <h2 className="text-4xl font-serif font-bold leading-tight">
                            {isLogin ? 'Welcome back to your portal.' : 'Begin your journey with us.'}
                        </h2>
                        <p className="text-indigo-200 text-lg font-light leading-relaxed">
                            {isLogin ? 'Access past questions, CBT practice, and connect with the department.' : 'Join the official digital community for Finance students of AAUA.'}
                        </p>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-indigo-300 font-medium">
                    &copy; {new Date().getFullYear()} FINSA-OBA. Secure Portal.
                </div>
            </div>

            {/* Right Panel - Auth Form */}
            <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                
                {/* Mobile Brand */}
                <div className="md:hidden flex flex-col items-center mb-8">
                    <Logo className="h-14 w-14 mb-2" />
                    <h1 className="text-xl font-bold text-indigo-900 dark:text-white font-serif">FINSA</h1>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl mb-8 relative w-full max-w-xs mx-auto md:mx-0">
                    <div 
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-600 rounded-lg shadow-sm transition-all duration-300 ease-in-out ${isLogin ? 'left-1' : 'left-[calc(50%+4px)]'}`}
                    ></div>
                    <button 
                        onClick={() => setIsLogin(true)} 
                        className={`flex-1 py-2 text-sm font-bold text-center relative z-10 transition-colors ${isLogin ? 'text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Sign In
                    </button>
                    <button 
                        onClick={() => setIsLogin(false)} 
                        className={`flex-1 py-2 text-sm font-bold text-center relative z-10 transition-colors ${!isLogin ? 'text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Sign Up
                    </button>
                </div>

                <div className="mb-6">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{isLogin ? 'Sign In' : 'Create Account'}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Enter your credentials to access the account.</p>
                </div>

                {/* Google Button */}
                <button onClick={handleGoogleLogin} type="button" className="w-full flex items-center justify-center gap-3 px-6 py-3.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm group">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
                    <span className="text-slate-700 dark:text-white font-bold text-sm">Continue with Google</span>
                </button>

                <div className="relative flex py-6 items-center">
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">Or with email</span>
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Full Name</label>
                                <div className="relative">
                                    <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    <input 
                                        type="text" 
                                        required 
                                        value={name} 
                                        onChange={e => setName(e.target.value)} 
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" 
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Username</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                                    <input 
                                        type="text" 
                                        required 
                                        value={username} 
                                        onChange={e => setUsername(e.target.value)} 
                                        className={`w-full pl-8 pr-4 py-3 rounded-xl border bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 transition-all ${usernameStatus === 'taken' ? 'border-rose-500 focus:ring-rose-200' : usernameStatus === 'available' ? 'border-emerald-500 focus:ring-emerald-200' : 'border-slate-200 dark:border-slate-600 focus:ring-indigo-500'}`} 
                                        placeholder="fin_wizard"
                                    />
                                    {usernameStatus === 'checking' && <span className="absolute right-3 top-3.5 text-xs text-indigo-500 font-bold">...</span>}
                                    {usernameStatus === 'taken' && <span className="absolute right-3 top-3.5 text-xs text-rose-500 font-bold">Taken</span>}
                                    {usernameStatus === 'available' && <span className="absolute right-3 top-3.5 text-xs text-emerald-500 font-bold">OK</span>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Level</label>
                                <div className="relative">
                                    <select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                    <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Matric No</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={matricNumber} 
                                    onChange={handleMatricChange} 
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                                    placeholder="9 Digits"
                                    inputMode="numeric"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email Address</label>
                        <div className="relative">
                            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <input 
                                type="email" 
                                required 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="student@example.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Password</label>
                        <div className="relative">
                            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            <input 
                                type="password" 
                                required 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading || (!isLogin && (usernameStatus === 'taken' || matricNumber.length !== 9))} 
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:-translate-y-1 mt-6"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                                {loadingMessage || 'Processing...'}
                            </span>
                        ) : (
                            isLogin ? 'Sign In to Portal' : 'Create Account'
                        )}
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};

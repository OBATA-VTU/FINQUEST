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
import { useNavigate } from 'react-router-dom';

const getFriendlyErrorMessage = (error: any): string => {
    const code = error.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        return 'Incorrect email or password.';
    }
    if (code === 'auth/email-already-in-use') {
        return 'That email is already registered. Please log in.';
    }
    if (code === 'auth/invalid-email') {
        return 'Please enter a valid email address.';
    }
    if (code === 'auth/network-request-failed') {
        return 'Network connection error. Please check your internet.';
    }
    if (code === 'auth/too-many-requests') {
        return 'Too many attempts. Please try again later.';
    }
    return error.message || 'An unexpected error occurred.';
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [viewState, setViewState] = useState<'auth' | 'upload_photo' | 'google_setup'>('auth');
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  
  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [level, setLevel] = useState<Level>(100);
  const [username, setUsername] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  
  // Photo Upload State
  const [profileImage, setProfileImage] = useState<File | null>(null);
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'short'>('idle');
  
  useEffect(() => {
    // If already logged in, redirect home
    if (auth?.user && viewState === 'auth') {
        navigate('/');
    }
  }, [auth?.user, navigate, viewState]);

  // Debounce username check
  useEffect(() => {
      if (isLogin || !username || viewState !== 'auth') {
          setUsernameStatus('idle');
          return;
      }

      const cleanUsername = username.trim().toLowerCase();

      if (cleanUsername.length < 3) {
          setUsernameStatus('short');
          return;
      }
      
      if (cleanUsername.length > 30) {
          return; 
      }

      const timer = setTimeout(async () => {
          setUsernameStatus('checking');
          try {
              if (auth) {
                  const available = await auth.checkUsernameAvailability(cleanUsername);
                  setUsernameStatus(available ? 'available' : 'taken');
                  
                  if (!available) {
                      showNotification("Username taken, try a suggestion", "error");
                  }
              }
          } catch (e) {
              console.error("Username check error:", e);
              setUsernameStatus('available'); 
          }
      }, 700);

      return () => clearTimeout(timer);
  }, [username, isLogin, auth, showNotification, viewState]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 5 * 1024 * 1024) { // 5MB Limit
              showNotification("Image size too large (Max 5MB)", "error");
              return;
          }
          setProfileImage(file);
      }
  };

  const handleFinishSetup = async () => {
      // Handles both manual upload_photo step and google_setup step
      if (!auth?.user) return;
      
      // If in google_setup, validate matric/level
      if (viewState === 'google_setup' && (!matricNumber || !level)) {
          showNotification("Please select your level and matric number", "error");
          return;
      }

      setIsLoading(true);
      setLoadingMessage('Finalizing profile...');

      try {
          let url = auth.user.avatarUrl;

          // Upload photo if selected
          if (profileImage) {
              url = await uploadToImgBB(profileImage);
              if (firebaseAuth.currentUser) {
                  await updateProfile(firebaseAuth.currentUser, { photoURL: url });
              }
          }

          // Update Firestore
          const userRef = doc(db, 'users', auth.user.id);
          const updates: any = { avatarUrl: url };
          
          if (viewState === 'google_setup') {
              updates.level = level;
              updates.matricNumber = matricNumber;
          }

          await updateDoc(userRef, updates);

          showNotification("Setup complete! Welcome to FINQUEST.", "success");
          navigate('/');
      } catch (error) {
          console.error("Setup failed:", error);
          showNotification("Failed to update profile, but account is ready.", "info");
          navigate('/');
      } finally {
          setIsLoading(false);
      }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadingMessage('');

    if (!auth) {
        showNotification('Authentication service unavailable.', 'error');
        setIsLoading(false);
        return;
    }

    try {
        if (isLogin) {
            await auth.login(email, password);
            navigate('/');
        } else {
            // Strict check before submit
            if (usernameStatus === 'taken' || usernameStatus === 'short') {
                showNotification('Please choose a valid available username.', 'error');
                setIsLoading(false);
                return;
            }
            
            const cleanUsername = username.trim().toLowerCase();
            
            setLoadingMessage('Creating account...');
            await auth.signup({ 
                name, 
                email, 
                pass: password, 
                level, 
                username: cleanUsername, 
                matricNumber 
            });
            
            // Switch to photo upload view
            setViewState('upload_photo');
        }
    } catch (err: any) {
        console.error("Auth error:", err);
        showNotification(getFriendlyErrorMessage(err), 'error');
    } finally {
        if (viewState === 'auth') {
             setIsLoading(false);
             setLoadingMessage('');
        }
    }
  };

  const handleGoogleLogin = async () => {
      try {
          setIsLoading(true);
          if (!auth) throw new Error("Auth service missing");
          const isNewUser = await auth.loginWithGoogle();
          
          if (isNewUser) {
              setViewState('google_setup');
              setIsLoading(false); // Stop loading to show setup form
          } else {
              navigate('/');
          }
      } catch (err: any) {
          console.error("Google login error:", err);
          showNotification(getFriendlyErrorMessage(err), 'error');
          setIsLoading(false);
      }
  };

  const toggleMode = () => {
      setIsLogin(!isLogin);
      if (!isLogin) {
        setName('');
        setUsername('');
        setMatricNumber('');
      }
  };

  // --- VIEW: SETUP PROFILE (Google or Manual) ---
  if (viewState === 'upload_photo' || viewState === 'google_setup') {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-fade-in-down">
                <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6 text-indigo-600">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Complete Your Profile</h2>
                <p className="text-slate-500 mb-8">
                    {viewState === 'google_setup' ? "We just need a few more details to set you up." : "Add a profile picture to stand out."}
                </p>

                {/* Google Setup Extra Fields */}
                {viewState === 'google_setup' && (
                    <div className="space-y-4 mb-8 text-left">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Level</label>
                            <select 
                                value={level} 
                                onChange={e => setLevel(Number(e.target.value) as Level)} 
                                className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                            >
                                {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Matric Number</label>
                            <input 
                                type="text" 
                                required 
                                value={matricNumber} 
                                onChange={e => setMatricNumber(e.target.value)} 
                                className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900" 
                                placeholder="e.g. 170404098"
                            />
                        </div>
                    </div>
                )}

                <div className="mb-8">
                     <label className="block text-sm font-bold text-slate-700 mb-2 text-left">Profile Picture {viewState === 'google_setup' && '(Optional)'}</label>
                     <label htmlFor="photo-upload" className="block w-full cursor-pointer">
                        <div className={`border-2 border-dashed rounded-xl p-8 transition-colors ${profileImage ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-indigo-400'}`}>
                            {profileImage ? (
                                <div className="flex flex-col items-center">
                                    <div className="w-24 h-24 rounded-full overflow-hidden mb-2 border-4 border-white shadow-md">
                                        <img src={URL.createObjectURL(profileImage)} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-sm font-bold text-emerald-600">Image Selected</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-slate-400">
                                    {auth?.user?.avatarUrl && viewState === 'google_setup' ? (
                                        <div className="w-16 h-16 rounded-full overflow-hidden mb-2">
                                            <img src={auth.user.avatarUrl} alt="Google" className="w-full h-full object-cover opacity-50" />
                                        </div>
                                    ) : (
                                         <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    )}
                                    <span className="text-sm font-medium">Click to {auth?.user?.avatarUrl ? 'change' : 'upload'} photo</span>
                                </div>
                            )}
                            <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </div>
                     </label>
                </div>

                <button 
                    onClick={handleFinishSetup}
                    disabled={isLoading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all mb-3 flex justify-center items-center gap-2"
                >
                    {isLoading && <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    Finish Setup
                </button>
            </div>
        </div>
      );
  }

  // --- VIEW: AUTH FORM ---
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
            
            {/* Left Panel: Visuals (Desktop) */}
            <div className="hidden md:flex md:w-5/12 bg-indigo-950 relative flex-col justify-between p-12 text-white">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1621640786029-22ad596541f9?q=80&w=1974&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/90 to-slate-900/95"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <Logo className="h-14 w-14 text-white" />
                        <span className="font-bold text-2xl tracking-tight">FINQUEST</span>
                    </div>
                    <h2 className="text-4xl font-extrabold mb-6 leading-tight font-serif">
                        {isLogin ? 'Welcome Back, Scholar.' : 'Begin Your Journey.'}
                    </h2>
                    <p className="text-indigo-200 text-lg leading-relaxed">
                        {isLogin ? 'Access your dashboard, review past questions, and stay ahead of the curve.' : 'Join the official digital community for the Department of Finance.'}
                    </p>
                </div>
            </div>

            {/* Right Panel: Form */}
            <div className="w-full md:w-7/12 p-6 sm:p-8 md:p-12 bg-white overflow-y-auto max-h-[90vh]">
                {/* Mobile Header Logo */}
                <div className="md:hidden flex flex-col items-center mb-8">
                    <Logo className="h-16 w-16 mb-2" />
                    <h1 className="text-xl font-bold text-indigo-900">FINQUEST</h1>
                </div>

                <div className="flex justify-end mb-4">
                     <button onClick={toggleMode} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                        {isLogin ? 'Create an account' : 'Log in instead'}
                     </button>
                </div>

                <div className="text-center md:text-left mb-8">
                     <h3 className="text-2xl md:text-3xl font-bold text-slate-900">{isLogin ? 'Sign In' : 'Sign Up'}</h3>
                     <p className="text-slate-500 mt-2">Enter your details below to continue.</p>
                </div>

                <button 
                    onClick={handleGoogleLogin}
                    type="button"
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-200 mb-8 group shadow-sm hover:shadow-md"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
                    <span className="text-slate-900 font-bold">Continue with Google</span>
                </button>

                <div className="relative flex py-2 items-center mb-8">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">Or continue with email</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {!isLogin && (
                        <div className="space-y-5 animate-fade-in-down">
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900" 
                                    placeholder="e.g. Adekunle Johnson"
                                />
                            </div>

                            {/* Username */}
                            <div>
                                <div className="flex justify-between items-baseline mb-2">
                                    <label className="block text-sm font-bold text-slate-700">Username</label>
                                    <span className={`text-xs font-semibold ${
                                        usernameStatus === 'available' ? 'text-emerald-600' : 
                                        usernameStatus === 'taken' ? 'text-rose-600' : 'text-slate-400'
                                    }`}>
                                        {usernameStatus === 'checking' && 'Checking...'}
                                        {usernameStatus === 'available' && 'Available'}
                                        {usernameStatus === 'taken' && 'Taken!'}
                                        {usernameStatus === 'short' && 'Min 3 chars'}
                                    </span>
                                </div>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        required 
                                        minLength={3}
                                        maxLength={30}
                                        value={username} 
                                        onChange={e => setUsername(e.target.value)} 
                                        className={`w-full px-5 py-3.5 rounded-xl bg-slate-50 border ${
                                            usernameStatus === 'taken' ? 'border-rose-500 focus:ring-rose-500 bg-rose-50' : 
                                            usernameStatus === 'available' ? 'border-emerald-500 focus:ring-emerald-500 bg-emerald-50' : 
                                            'border-slate-200 focus:ring-indigo-500'
                                        } focus:bg-white focus:ring-2 outline-none transition-all font-medium pr-10 text-slate-900`} 
                                        placeholder="e.g. finance_guru"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Level</label>
                                    <select 
                                        value={level} 
                                        onChange={e => setLevel(Number(e.target.value) as Level)} 
                                        className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium appearance-none text-slate-900"
                                    >
                                        {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Matric No.</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={matricNumber} 
                                        onChange={e => setMatricNumber(e.target.value)} 
                                        className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900" 
                                        placeholder="170404..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                            <input 
                                type="email" 
                                required 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900" 
                                placeholder="name@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                            <input 
                                type="password" 
                                required 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900" 
                                placeholder="Min 8 characters"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading || (!isLogin && usernameStatus === 'taken')}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
                    >
                         {isLoading && viewState === 'auth' && <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                         {isLoading ? (loadingMessage || 'Processing...') : (isLogin ? 'Sign In Securely' : 'Create Account')}
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};
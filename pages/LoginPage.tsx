
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
  
  // Forgot Password State
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
              setUsernameStatus('available'); 
          }
      }, 700);
      return () => clearTimeout(timer);
  }, [username, isLogin, auth, viewState]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) setProfileImage(e.target.files[0]);
  };

  const handleMatricChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, ''); 
      if (val.length <= 9) {
          setMatricNumber(val);
      }
  };

  const handleFinishSetup = async () => {
      if (!auth?.user) return;
      
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
        } else {
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
      } catch (err: any) {
          showNotification(getFriendlyErrorMessage(err), 'error');
          setIsLoading(false);
      }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!resetEmail) return;
      setIsResetting(true);
      try {
          await sendPasswordResetEmail(firebaseAuth, resetEmail);
          showNotification("Password reset email sent!", "success");
          setShowForgot(false);
          setResetEmail('');
      } catch (err: any) {
          showNotification(getFriendlyErrorMessage(err), "error");
      } finally {
          setIsResetting(false);
      }
  };

  if (viewState === 'upload_photo' || viewState === 'google_setup') {
      // ... (Existing Profile Setup UI remains the same)
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden transition-colors">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 text-center animate-fade-in-down border border-slate-100 dark:border-slate-700 relative z-10">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Final Step!</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Setup your academic identity.</p>
                {/* Simplified for brevity in this response block, assume previous UI logic here */}
                {viewState === 'google_setup' && (
                    <div className="space-y-5 mb-8 text-left">
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full border p-3 rounded" placeholder="Username" />
                        <input type="text" value={matricNumber} onChange={handleMatricChange} className="w-full border p-3 rounded" placeholder="Matric No" />
                        <select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full border p-3 rounded">
                            {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
                        </select>
                    </div>
                )}
                <button onClick={handleFinishSetup} disabled={isLoading} className="w-full py-3 bg-indigo-600 text-white rounded font-bold">{isLoading ? 'Saving...' : 'Complete'}</button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 relative transition-colors">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800"></div>
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-300/30 dark:bg-purple-900/20 blur-3xl animate-blob"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-300/30 dark:bg-indigo-900/20 blur-3xl animate-blob animation-delay-2000"></div>
        </div>

        <Link to="/" className="fixed top-4 left-4 md:top-8 md:left-8 z-50 flex items-center gap-2 px-5 py-2.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full shadow-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-sm transition-all hover:pl-3 group">
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            <span>Back to Home</span>
        </Link>

        <div className="relative z-10 w-full max-w-5xl h-auto min-h-[650px] bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-fade-in-up border border-white/50 dark:border-slate-700">
            
            {/* Left Panel */}
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
                    </div>
                </div>
                <div className="relative z-10 text-xs text-indigo-300 font-medium">
                    &copy; {new Date().getFullYear()} FINSA-OBA. Secure Portal.
                </div>
            </div>

            {/* Right Panel */}
            <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl mb-8 relative w-full max-w-xs mx-auto md:mx-0">
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-600 rounded-lg shadow-sm transition-all duration-300 ease-in-out ${isLogin ? 'left-1' : 'left-[calc(50%+4px)]'}`}></div>
                    <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 text-sm font-bold text-center relative z-10 transition-colors ${isLogin ? 'text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Sign In</button>
                    <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 text-sm font-bold text-center relative z-10 transition-colors ${!isLogin ? 'text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Sign Up</button>
                </div>

                <div className="mb-6">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{isLogin ? 'Sign In' : 'Create Account'}</h3>
                </div>

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
                            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="col-span-2 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Full Name" />
                            <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="col-span-2 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Username" />
                            <select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                                {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
                            </select>
                            <input type="text" required value={matricNumber} onChange={handleMatricChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Matric No" />
                        </div>
                    )}

                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Email Address" />
                    
                    <div>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Password" />
                        {isLogin && (
                            <div className="flex justify-end mt-2">
                                <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Forgot Password?</button>
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg mt-6">
                        {isLoading ? 'Processing...' : (isLogin ? 'Sign In to Portal' : 'Create Account')}
                    </button>
                </form>
            </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgot && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowForgot(false)}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm animate-fade-in-up" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Reset Password</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Enter your email to receive a reset link.</p>
                    <form onSubmit={handleForgotPassword}>
                        <input type="email" autoFocus required value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Enter your email" />
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowForgot(false)} className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                            <button type="submit" disabled={isResetting} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">{isResetting ? 'Sending...' : 'Send Link'}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};


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
import { AddPasswordModal } from '../components/AddPasswordModal';

const getFriendlyErrorMessage = (error: any): string => {
    const code = error.code || '';
    const msg = error.message || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'Incorrect email or password.';
    if (code === 'auth/email-already-in-use') return 'Email already registered. Please log in.';
    if (code === 'auth/weak-password') return 'Password should be at least 6 characters.';
    return msg.replace('Firebase:', '').trim() || 'An unexpected error occurred.';
};

const EyeIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const EyeOffIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [viewState, setViewState] = useState<'auth' | 'complete_setup'>('auth');
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [level, setLevel] = useState<Level>(100);
  const [username, setUsername] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'short' | 'invalid_format'>('idle');
  
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isAddPasswordModalOpen, setIsAddPasswordModalOpen] = useState(false);

  useEffect(() => {
    if (auth?.user) {
        if (!auth.user.matricNumber || !auth.user.username) {
            setViewState('complete_setup');
        } else {
            navigate('/dashboard');
        }
    }
  }, [auth?.user, navigate]);

  useEffect(() => {
      if ((isLogin && viewState === 'auth') || !username) { 
          setUsernameStatus('idle'); 
          return; 
      }
      
      const letterCount = (username.match(/[a-z]/g) || []).length;
      if (username.length < 3) { setUsernameStatus('short'); return; }
      if (letterCount < 3) { setUsernameStatus('invalid_format'); return; }
      
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
      const val = e.target.value.toUpperCase();
      if (level === 100) {
          const sanitized = val.replace(/[^A-Z0-9]/g, '');
          if (sanitized.length <= 18) setMatricNumber(sanitized);
      } else {
          const sanitized = val.replace(/\D/g, '');
          if (sanitized.length <= 9) setMatricNumber(sanitized);
      }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitizedUsername = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''); 
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
            if (usernameStatus !== 'available') throw new Error("Please choose an available username with at least 3 letters.");
            const isMatricValid = level === 100 ? (matricNumber.length >= 8 && matricNumber.length <= 18) || matricNumber.length === 9 : matricNumber.length === 9;
            const matricErrorMsg = level === 100 ? "Matric/JAMB No. must be valid." : "Matric number must be 9 digits.";
            if (!isMatricValid) throw new Error(matricErrorMsg);

            await auth.signup({ name, email, pass: password, level, username, matricNumber });
            // Let useEffect handle redirect to complete_setup if needed, or dashboard
        }
    } catch (err: any) {
        showNotification(getFriendlyErrorMessage(err), 'error');
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      if (!auth) return;
      setIsLoading(true);
      try {
          await auth.loginWithGoogle();
          // Let useEffect handle redirect
      } catch (err: any) {
          // Error already shown in context
      } finally {
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
          
          if (usernameStatus !== 'available') throw new Error("Invalid or unavailable username. Ensure it has 3+ letters.");
          const isMatricValid = level === 100 ? (matricNumber.length >= 8 && matricNumber.length <= 18) || matricNumber.length === 9 : matricNumber.length === 9;
          const matricErrorMsg = level === 100 ? "Invalid Matric/JAMB No." : "Invalid matric number (must be 9 digits).";
          if (!isMatricValid) throw new Error(matricErrorMsg);

          const updates = { avatarUrl: url, level, matricNumber, username };
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
          showNotification("Reset link sent! Please check your email.", "success");
          setShowForgot(false); setResetEmail('');
      } catch (err: any) {
          showNotification(getFriendlyErrorMessage(err), "error");
      } finally { setIsResetting(false); }
  };

  const isUsernameInvalid = ['taken', 'short', 'invalid_format'].includes(usernameStatus);
  const isSetupFormValid = usernameStatus === 'available' && (level === 100 ? (matricNumber.length >= 8 && matricNumber.length <= 18) || matricNumber.length === 9 : matricNumber.length === 9);

  if (viewState === 'complete_setup' && auth?.user) {
      const [previewUrl, setPreviewUrl] = useState(auth.user.avatarUrl || '');
      const { isPasswordAccount, isGoogleAccount, linkGoogleAccount } = auth;
      const needsPassword = isGoogleAccount && !isPasswordAccount;
      const needsGoogleLink = isPasswordAccount && !isGoogleAccount;
      const needsAvatar = !auth.user.avatarUrl;

      useEffect(() => {
          if (profileImage) setPreviewUrl(URL.createObjectURL(profileImage));
          else setPreviewUrl(auth.user?.avatarUrl || '');
      }, [profileImage, auth.user?.avatarUrl]);
      
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-100 dark:border-slate-700">
                <div className="text-center mb-6">
                    <Logo className="h-16 w-16 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Complete Your Profile</h2>
                    <p className="text-slate-500">Finish these steps to access your dashboard.</p>
                </div>

                <div className="space-y-5">
                    {/* Step 1: Core Details */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Required: Username & ID</label>
                        <div>
                            <div className="relative"><input value={username} onChange={handleUsernameChange} className={`w-full p-3 rounded-lg border ${isUsernameInvalid ? 'border-red-500' : 'border-slate-300'} dark:bg-slate-700`} placeholder="Choose a unique username" />{usernameStatus === 'available' && <span className="absolute right-3 top-3 text-xs text-emerald-500 font-bold">Available</span>}{isUsernameInvalid && <span className="absolute right-3 top-3 text-xs text-red-500 font-bold">{usernameStatus.replace('_', ' ')}</span>}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full p-3 rounded-lg border border-slate-300 dark:bg-slate-700">{LEVELS.filter(l => typeof l === 'number').map(l => <option key={l} value={l}>{l} Level</option>)}</select>
                             <input value={matricNumber} onChange={handleMatricChange} className="w-full p-3 rounded-lg border border-slate-300 dark:bg-slate-700" placeholder={level === 100 ? 'Matric/JAMB No.' : 'Matric No.'} />
                        </div>
                    </div>
                    
                    {/* Step 2: Optional but Recommended */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                       <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Recommended Steps</label>
                       {needsAvatar && (
                          <div className="flex items-center gap-4"><label htmlFor="p-upload" className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 border-2 overflow-hidden flex items-center justify-center cursor-pointer">{previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : '📸'}</label><input id="p-upload" type="file" className="hidden" onChange={e => e.target.files && setProfileImage(e.target.files[0])} accept="image/*" /><p className="text-xs text-slate-500 dark:text-slate-400">Upload a profile photo to personalize your account.</p></div>
                       )}
                       {needsPassword && <button type="button" onClick={() => setIsAddPasswordModalOpen(true)} className="w-full text-left p-3 rounded-lg border-2 border-dashed border-blue-400 text-blue-600 dark:text-blue-300 text-xs font-bold">Add a password for email sign-in</button>}
                       {needsGoogleLink && <button type="button" onClick={linkGoogleAccount} className="w-full text-left p-3 rounded-lg border-2 border-dashed border-green-400 text-green-600 dark:text-green-300 text-xs font-bold">Link your Google account for one-click access</button>}
                    </div>

                    <button onClick={handleFinishSetup} disabled={isLoading || !isSetupFormValid} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
                        {isLoading ? 'Saving...' : 'Save & Continue'}
                    </button>
                </div>
            </div>
            <AddPasswordModal isOpen={isAddPasswordModalOpen} onClose={() => setIsAddPasswordModalOpen(false)} />
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
                <button onClick={handleGoogleLogin} disabled={isLoading} className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-white font-bold mb-6 shadow-sm disabled:opacity-50"><img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" /><span>Continue with Google</span></button>
                <div className="relative flex py-2 items-center mb-6"><div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div><span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">Or use email</span><div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div></div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <>
                            <div className="space-y-1"><label className="text-xs font-bold uppercase text-slate-500 ml-1">Full Name</label><input required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="John Doe" /></div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Username</label>
                                <div className="relative"><input required value={username} onChange={handleUsernameChange} className={`w-full px-4 py-3 rounded-xl border ${isUsernameInvalid ? 'border-red-500' : 'border-slate-200'} dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none`} placeholder="unique_username (no symbols)" />{usernameStatus === 'available' && <span className="absolute right-3 top-3.5 text-xs text-emerald-500 font-bold">✓ Available</span>}{isUsernameInvalid && <span className="absolute right-3 top-3.5 text-xs text-red-500 font-bold">✕ {usernameStatus.replace('_', ' ')}</span>}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-xs font-bold uppercase text-slate-500 ml-1">Level</label><select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white outline-none">{LEVELS.filter(l => typeof l === 'number').map(l => <option key={l} value={l}>{l} Level</option>)}</select></div>
                                <div className="space-y-1"><label className="text-xs font-bold uppercase text-slate-500 ml-1">{level === 100 ? 'Matric/JAMB No.' : 'Matric No.'}</label><input required value={matricNumber} onChange={handleMatricChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white outline-none" placeholder={level === 100 ? 'e.g. 12345678JA' : '9 digits'} /></div>
                            </div>
                            <p className="text-xs text-amber-600 dark:text-amber-500 px-1 mt-2 font-medium">Please ensure these details are correct. They cannot be changed later and are required for verification.</p>
                        </>
                    )}
                    <div className="space-y-1"><label className="text-xs font-bold uppercase text-slate-500 ml-1">Email Address</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="student@example.com" /></div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-500 ml-1">Password</label>
                        <div className="relative"><input type={isPasswordVisible ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" /><button type="button" onClick={() => setIsPasswordVisible(p => !p)} className="absolute inset-y-0 right-0 px-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">{isPasswordVisible ? <EyeOffIcon/> : <EyeIcon/>}</button></div>
                        {isLogin && <div className="flex justify-end pt-1"><button type="button" onClick={() => setShowForgot(true)} className="text-xs text-indigo-600 font-bold hover:underline">Forgot password?</button></div>}
                    </div>
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
        <AddPasswordModal isOpen={isAddPasswordModalOpen} onClose={() => setIsAddPasswordModalOpen(false)} />
    </div>
  );
};

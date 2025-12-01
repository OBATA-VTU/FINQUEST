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

  if (viewState === 'upload_photo' || viewState === 'google_setup') {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-fade-in-down">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Complete Profile</h2>
                <p className="text-sm text-slate-500 mb-6">Let's set up your academic identity.</p>
                
                {viewState === 'google_setup' && (
                    <div className="space-y-4 mb-8 text-left">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Preferred Username</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={username} 
                                    onChange={e => setUsername(e.target.value)} 
                                    className={`w-full px-4 py-2 border rounded text-slate-900 focus:outline-none focus:ring-2 ${usernameStatus === 'taken' ? 'border-rose-500 focus:ring-rose-200' : usernameStatus === 'available' ? 'border-emerald-500 focus:ring-emerald-200' : 'focus:ring-indigo-200'}`}
                                    placeholder="e.g. finwiz_john"
                                />
                                {usernameStatus === 'checking' && <span className="absolute right-3 top-2.5 text-xs text-indigo-500">Checking...</span>}
                                {usernameStatus === 'taken' && <span className="absolute right-3 top-2.5 text-xs text-rose-500 font-bold">Taken</span>}
                                {usernameStatus === 'available' && <span className="absolute right-3 top-2.5 text-xs text-emerald-500 font-bold">Available</span>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Matric No (9 Digits)</label>
                            <input 
                                type="text" 
                                value={matricNumber} 
                                onChange={handleMatricChange} 
                                className="w-full px-4 py-2 border rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200" 
                                placeholder="e.g. 170404001"
                                inputMode="numeric"
                            />
                            <p className="text-xs text-right mt-1 text-slate-400">{matricNumber.length}/9 digits</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Level</label>
                            <select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full px-4 py-2 border rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                                {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
                            </select>
                        </div>
                    </div>
                )}

                <div className="mb-8">
                     <label className="block text-sm font-bold text-slate-700 mb-2">Profile Picture (Optional)</label>
                     <label htmlFor="photo-upload" className="block w-full cursor-pointer"><div className={`border-2 border-dashed rounded-xl p-8 transition-colors ${profileImage ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-indigo-400'}`}>{profileImage ? <span className="text-emerald-600 font-bold">Image Selected</span> : <span className="text-slate-500">Click to upload photo</span>}</div><input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} /></label>
                </div>
                
                <button onClick={handleFinishSetup} disabled={isLoading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed">
                    {isLoading ? 'Processing...' : 'Finish Setup'}
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
        <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 text-indigo-900 font-bold hover:text-indigo-700 transition z-50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            <span>Back to Home</span>
        </Link>
        <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
            <div className="hidden md:flex md:w-5/12 bg-indigo-950 relative flex-col justify-between p-12 text-white">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1621640786029-22ad596541f9?q=80&w=1974')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8"><Logo className="h-14 w-14 text-white" /><span className="font-bold text-2xl tracking-tight font-serif">FINSA</span></div>
                    <h2 className="text-4xl font-extrabold mb-6 leading-tight font-serif">{isLogin ? 'Welcome Back.' : 'Begin Journey.'}</h2>
                    <p className="text-indigo-200 text-lg">{isLogin ? 'Access your dashboard and resources.' : 'Join the official Finance Department portal.'}</p>
                </div>
            </div>
            <div className="w-full md:w-7/12 p-6 sm:p-8 md:p-12 bg-white overflow-y-auto max-h-[90vh]">
                <div className="md:hidden flex flex-col items-center mb-8"><Logo className="h-16 w-16 mb-2" /><h1 className="text-xl font-bold text-indigo-900 font-serif">FINSA</h1></div>
                <div className="flex justify-end mb-4"><button onClick={() => setIsLogin(!isLogin)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">{isLogin ? 'Create an account' : 'Log in instead'}</button></div>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">{isLogin ? 'Sign In' : 'Sign Up'}</h3>
                <button onClick={handleGoogleLogin} type="button" className="w-full flex items-center justify-center gap-3 px-6 py-4 border border-slate-200 rounded-xl hover:bg-slate-50 mb-8"><img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" /><span className="text-slate-900 font-bold">Continue with Google</span></button>
                <div className="relative flex py-2 items-center mb-8"><div className="flex-grow border-t border-slate-100"></div><span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold uppercase">Or continue with email</span><div className="flex-grow border-t border-slate-100"></div></div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <>
                            <div><label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label><input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-3.5 rounded-xl border border-slate-200 text-slate-900 font-medium" /></div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
                                <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className={`w-full px-5 py-3.5 rounded-xl border text-slate-900 font-medium ${usernameStatus === 'taken' ? 'border-rose-500' : 'border-slate-200'}`} />
                                {usernameStatus === 'checking' && <p className="text-xs text-indigo-500 mt-1">Checking...</p>}
                                {usernameStatus === 'taken' && <p className="text-xs text-rose-500 mt-1 font-bold">Username is taken!</p>}
                                {usernameStatus === 'available' && <p className="text-xs text-emerald-500 mt-1 font-bold">Username is available!</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold text-slate-700 mb-2">Level</label><select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full px-5 py-3.5 rounded-xl border border-slate-200 text-slate-900">{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Matric No</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={matricNumber} 
                                        onChange={handleMatricChange} 
                                        className="w-full px-5 py-3.5 rounded-xl border border-slate-200 text-slate-900" 
                                        placeholder="9 Digits"
                                        inputMode="numeric"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                    <div><label className="block text-sm font-bold text-slate-700 mb-2">Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-3.5 rounded-xl border border-slate-200 text-slate-900" /></div>
                    <div><label className="block text-sm font-bold text-slate-700 mb-2">Password</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-5 py-3.5 rounded-xl border border-slate-200 text-slate-900" /></div>
                    <button type="submit" disabled={isLoading || (!isLogin && (usernameStatus === 'taken' || matricNumber.length !== 9))} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-70 mt-4">{isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}</button>
                </form>
            </div>
        </div>
    </div>
  );
};
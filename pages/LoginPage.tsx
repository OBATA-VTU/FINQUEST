
import React, { useState, useContext, FormEvent, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Logo } from '../components/Logo';
import { Level } from '../types';
import { LEVELS } from '../constants';

interface LoginPageProps {
    onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  
  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [level, setLevel] = useState<Level>(100);
  const [username, setUsername] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'short'>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Debounce username check
  useEffect(() => {
      if (isLogin || !username) {
          setUsernameStatus('idle');
          return;
      }

      if (username.length < 3) {
          setUsernameStatus('short');
          return;
      }
      
      if (username.length > 30) {
          return; // Prevent typing more (handled in input maxLength)
      }

      const timer = setTimeout(async () => {
          setUsernameStatus('checking');
          try {
              if (auth) {
                  const available = await auth.checkUsernameAvailability(username);
                  setUsernameStatus(available ? 'available' : 'taken');
                  
                  if (available) {
                      showNotification("Username available!", "success");
                  } else {
                      showNotification("Username taken, try a suggestion", "error");
                      // Generate suggestions
                      const random = Math.floor(Math.random() * 1000);
                      setSuggestions([
                          `${username}${random}`,
                          `${username}_aa`,
                          `fin_${username}`
                      ]);
                  }
              }
          } catch (e) {
              console.error(e);
              setUsernameStatus('idle');
          }
      }, 700);

      return () => clearTimeout(timer);
  }, [username, isLogin, auth, showNotification]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!auth) {
        showNotification('Authentication service unavailable.', 'error');
        setIsLoading(false);
        return;
    }

    try {
        if (isLogin) {
            await auth.login(email, password);
        } else {
            if (usernameStatus === 'taken' || usernameStatus === 'short') {
                showNotification('Please choose a valid available username.', 'error');
                setIsLoading(false);
                return;
            }
            // Role is handled internally in AuthContext (Defaults to Student)
            await auth.signup({ name, email, pass: password, level, username, matricNumber });
        }
        onLoginSuccess();
    } catch (err: any) {
        console.error(err);
        let msg = 'Authentication failed.';
        if (err.code === 'auth/wrong-password') msg = 'Incorrect password.';
        if (err.code === 'auth/user-not-found') msg = 'No account found with this email.';
        if (err.code === 'auth/email-already-in-use') msg = 'Email is already registered.';
        showNotification(msg, 'error');
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      try {
          setIsLoading(true);
          await auth?.loginWithGoogle();
          onLoginSuccess();
      } catch (err) {
          console.error(err);
          showNotification('Google Sign-In failed.', 'error');
      } finally {
          setIsLoading(false);
      }
  };

  const toggleMode = () => {
      setIsLogin(!isLogin);
      // Keep form clean
      if (!isLogin) {
        setName('');
        setUsername('');
        setMatricNumber('');
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
            
            {/* Left Panel: Visuals */}
            <div className="hidden md:flex md:w-5/12 bg-indigo-950 relative flex-col justify-between p-12 text-white">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1621640786029-22ad596541f9?q=80&w=1974&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/90 to-slate-900/95"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <Logo className="h-14 w-14 text-white" />
                        <span className="font-bold text-2xl tracking-tight">FINSA</span>
                    </div>
                    <h2 className="text-4xl font-extrabold mb-6 leading-tight font-serif">
                        {isLogin ? 'Welcome Back, Scholar.' : 'Begin Your Journey.'}
                    </h2>
                    <p className="text-indigo-200 text-lg leading-relaxed">
                        {isLogin ? 'Access your dashboard, review past questions, and stay ahead of the curve.' : 'Join the official digital community for the Department of Finance.'}
                    </p>
                </div>

                <div className="relative z-10 mt-12">
                     <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-lg">
                        <div className="bg-emerald-500/20 p-3 rounded-full">
                             <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <p className="font-bold text-white">Secure Access</p>
                            <p className="text-sm text-indigo-300">Student ID Verification Optional</p>
                        </div>
                     </div>
                </div>
            </div>

            {/* Right Panel: Form */}
            <div className="w-full md:w-7/12 p-8 md:p-12 bg-white overflow-y-auto max-h-[90vh]">
                <div className="flex justify-end mb-4">
                     <button onClick={toggleMode} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                        {isLogin ? 'Create an account' : 'Log in instead'}
                     </button>
                </div>

                <div className="text-center md:text-left mb-8">
                     <h3 className="text-3xl font-bold text-slate-900">{isLogin ? 'Sign In' : 'Sign Up'}</h3>
                     <p className="text-slate-500 mt-2">Enter your details below to continue.</p>
                </div>

                <button 
                    onClick={handleGoogleLogin}
                    type="button"
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-200 mb-8 group shadow-sm hover:shadow-md"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
                    <span className="text-slate-700 font-bold">Continue with Google</span>
                </button>

                <div className="relative flex py-2 items-center mb-8">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">Or continue with email</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {!isLogin && (
                        <div className="space-y-6 animate-fade-in-down">
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium" 
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
                                        {usernameStatus === 'taken' && 'Unavailable'}
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
                                        onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} 
                                        className={`w-full px-5 py-3.5 rounded-xl bg-slate-50 border ${
                                            usernameStatus === 'taken' ? 'border-rose-300 bg-rose-50' : 
                                            usernameStatus === 'available' ? 'border-emerald-300 bg-emerald-50' : 
                                            'border-slate-200'
                                        } focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium pr-10`} 
                                        placeholder="e.g. finance_guru"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        {usernameStatus === 'checking' && <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>}
                                        {usernameStatus === 'available' && <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                </div>
                                {usernameStatus === 'taken' && (
                                    <div className="mt-2 text-sm text-slate-500">
                                        Suggestion: {suggestions.map(s => (
                                            <button type="button" key={s} onClick={() => setUsername(s)} className="text-indigo-600 font-bold hover:underline mx-1">{s}</button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Level</label>
                                    <select 
                                        value={level} 
                                        onChange={e => setLevel(Number(e.target.value) as Level)} 
                                        className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium appearance-none"
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
                                        className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium" 
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
                                className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium" 
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
                                className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium" 
                                placeholder="Min 8 characters"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
                    >
                         {isLoading && <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                         {isLogin ? 'Sign In Securely' : 'Create Account'}
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};

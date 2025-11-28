
import React, { useState, useContext, FormEvent } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { Level } from '../types';
import { LEVELS } from '../constants';

interface LoginPageProps {
    onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  
  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [level, setLevel] = useState<Level>(100);
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const auth = useContext(AuthContext);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!auth) {
        setError('Authentication service is not available.');
        setIsLoading(false);
        return;
    }

    try {
        if (isLogin) {
            await auth.login(email, password);
        } else {
            await auth.signup(name, email, password, level);
        }
        onLoginSuccess();
    } catch (err) {
        setError('Authentication failed. Please check your inputs.');
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  };

  const toggleMode = () => {
      setIsLogin(!isLogin);
      setError('');
      setName('');
      setEmail('');
      setPassword('');
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Image/Brand */}
      <div className="hidden lg:flex w-1/2 bg-indigo-900 relative items-center justify-center overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-20"></div>
         <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-purple-900/90"></div>
         
         <div className="relative z-10 p-12 text-white max-w-lg">
             <div className="bg-white/10 backdrop-blur-lg p-4 rounded-2xl inline-block mb-8">
                <Logo className="h-16 w-16" />
             </div>
             <h2 className="text-4xl font-extrabold mb-6 leading-tight">
                 {isLogin ? 'Welcome Back to FINSA Portal' : 'Join the Community'}
             </h2>
             <p className="text-lg text-indigo-100 mb-8 leading-relaxed">
                 Access thousands of past questions, connect with peers, and stay ahead in your academic journey.
             </p>
             <div className="flex items-center gap-4">
                 <div className="flex -space-x-2">
                    <img className="w-10 h-10 rounded-full border-2 border-indigo-900" src="https://i.pravatar.cc/100?img=1" alt="" />
                    <img className="w-10 h-10 rounded-full border-2 border-indigo-900" src="https://i.pravatar.cc/100?img=2" alt="" />
                    <img className="w-10 h-10 rounded-full border-2 border-indigo-900" src="https://i.pravatar.cc/100?img=3" alt="" />
                 </div>
                 <span className="text-sm font-medium">Joined by 500+ Students</span>
             </div>
         </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-slate-50">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl lg:shadow-none lg:bg-transparent lg:p-0">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {isLogin ? 'New here?' : 'Already have an account?'}{' '}
              <button onClick={toggleMode} className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                {isLogin ? 'Create an account' : 'Sign in'}
              </button>
            </p>
            {isLogin && <p className="mt-1 text-xs text-slate-400 italic">Tip: Use admin@aaua.edu.ng to test Admin features.</p>}
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {!isLogin && (
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input
                    id="name"
                    name="name"
                    type="text"
                    required={!isLogin}
                    className="appearance-none block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition sm:text-sm"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    />
                </div>
              )}

              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition sm:text-sm"
                  placeholder="student@aaua.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {!isLogin && (
                   <div>
                    <label htmlFor="level" className="block text-sm font-medium text-slate-700 mb-1">Current Level</label>
                    <select
                        id="level"
                        value={level}
                        onChange={(e) => setLevel(Number(e.target.value) as Level)}
                        className="block w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition sm:text-sm bg-white"
                    >
                        {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
                    </select>
                   </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition sm:text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {isLogin && (
                <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
                    Remember me
                    </label>
                </div>

                <div className="text-sm">
                    <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Forgot password?
                    </a>
                </div>
                </div>
            )}

            {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">{error}</div>}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md hover:shadow-lg transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : null}
                {isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </form>
          
          <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-slate-50 text-slate-500">Or continue with</span>
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                    <button className="w-full inline-flex justify-center py-2 px-4 border border-slate-300 rounded-lg shadow-sm bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors">
                        Google
                    </button>
                    <button className="w-full inline-flex justify-center py-2 px-4 border border-slate-300 rounded-lg shadow-sm bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors">
                        Student ID
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

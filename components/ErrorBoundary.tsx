import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'motion/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-serif font-black text-slate-950 dark:text-white mb-4 tracking-tighter italic">Something Went Wrong</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-10">
              The application encountered an unexpected error. Don't worry, your data is safe.
            </p>

            <div className="flex flex-col gap-4">
              <button 
                onClick={this.handleReset}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                Reload Application
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full py-5 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-indigo-600 transition-colors"
              >
                Return to Dashboard
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800 text-left">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Error Log</p>
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl overflow-auto max-h-32">
                  <code className="text-[10px] font-mono text-red-500 line-clamp-4">{this.state.error?.message}</code>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

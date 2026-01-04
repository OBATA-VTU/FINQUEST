import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  /**
   * Added standard constructor to ensure React.Component properly initializes the internal state
   * and props management, resolving the TypeScript error where 'props' was not recognized.
   */
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-xl max-w-lg w-full border border-red-100 dark:border-red-900">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">Something went wrong</h1>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-6">The application encountered an unexpected error.</p>
            <button
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors"
              onClick={() => window.location.reload()}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    // Now correctly recognized as a React Node because this.props is inherited from Component<P, S>
    return this.props.children;
  }
}
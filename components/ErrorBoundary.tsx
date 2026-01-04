import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // FIX: Reverted to using a constructor for state initialization and to pass props to the superclass. The previous class property syntax for `state` likely caused an issue where `this.props` was not being correctly inferred on the component instance, possibly due to TypeScript configuration (`useDefineForClassFields`). Using a constructor is the standard and most compatible way to set up React class components, ensuring `this.props` is available.
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

    return this.props.children;
  }
}

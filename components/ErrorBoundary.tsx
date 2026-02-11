import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component to catch JavaScript errors anywhere in their child component tree,
 * log those errors, and display a fallback UI instead of the component tree that crashed.
 */
// Added explicit inheritance from Component with defined Props and State to resolve 'props' identification issue
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Initializing state directly for robust type adherence
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  // Constructor with super(props) to properly initialize the base class
  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  // Static method to update state so the next render will show the fallback UI.
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  // Lifecycle method to log error information.
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render(): ReactNode {
    // Accessing children from this.props which is correctly inherited and typed
    const { children } = this.props;

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

    return children;
  }
}

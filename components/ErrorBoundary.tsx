
import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Initialize state as a class property to ensure `this.state` is properly typed and available.
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  // Constructor with super(props) to properly initialize this.props.
  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render(): ReactNode {
    // FIX: Access children directly from this.props to resolve type inference issue.
    // This removes the redundant destructuring at the top of the render method.
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

    // The code below correctly accesses children via `this.props.children` as per React class component standards.
    // If a TypeScript error "Property 'props' does not exist on type 'ErrorBoundary'" occurs here,
    // it likely indicates an issue with TypeScript configuration or environment setup outside this file.
    return this.props.children;
  }
}
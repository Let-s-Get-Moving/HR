import { Component, ErrorInfo, ReactNode } from 'react';
import { AppError } from '@/types';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: AppError) => void;
}

interface State {
  hasError: boolean;
  error: AppError | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error: {
        code: 'COMPONENT_ERROR',
        message: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
      }
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    const appError: AppError = {
      code: 'COMPONENT_ERROR',
      message: error.message,
      details: {
        componentStack: errorInfo.componentStack,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    };

    this.props.onError?.(appError);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0B0C' }}>
          <div className="max-w-md w-full rounded-tahoe shadow-tahoe-lg p-6 text-center" style={{ backgroundColor: 'rgba(22, 22, 24, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 69, 58, 0.15)' }}>
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-tahoe-text-primary mb-2">
              Something went wrong
            </h2>
            <p className="text-tahoe-text-secondary mb-4">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 rounded-tahoe-pill transition-all duration-tahoe"
                style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
              >
                Refresh Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full px-4 py-2 rounded-tahoe-pill transition-all duration-tahoe"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)' }}
              >
                Try Again
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-tahoe-text-muted">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs p-2 rounded-tahoe-input overflow-auto" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#ffffff' }}>
                  {JSON.stringify(this.state.error, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

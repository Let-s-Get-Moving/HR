import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0B0C' }}>
          <div className="max-w-md w-full mx-4">
            <div className="p-8 text-center rounded-tahoe shadow-tahoe-lg" style={{ backgroundColor: 'rgba(22, 22, 24, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-semibold mb-4 text-tahoe-text-primary">Something went wrong</h2>
              <p className="text-tahoe-text-secondary mb-6">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 rounded-tahoe-pill font-medium transition-all duration-tahoe"
                  style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
                >
                  Refresh Page
                </button>
                <button
                  onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                  className="w-full px-4 py-2 rounded-tahoe-pill font-medium transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)' }}
                >
                  Try Again
                </button>
              </div>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-tahoe-text-muted">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs p-3 rounded-tahoe-input overflow-auto" style={{ backgroundColor: 'rgba(255, 69, 58, 0.15)', color: '#ff453a' }}>
                    {this.state.error.toString()}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

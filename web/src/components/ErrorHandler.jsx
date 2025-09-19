import React, { useState } from "react";
import { motion } from "framer-motion";

// Error message component with retry functionality
export const ErrorMessage = ({ 
  error, 
  onRetry, 
  onDismiss, 
  title = "Error",
  showRetry = true,
  className = ""
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true);
      try {
        await onRetry();
      } finally {
        setIsRetrying(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`card border-red-500/50 bg-red-900/10 ${className}`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-400">{title}</h3>
          <div className="mt-2 text-sm text-red-300">
            {typeof error === 'string' ? error : error?.message || 'An unexpected error occurred'}
          </div>
          <div className="mt-4 flex space-x-3">
            {showRetry && onRetry && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 rounded font-medium transition-colors"
              >
                {isRetrying ? 'Retrying...' : 'Retry'}
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-sm text-red-400 hover:text-red-300 px-3 py-1 rounded font-medium transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Success message component
export const SuccessMessage = ({ 
  message, 
  onDismiss, 
  title = "Success",
  className = ""
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`card border-green-500/50 bg-green-900/10 ${className}`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-green-400">{title}</h3>
          <div className="mt-2 text-sm text-green-300">{message}</div>
          {onDismiss && (
            <div className="mt-4">
              <button
                onClick={onDismiss}
                className="text-sm text-green-400 hover:text-green-300 px-3 py-1 rounded font-medium transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Warning message component
export const WarningMessage = ({ 
  message, 
  onDismiss, 
  title = "Warning",
  className = ""
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`card border-yellow-500/50 bg-yellow-900/10 ${className}`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-400">{title}</h3>
          <div className="mt-2 text-sm text-yellow-300">{message}</div>
          {onDismiss && (
            <div className="mt-4">
              <button
                onClick={onDismiss}
                className="text-sm text-yellow-400 hover:text-yellow-300 px-3 py-1 rounded font-medium transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Network error handler
export const NetworkErrorHandler = ({ error, onRetry, onDismiss }) => {
  const getErrorMessage = (error) => {
    if (error?.message?.includes('Failed to fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (error?.status === 500) {
      return 'Server error. Please try again later.';
    }
    if (error?.status === 404) {
      return 'The requested resource was not found.';
    }
    if (error?.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (error?.status === 401) {
      return 'Your session has expired. Please log in again.';
    }
    return error?.message || 'An unexpected error occurred.';
  };

  return (
    <ErrorMessage
      error={getErrorMessage(error)}
      onRetry={onRetry}
      onDismiss={onDismiss}
      title="Connection Error"
    />
  );
};

// Form validation error handler
export const ValidationErrorHandler = ({ errors, className = "" }) => {
  if (!errors || Object.keys(errors).length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {Object.entries(errors).map(([field, message]) => (
        <div key={field} className="text-sm text-red-400 flex items-center space-x-2">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{message}</span>
        </div>
      ))}
    </div>
  );
};

export default ErrorMessage;

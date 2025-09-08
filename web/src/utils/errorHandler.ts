import { AppError } from '@/types';

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  SERVER = 'SERVER_ERROR',
  CLIENT = 'CLIENT_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Error context interface
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];
  private maxLogSize = 100;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Categorize error based on status code or error type
  private categorizeError(error: Error, statusCode?: number): ErrorType {
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return ErrorType.NETWORK;
    }

    if (statusCode) {
      switch (statusCode) {
        case 400:
          return ErrorType.VALIDATION;
        case 401:
          return ErrorType.AUTHENTICATION;
        case 403:
          return ErrorType.AUTHORIZATION;
        case 404:
          return ErrorType.NOT_FOUND;
        case 500:
        case 502:
        case 503:
        case 504:
          return ErrorType.SERVER;
        default:
          if (statusCode >= 400 && statusCode < 500) {
            return ErrorType.CLIENT;
          }
          return ErrorType.SERVER;
      }
    }

    return ErrorType.UNKNOWN;
  }

  // Determine error severity
  private getErrorSeverity(errorType: ErrorType, error: Error): ErrorSeverity {
    switch (errorType) {
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
        return ErrorSeverity.HIGH;
      case ErrorType.SERVER:
        return ErrorSeverity.CRITICAL;
      case ErrorType.NETWORK:
        return ErrorSeverity.MEDIUM;
      case ErrorType.VALIDATION:
      case ErrorType.NOT_FOUND:
        return ErrorSeverity.LOW;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  // Create error context
  private createErrorContext(component?: string, action?: string): ErrorContext {
    return {
      component,
      action,
      userId: localStorage.getItem('userId') || undefined,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
  }

  // Log error
  private logError(appError: AppError): void {
    this.errorLog.unshift(appError);
    
    // Keep only the most recent errors
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', appError);
    }

    // In production, you might want to send errors to a logging service
    // this.sendToLoggingService(appError);
  }

  // Handle error
  public handleError(
    error: Error,
    context?: {
      component?: string;
      action?: string;
      statusCode?: number;
      details?: any;
    }
  ): AppError {
    const errorType = this.categorizeError(error, context?.statusCode);
    const severity = this.getErrorSeverity(errorType, error);
    const errorContext = this.createErrorContext(context?.component, context?.action);

    const appError: AppError = {
      code: errorType,
      message: error.message || 'An unexpected error occurred',
      details: {
        ...context?.details,
        originalError: error.name,
        stack: error.stack,
        context: errorContext,
        severity,
      },
      timestamp: new Date().toISOString(),
    };

    this.logError(appError);
    return appError;
  }

  // Handle API errors specifically
  public handleApiError(
    error: any,
    context?: {
      component?: string;
      action?: string;
      endpoint?: string;
    }
  ): AppError {
    let message = 'An API error occurred';
    let statusCode: number | undefined;

    if (error.status) {
      statusCode = error.status;
    }

    if (error.message) {
      message = error.message;
    } else if (error.details?.error) {
      message = error.details.error;
    }

    return this.handleError(
      new Error(message),
      {
        ...context,
        statusCode,
        details: {
          endpoint: context?.endpoint,
          apiError: error,
        },
      }
    );
  }

  // Handle validation errors
  public handleValidationError(
    errors: Array<{ field: string; message: string }>,
    context?: {
      component?: string;
      action?: string;
    }
  ): AppError {
    const message = `Validation failed: ${errors.map(e => e.message).join(', ')}`;
    
    return this.handleError(
      new Error(message),
      {
        ...context,
        details: {
          validationErrors: errors,
        },
      }
    );
  }

  // Get error log
  public getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  // Clear error log
  public clearErrorLog(): void {
    this.errorLog = [];
  }

  // Get user-friendly error message
  public getUserFriendlyMessage(error: AppError): string {
    switch (error.code) {
      case ErrorType.NETWORK:
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case ErrorType.AUTHENTICATION:
        return 'Your session has expired. Please log in again.';
      case ErrorType.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case ErrorType.NOT_FOUND:
        return 'The requested resource was not found.';
      case ErrorType.VALIDATION:
        return error.message;
      case ErrorType.SERVER:
        return 'A server error occurred. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  // Check if error is retryable
  public isRetryable(error: AppError): boolean {
    const retryableTypes = [
      ErrorType.NETWORK,
      ErrorType.SERVER,
    ];

    return retryableTypes.includes(error.code as ErrorType);
  }

  // Get retry delay based on error type and attempt count
  public getRetryDelay(attemptCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(1000 * Math.pow(2, attemptCount - 1), 30000);
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Convenience functions
export const handleError = (error: Error, context?: any) => 
  errorHandler.handleError(error, context);

export const handleApiError = (error: any, context?: any) => 
  errorHandler.handleApiError(error, context);

export const handleValidationError = (errors: any[], context?: any) => 
  errorHandler.handleValidationError(errors, context);

export const getUserFriendlyMessage = (error: AppError) => 
  errorHandler.getUserFriendlyMessage(error);

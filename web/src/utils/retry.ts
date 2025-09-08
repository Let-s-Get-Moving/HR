import { errorHandler, ErrorType } from './errorHandler';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    return error.code === ErrorType.NETWORK || 
           (error.status >= 500 && error.status < 600);
  },
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on the last attempt
      if (attempt === opts.maxAttempts) {
        break;
      }

      // Check if we should retry this error
      if (!opts.retryCondition(error)) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.baseDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      );

      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If we get here, all retries failed
  throw lastError;
}

// Retry decorator for functions
export function retryable(options: RetryOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withRetry(() => method.apply(this, args), options);
    };

    return descriptor;
  };
}

// Retry with different strategies
export class RetryStrategy {
  static exponentialBackoff(options: RetryOptions = {}): RetryOptions {
    return {
      ...defaultOptions,
      ...options,
      backoffMultiplier: 2,
    };
  }

  static linearBackoff(options: RetryOptions = {}): RetryOptions {
    return {
      ...defaultOptions,
      ...options,
      backoffMultiplier: 1,
    };
  }

  static fixedDelay(delay: number, options: RetryOptions = {}): RetryOptions {
    return {
      ...defaultOptions,
      ...options,
      baseDelay: delay,
      backoffMultiplier: 1,
    };
  }

  static aggressive(options: RetryOptions = {}): RetryOptions {
    return {
      ...defaultOptions,
      ...options,
      maxAttempts: 5,
      baseDelay: 500,
      maxDelay: 10000,
    };
  }

  static conservative(options: RetryOptions = {}): RetryOptions {
    return {
      ...defaultOptions,
      ...options,
      maxAttempts: 2,
      baseDelay: 2000,
      maxDelay: 60000,
    };
  }
}

// Retry with circuit breaker pattern
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold = 5,
    private timeout = 60000,
    private resetTimeout = 30000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return this.state;
  }

  reset() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
}

// Export default retry function
export default withRetry;

// Performance monitoring and optimization utilities

interface PerformanceMetrics {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memory?: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.initializeObservers();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeObservers() {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            console.warn('Long task detected:', {
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        console.warn('Long task monitoring not supported');
      }

      // Monitor layout shifts
      try {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ((entry as any).hadRecentInput) return;
            
            const value = (entry as any).value;
            if (value > 0.1) {
              console.warn('Layout shift detected:', {
                value,
                sources: (entry as any).sources,
              });
            }
          }
        });
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(layoutShiftObserver);
      } catch (e) {
        console.warn('Layout shift monitoring not supported');
      }

      // Monitor largest contentful paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log('LCP:', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP monitoring not supported');
      }
    }
  }

  // Start timing a performance metric
  public startTiming(name: string): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
    });
  }

  // End timing a performance metric
  public endTiming(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`No timing found for ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    // Log slow operations
    if (duration > 100) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  // Measure memory usage
  public measureMemory(): number | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return null;
  }

  // Get all metrics
  public getMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  // Clear metrics
  public clearMetrics(): void {
    this.metrics.clear();
  }

  // Cleanup observers
  public cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Export singleton
export const performanceMonitor = PerformanceMonitor.getInstance();

// Performance decorator
export function measurePerformance(name: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      performanceMonitor.startTiming(name);
      try {
        const result = await method.apply(this, args);
        return result;
      } finally {
        performanceMonitor.endTiming(name);
      }
    };

    return descriptor;
  };
}

// React hook for performance measurement
export function usePerformanceMeasure(name: string) {
  const startTiming = () => performanceMonitor.startTiming(name);
  const endTiming = () => performanceMonitor.endTiming(name);
  
  return { startTiming, endTiming };
}

// Image lazy loading utility
export class ImageLazyLoader {
  private static observer: IntersectionObserver | null = null;
  private static images: Map<HTMLImageElement, string> = new Map();

  public static init() {
    if (typeof window === 'undefined') return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = this.images.get(img);
            if (src) {
              img.src = src;
              img.classList.remove('lazy');
              this.observer?.unobserve(img);
              this.images.delete(img);
            }
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01,
      }
    );
  }

  public static observe(img: HTMLImageElement, src: string) {
    if (!this.observer) this.init();
    
    this.images.set(img, src);
    img.classList.add('lazy');
    this.observer?.observe(img);
  }

  public static unobserve(img: HTMLImageElement) {
    this.observer?.unobserve(img);
    this.images.delete(img);
  }
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Virtual scrolling utility
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export class VirtualScroller {
  private container: HTMLElement;
  private options: VirtualScrollOptions;
  private scrollTop = 0;
  private startIndex = 0;
  private endIndex = 0;
  private visibleItems: HTMLElement[] = [];

  constructor(container: HTMLElement, options: VirtualScrollOptions) {
    this.container = container;
    this.options = { overscan: 5, ...options };
    this.setupScrollListener();
  }

  private setupScrollListener() {
    this.container.addEventListener('scroll', this.handleScroll.bind(this));
  }

  private handleScroll() {
    this.scrollTop = this.container.scrollTop;
    this.calculateVisibleRange();
    this.renderVisibleItems();
  }

  private calculateVisibleRange() {
    const { itemHeight, containerHeight, overscan = 5 } = this.options;
    const totalItems = this.container.children.length;
    
    this.startIndex = Math.max(0, Math.floor(this.scrollTop / itemHeight) - overscan);
    this.endIndex = Math.min(
      totalItems - 1,
      Math.ceil((this.scrollTop + containerHeight) / itemHeight) + overscan
    );
  }

  private renderVisibleItems() {
    // Implementation would depend on your specific use case
    // This is a simplified version
    console.log(`Rendering items ${this.startIndex} to ${this.endIndex}`);
  }

  public destroy() {
    this.container.removeEventListener('scroll', this.handleScroll.bind(this));
  }
}

// Bundle analyzer helper
export function analyzeBundle() {
  if (process.env.NODE_ENV === 'development') {
    // Log bundle size information
    console.log('Bundle analysis:', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType || 'unknown',
    });
  }
}

export default {
  performanceMonitor,
  measurePerformance,
  usePerformanceMeasure,
  ImageLazyLoader,
  debounce,
  throttle,
  VirtualScroller,
  analyzeBundle,
};

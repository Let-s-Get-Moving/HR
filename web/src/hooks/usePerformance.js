import { useState, useEffect, useCallback, useMemo } from 'react';

// Lazy loading hook
export const useLazyLoading = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, hasLoaded]);

  return { ref, isVisible, hasLoaded };
};

// Debounced value hook
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttled callback hook
export const useThrottle = (callback, delay) => {
  const [isThrottled, setIsThrottled] = useState(false);

  const throttledCallback = useCallback((...args) => {
    if (!isThrottled) {
      callback(...args);
      setIsThrottled(true);
      setTimeout(() => setIsThrottled(false), delay);
    }
  }, [callback, delay, isThrottled]);

  return throttledCallback;
};

// Memoized API call hook
export const useMemoizedAPI = (apiCall, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const memoizedApiCall = useMemo(() => apiCall, dependencies);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await memoizedApiCall();
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [memoizedApiCall]);

  return { data, loading, error, execute };
};

// Virtual scrolling hook
export const useVirtualScrolling = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
  
  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop
  };
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName) => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    memoryUsage: 0,
    renderCount: 0
  });

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setMetrics(prev => ({
        ...prev,
        renderTime,
        renderCount: prev.renderCount + 1,
        memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 0
      }));
    };
  });

  return metrics;
};

// Image lazy loading hook
export const useImageLazyLoading = (src, placeholder) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = new Image();
          img.onload = () => {
            setImageSrc(src);
            setIsLoaded(true);
          };
          img.onerror = () => {
            setIsError(true);
          };
          img.src = src;
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return { imgRef, imageSrc, isLoaded, isError };
};

// Cache management hook
export const useCache = (key, initialValue = null, ttl = 5 * 60 * 1000) => {
  const [cache, setCache] = useState(() => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const { value, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < ttl) {
          return value;
        }
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
    return initialValue;
  });

  const setCachedValue = useCallback((value) => {
    setCache(value);
    try {
      localStorage.setItem(key, JSON.stringify({
        value,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }, [key]);

  const clearCache = useCallback(() => {
    setCache(initialValue);
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }, [key, initialValue]);

  return [cache, setCachedValue, clearCache];
};

// Bundle size optimization hook
export const useCodeSplitting = (importFn) => {
  const [Component, setComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    importFn()
      .then(module => {
        setComponent(() => module.default);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [importFn]);

  return { Component, loading, error };
};

// Web Workers hook
export const useWebWorker = (workerScript) => {
  const [worker, setWorker] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const newWorker = new Worker(workerScript);
    
    newWorker.onmessage = (e) => {
      setResult(e.data);
      setLoading(false);
    };
    
    newWorker.onerror = (err) => {
      setError(err);
      setLoading(false);
    };

    setWorker(newWorker);

    return () => {
      newWorker.terminate();
    };
  }, [workerScript]);

  const postMessage = useCallback((data) => {
    if (worker) {
      setLoading(true);
      setError(null);
      worker.postMessage(data);
    }
  }, [worker]);

  return { postMessage, result, loading, error };
};

export default {
  useLazyLoading,
  useDebounce,
  useThrottle,
  useMemoizedAPI,
  useVirtualScrolling,
  usePerformanceMonitor,
  useImageLazyLoading,
  useCache,
  useCodeSplitting,
  useWebWorker
};

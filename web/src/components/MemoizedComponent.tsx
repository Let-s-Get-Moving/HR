import React, { memo, useMemo, useCallback } from 'react';
import { BaseComponentProps } from '@/types';

// Higher-order component for memoization
export function withMemo<T extends object>(
  Component: React.ComponentType<T>,
  areEqual?: (prevProps: T, nextProps: T) => boolean
) {
  return memo(Component, areEqual);
}

// Memoized component with custom comparison
export function withCustomMemo<T extends object>(
  Component: React.ComponentType<T>,
  compareFn: (prevProps: T, nextProps: T) => boolean
) {
  return memo(Component, compareFn);
}

// Memoized component that only re-renders when specific props change
export function withSelectiveMemo<T extends object>(
  Component: React.ComponentType<T>,
  selectors: (keyof T)[]
) {
  return memo(Component, (prevProps, nextProps) => {
    return selectors.every(selector => prevProps[selector] === nextProps[selector]);
  });
}

// Memoized component that ignores certain props
export function withIgnoredMemo<T extends object>(
  Component: React.ComponentType<T>,
  ignoreProps: (keyof T)[]
) {
  return memo(Component, (prevProps, nextProps) => {
    const prevFiltered = { ...prevProps };
    const nextFiltered = { ...nextProps };
    
    ignoreProps.forEach(prop => {
      delete prevFiltered[prop];
      delete nextFiltered[prop];
    });
    
    return JSON.stringify(prevFiltered) === JSON.stringify(nextFiltered);
  });
}

// Hook for memoizing expensive calculations
export function useExpensiveCalculation<T>(
  calculation: () => T,
  dependencies: React.DependencyList
): T {
  return useMemo(calculation, dependencies);
}

// Hook for memoizing callbacks
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: React.DependencyList
): T {
  return useCallback(callback, dependencies);
}

// Memoized component wrapper
interface MemoizedComponentProps extends BaseComponentProps {
  memo?: boolean;
  compareFn?: (prevProps: any, nextProps: any) => boolean;
  selectors?: string[];
  ignoreProps?: string[];
}

const MemoizedComponent: React.FC<MemoizedComponentProps> = ({
  children,
  memo = true,
  compareFn,
  selectors,
  ignoreProps,
  ...props
}) => {
  if (!memo) {
    return <>{children}</>;
  }

  const MemoizedChild = useMemo(() => {
    if (compareFn) {
      return withCustomMemo(() => <>{children}</>, compareFn);
    }
    
    if (selectors) {
      return withSelectiveMemo(() => <>{children}</>, selectors as any);
    }
    
    if (ignoreProps) {
      return withIgnoredMemo(() => <>{children}</>, ignoreProps as any);
    }
    
    return React.memo(() => <>{children}</>);
  }, [children, compareFn, selectors, ignoreProps]);

  return <MemoizedChild {...props} />;
};

export default MemoizedComponent;

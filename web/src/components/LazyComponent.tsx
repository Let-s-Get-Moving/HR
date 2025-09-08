import React, { Suspense, lazy, ComponentType } from 'react';
import { BaseComponentProps } from '@/types';
import SkeletonLoader from './SkeletonLoader';

interface LazyComponentProps extends BaseComponentProps {
  fallback?: React.ReactNode;
  skeleton?: {
    lines?: number;
    height?: string;
    width?: string;
  };
}

// Higher-order component for lazy loading
export function withLazyLoading<T extends object>(
  importFunction: () => Promise<{ default: ComponentType<T> }>,
  fallback?: React.ReactNode,
  skeleton?: LazyComponentProps['skeleton']
) {
  const LazyComponent = lazy(importFunction);

  return function LazyWrapper(props: T & LazyComponentProps) {
    const { fallback: propFallback, skeleton: propSkeleton, ...componentProps } = props;
    
    const defaultFallback = propFallback || fallback || (
      <div className="p-6">
        <SkeletonLoader 
          lines={propSkeleton?.lines || skeleton?.lines || 3}
          height={propSkeleton?.height || skeleton?.height || 'h-4'}
          width={propSkeleton?.width || skeleton?.width || 'w-full'}
        />
      </div>
    );

    return (
      <Suspense fallback={defaultFallback}>
        <LazyComponent {...(componentProps as T)} />
      </Suspense>
    );
  };
}

// Lazy component wrapper
const LazyComponent: React.FC<LazyComponentProps> = ({
  children,
  fallback,
  skeleton,
  className = '',
}) => {
  const defaultFallback = fallback || (
    <div className={`p-6 ${className}`}>
      <SkeletonLoader 
        lines={skeleton?.lines || 3}
        height={skeleton?.height || 'h-4'}
        width={skeleton?.width || 'w-full'}
      />
    </div>
  );

  return (
    <Suspense fallback={defaultFallback}>
      {children}
    </Suspense>
  );
};

export default LazyComponent;

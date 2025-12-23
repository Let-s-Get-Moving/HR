import React from 'react';
import { BaseComponentProps } from '@/types';

interface SkeletonLoaderProps extends BaseComponentProps {
  lines?: number;
  height?: string;
  width?: string;
  rounded?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  lines = 1, 
  height = 'h-4', 
  width = 'w-full',
  rounded = true,
  className = ''
}) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`${height} ${width} ${
            rounded ? 'rounded-tahoe-input' : ''
          } ${index < lines - 1 ? 'mb-2' : ''}`}
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
        />
      ))}
    </div>
  );
};

// Predefined skeleton components for common use cases
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`card p-6 ${className}`}>
    <SkeletonLoader lines={3} height="h-4" className="mb-4" />
    <SkeletonLoader lines={2} height="h-3" width="w-3/4" />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number; className?: string }> = ({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <SkeletonLoader
            key={colIndex}
            lines={1}
            height="h-4"
            width={colIndex === 0 ? 'w-1/4' : 'w-1/6'}
          />
        ))}
      </div>
    ))}
  </div>
);

export const FormSkeleton: React.FC<{ fields?: number; className?: string }> = ({ 
  fields = 4, 
  className = '' 
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index}>
        <SkeletonLoader lines={1} height="h-4" width="w-1/4" className="mb-2" />
        <SkeletonLoader lines={1} height="h-10" width="w-full" rounded />
      </div>
    ))}
  </div>
);

export default SkeletonLoader;

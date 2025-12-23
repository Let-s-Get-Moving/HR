import React from 'react';
import { CardProps } from '@/types';
import SkeletonLoader from './SkeletonLoader';

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  actions,
  loading = false,
  className = '',
  ...props
}) => {
  if (loading) {
    return (
      <div className={`bg-tahoe-card-bg backdrop-blur-tahoe rounded-tahoe shadow-tahoe border border-tahoe-border-primary p-6 ${className}`} style={{ backgroundColor: 'rgba(22, 22, 24, 0.8)' }}>
        <SkeletonLoader lines={3} height="h-4" className="mb-4" />
        <SkeletonLoader lines={2} height="h-3" width="w-3/4" />
      </div>
    );
  }

  return (
    <div 
      className={`bg-tahoe-card-bg backdrop-blur-tahoe rounded-tahoe shadow-tahoe border border-tahoe-border-primary p-6 ${className}`}
      style={{ backgroundColor: 'rgba(22, 22, 24, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      {...props}
    >
      {(title || subtitle || actions) && (
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {title && (
              <h3 className="text-lg font-semibold text-tahoe-text-primary">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-tahoe-text-secondary mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-2 ml-4">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;

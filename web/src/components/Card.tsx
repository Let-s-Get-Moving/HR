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
      <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 ${className}`}>
        <SkeletonLoader lines={3} height="h-4" className="mb-4" />
        <SkeletonLoader lines={2} height="h-3" width="w-3/4" />
      </div>
    );
  }

  return (
    <div 
      className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 ${className}`}
      {...props}
    >
      {(title || subtitle || actions) && (
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {title && (
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
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

import React from 'react';
import { BaseComponentProps } from '@/types';

interface SkipLinkProps extends BaseComponentProps {
  href: string;
  children: React.ReactNode;
}

const SkipLink: React.FC<SkipLinkProps> = ({ href, children, className = '' }) => {
  return (
    <a
      href={href}
      className={`sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-md focus:shadow-lg ${className}`}
    >
      {children}
    </a>
  );
};

export default SkipLink;

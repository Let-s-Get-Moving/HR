import React, { useEffect, useRef } from 'react';
import { BaseComponentProps } from '@/types';
import { FocusManager } from '../utils/accessibility';

interface FocusTrapProps extends BaseComponentProps {
  active: boolean;
  returnFocus?: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
}

const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  active,
  returnFocus = true,
  initialFocus,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the initial element or first focusable element
    if (initialFocus?.current) {
      initialFocus.current.focus();
    } else {
      FocusManager.focusFirst(containerRef.current);
    }

    // Handle keyboard navigation
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        FocusManager.trapFocus(containerRef.current!, event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Return focus to the previously focused element
      if (returnFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [active, returnFocus, initialFocus]);

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

export default FocusTrap;

import React, { useEffect, useState } from 'react';
import { BaseComponentProps } from '@/types';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps extends BaseComponentProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
  action,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const typeConfig = {
    success: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      bgColor: 'rgba(48, 209, 88, 0.15)',
      borderColor: 'rgba(48, 209, 88, 0.3)',
      iconColor: '#30d158',
      titleColor: '#30d158',
      messageColor: '#e5e5e7',
    },
    error: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      bgColor: 'rgba(255, 69, 58, 0.15)',
      borderColor: 'rgba(255, 69, 58, 0.3)',
      iconColor: '#ff453a',
      titleColor: '#ff453a',
      messageColor: '#e5e5e7',
    },
    warning: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      bgColor: 'rgba(255, 159, 10, 0.15)',
      borderColor: 'rgba(255, 159, 10, 0.3)',
      iconColor: '#ff9f0a',
      titleColor: '#ff9f0a',
      messageColor: '#e5e5e7',
    },
    info: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: 'rgba(10, 132, 255, 0.15)',
      borderColor: 'rgba(10, 132, 255, 0.3)',
      iconColor: '#0A84FF',
      titleColor: '#0A84FF',
      messageColor: '#e5e5e7',
    },
  };

  const config = typeConfig[type];

  return (
    <div
      className={`
        max-w-sm w-full rounded-tahoe shadow-tahoe pointer-events-auto backdrop-blur-tahoe
        transform transition-all duration-tahoe ease-tahoe
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      style={{ backgroundColor: config.bgColor, border: `1px solid ${config.borderColor}`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0" style={{ color: config.iconColor }}>
            {config.icon}
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium" style={{ color: config.titleColor }}>
              {title}
            </p>
            {message && (
              <p className="mt-1 text-sm" style={{ color: config.messageColor }}>
                {message}
              </p>
            )}
            {action && (
              <div className="mt-2">
                <button
                  onClick={action.onClick}
                  className="text-sm font-medium hover:underline transition-all duration-tahoe"
                  style={{ color: config.titleColor }}
                >
                  {action.label}
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleClose}
              className="inline-flex hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-tahoe-accent focus:ring-offset-2 rounded-lg transition-all duration-tahoe"
              style={{ color: config.titleColor }}
            >
              <span className="sr-only">Close</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast Container
interface ToastContainerProps {
  toasts: Array<{
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    action?: {
      label: string;
      onClick: () => void;
    };
  }>;
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={onClose}
        />
      ))}
    </div>
  );
};

// Toast Hook
interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Array<ToastOptions & { id: string }>>([]);

  const addToast = (options: ToastOptions) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...options, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const success = (title: string, message?: string, options?: Partial<ToastOptions>) => {
    addToast({ type: 'success', title, message, ...options });
  };

  const error = (title: string, message?: string, options?: Partial<ToastOptions>) => {
    addToast({ type: 'error', title, message, ...options });
  };

  const warning = (title: string, message?: string, options?: Partial<ToastOptions>) => {
    addToast({ type: 'warning', title, message, ...options });
  };

  const info = (title: string, message?: string, options?: Partial<ToastOptions>) => {
    addToast({ type: 'info', title, message, ...options });
  };

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
};

export default Toast;

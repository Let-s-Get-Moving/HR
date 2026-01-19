import { forwardRef } from 'react';
import { ButtonProps } from '@/types';
import LoadingSpinner from './LoadingSpinner';
import { aria, generateId } from '../utils/accessibility';

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  id,
  ...props
}, ref) => {
  const buttonId = id || generateId('button');
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-tahoe-pill transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent focus:ring-offset-2 focus:ring-offset-tahoe-bg-primary disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-tahoe-accent hover:bg-tahoe-accent-hover text-white shadow-tahoe-sm hover:shadow-tahoe-md',
    secondary: 'bg-tahoe-border-primary hover:bg-tahoe-border-secondary border border-tahoe-border-primary text-white focus:ring-tahoe-border-secondary',
    outline: 'border border-tahoe-accent text-tahoe-accent hover:bg-tahoe-accent hover:text-white focus:ring-tahoe-accent',
    ghost: 'text-tahoe-text-secondary hover:bg-tahoe-bg-hover focus:ring-tahoe-border-primary',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-tahoe-sm hover:shadow-tahoe-md'
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button
      ref={ref}
      id={buttonId}
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      aria-disabled={disabled || loading}
      {...aria.pressed(loading)}
      {...props}
    >
      {loading && (
        <LoadingSpinner size="sm" className="mr-2" />
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;

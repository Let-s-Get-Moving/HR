import React, { forwardRef } from 'react';
import { ValidationError } from '@/types';
import { formAccessibility } from '@/utils/accessibility';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: ValidationError | null;
  helperText?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(({
  label,
  error,
  helperText,
  required = false,
  leftIcon,
  rightIcon,
  className = '',
  containerClassName = '',
  id,
  name,
  ...props
}, ref) => {
  const fieldName = name || 'input';
  const inputId = id || formAccessibility.getFieldId(fieldName);
  const errorId = formAccessibility.getErrorId(fieldName);
  const helpId = formAccessibility.getHelpId(fieldName);
  const hasError = !!error;
  const hasHelp = !!helperText;

  const inputClasses = `
    w-full px-4 py-3 border rounded-tahoe-input transition-all duration-tahoe
    focus:outline-none focus:ring-2 focus:ring-tahoe-accent focus:ring-offset-2 focus:ring-offset-tahoe-bg-primary
    disabled:opacity-50 disabled:cursor-not-allowed
    ${leftIcon ? 'pl-10' : ''}
    ${rightIcon ? 'pr-10' : ''}
    ${hasError 
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
      : 'border-tahoe-border-primary focus:ring-tahoe-accent focus:border-tahoe-accent'
    }
    bg-tahoe-input-bg text-tahoe-text-primary
    placeholder-tahoe-text-muted
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-xs font-medium text-tahoe-text-primary mb-1.5 tracking-wide"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-tahoe-text-muted">
              {leftIcon}
            </div>
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          name={fieldName}
          className={inputClasses}
          aria-invalid={hasError}
          aria-describedby={[hasError ? errorId : null, hasHelp ? helpId : null].filter(Boolean).join(' ') || undefined}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="text-tahoe-text-muted">
              {rightIcon}
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p 
          id={errorId}
          className="text-xs text-red-500 mt-1"
          role="alert"
          aria-live="polite"
        >
          {error.message}
        </p>
      )}
      
      {helperText && !error && (
        <p 
          id={helpId}
          className="text-xs text-tahoe-text-muted mt-1"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;

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
    w-full px-3 py-2 border rounded-lg transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-1
    disabled:opacity-50 disabled:cursor-not-allowed
    ${leftIcon ? 'pl-10' : ''}
    ${rightIcon ? 'pr-10' : ''}
    ${hasError 
      ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
      : 'border-slate-300 dark:border-slate-600 focus:ring-indigo-500 focus:border-indigo-500'
    }
    bg-white dark:bg-slate-800 text-slate-900 dark:text-white
    placeholder-slate-400 dark:placeholder-slate-500
    ${className}
  `.trim();

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-slate-400 dark:text-slate-500">
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
            <div className="text-slate-400 dark:text-slate-500">
              {rightIcon}
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p 
          id={errorId}
          className="text-sm text-red-600 dark:text-red-400"
          role="alert"
          aria-live="polite"
        >
          {error.message}
        </p>
      )}
      
      {helperText && !error && (
        <p 
          id={helpId}
          className="text-sm text-slate-500 dark:text-slate-400"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;

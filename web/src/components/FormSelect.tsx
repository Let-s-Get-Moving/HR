import React, { forwardRef } from 'react';
import { ValidationError } from '@/types';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: ValidationError | null;
  helperText?: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
  containerClassName?: string;
}

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(({
  label,
  error,
  helperText,
  required = false,
  options,
  placeholder,
  className = '',
  containerClassName = '',
  id,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;

  const selectClasses = `
    w-full px-4 py-3 border rounded-tahoe-input transition-all duration-tahoe
    focus:outline-none focus:ring-2 focus:ring-tahoe-accent focus:ring-offset-2 focus:ring-offset-tahoe-bg-primary
    disabled:opacity-50 disabled:cursor-not-allowed
    ${hasError 
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
      : 'border-tahoe-border-primary focus:ring-tahoe-accent focus:border-tahoe-accent'
    }
    bg-tahoe-input-bg text-tahoe-text-primary
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-xs font-medium text-tahoe-text-primary mb-1.5 tracking-wide"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        ref={ref}
        id={selectId}
        className={selectClasses}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p className="text-xs text-red-500 mt-1">
          {error.message}
        </p>
      )}
      
      {helperText && !error && (
        <p className="text-xs text-tahoe-text-muted mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
});

FormSelect.displayName = 'FormSelect';

export default FormSelect;

import { useState, useCallback, useRef } from 'react';
import { ValidationResult, ValidationError } from '@/types';
import { Validator, validateForm } from '@/utils/validation';

export interface FormField {
  name: string;
  value: any;
  error: ValidationError | null;
  touched: boolean;
  dirty: boolean;
}

export interface FormState<T> {
  values: T;
  errors: Record<keyof T, ValidationError | null>;
  touched: Record<keyof T, boolean>;
  dirty: Record<keyof T, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface UseFormOptions<T> {
  initialValues: T;
  validationRules?: Record<keyof T, (validator: Validator) => Validator>;
  onSubmit?: (values: T) => Promise<void> | void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validationRules = {},
  onSubmit,
  validateOnChange = true,
  validateOnBlur = true,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, ValidationError | null>>({} as Record<keyof T, ValidationError | null>);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);
  const [dirty, setDirty] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitAttempted = useRef(false);

  // Check if form is valid
  const isValid = Object.values(errors).every(error => error === null);

  // Check if form is dirty
  const isDirty = Object.values(dirty).some(dirty => dirty);

  // Validate a single field
  const validateField = useCallback((name: keyof T, value: any): ValidationError | null => {
    const rule = validationRules[name];
    if (!rule) return null;

    const validator = new Validator();
    rule(validator);
    const result = validator.getResult();
    
    return result.isValid ? null : result.errors[0] || null;
  }, [validationRules]);

  // Validate all fields
  const validateAll = useCallback((): ValidationResult => {
    const validator = new Validator();
    
    Object.entries(validationRules).forEach(([field, rule]) => {
      rule(validator);
    });
    
    return validator.getResult();
  }, [validationRules]);

  // Set field value
  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    setDirty(prev => ({ ...prev, [name]: true }));
    
    if (validateOnChange) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [validateField, validateOnChange]);

  // Set field touched
  const setTouchedField = useCallback((name: keyof T, touched: boolean = true) => {
    setTouched(prev => ({ ...prev, [name]: touched }));
    
    if (touched && validateOnBlur) {
      const error = validateField(name, values[name]);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [validateField, validateOnBlur, values]);

  // Handle field change
  const handleChange = useCallback((name: keyof T) => (value: any) => {
    setValue(name, value);
  }, [setValue]);

  // Handle field blur
  const handleBlur = useCallback((name: keyof T) => () => {
    setTouchedField(name);
  }, [setTouchedField]);

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({} as Record<keyof T, ValidationError | null>);
    setTouched({} as Record<keyof T, boolean>);
    setDirty({} as Record<keyof T, boolean>);
    setIsSubmitting(false);
    submitAttempted.current = false;
  }, [initialValues]);

  // Set form values
  const setFormValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }));
    
    // Mark all changed fields as dirty
    Object.keys(newValues).forEach(key => {
      setDirty(prev => ({ ...prev, [key as keyof T]: true }));
    });
  }, []);

  // Set field error
  const setFieldError = useCallback((name: keyof T, error: ValidationError | null) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  // Set multiple errors
  const setErrors = useCallback((newErrors: Record<keyof T, ValidationError | null>) => {
    setErrors(prev => ({ ...prev, ...newErrors }));
  }, []);

  // Clear field error
  const clearFieldError = useCallback((name: keyof T) => {
    setErrors(prev => ({ ...prev, [name]: null }));
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({} as Record<keyof T, ValidationError | null>);
  }, []);

  // Submit form
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    setIsSubmitting(true);
    submitAttempted.current = true;
    
    try {
      // Validate all fields
      const validation = validateAll();
      
      if (!validation.isValid) {
        // Set errors for all fields
        const newErrors = {} as Record<keyof T, ValidationError | null>;
        validation.errors.forEach(error => {
          newErrors[error.field as keyof T] = error;
        });
        setErrors(newErrors);
        
        // Mark all fields as touched
        const allTouched = {} as Record<keyof T, boolean>;
        Object.keys(initialValues).forEach(key => {
          allTouched[key as keyof T] = true;
        });
        setTouched(allTouched);
        
        return;
      }
      
      // Call onSubmit if provided
      if (onSubmit) {
        await onSubmit(values);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateAll, onSubmit, values, initialValues]);

  // Get field props for form components
  const getFieldProps = useCallback((name: keyof T) => ({
    value: values[name],
    onChange: handleChange(name),
    onBlur: handleBlur(name),
    error: errors[name],
    touched: touched[name],
    dirty: dirty[name],
  }), [values, errors, touched, dirty, handleChange, handleBlur]);

  // Form state
  const formState: FormState<T> = {
    values,
    errors,
    touched,
    dirty,
    isValid,
    isSubmitting,
    isDirty,
  };

  return {
    // Form state
    ...formState,
    
    // Actions
    setValue,
    setTouchedField,
    setFormValues,
    setFieldError,
    setErrors,
    clearFieldError,
    clearErrors,
    reset,
    handleSubmit,
    
    // Handlers
    handleChange,
    handleBlur,
    
    // Utilities
    getFieldProps,
    validateField,
    validateAll,
  };
}

export default useForm;

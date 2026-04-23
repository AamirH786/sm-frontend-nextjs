'use client';

import { forwardRef, useEffect } from 'react';
import { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | FieldError | Merge<FieldError, FieldErrorsImpl> | undefined;
  onF3Press?: () => void;
  hint?: string;
  fieldName?: string;
}

const getErrorMessage = (
  error: string | FieldError | Merge<FieldError, FieldErrorsImpl> | undefined
): string => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return '';
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', onF3Press, required, hint, fieldName, ...props }, ref) => {
    useEffect(() => {
      if (onF3Press) {
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'F3') {
            e.preventDefault();
            onF3Press();
          }
        };

        const inputElement = (ref as React.RefObject<HTMLInputElement>)?.current;
        if (inputElement) {
          inputElement.addEventListener('keydown', handleKeyDown);
          return () => inputElement.removeEventListener('keydown', handleKeyDown);
        }
      }
    }, [onF3Press, ref]);

    return (
      <div className="w-full" data-field-name={fieldName}>
        {label && (
          <label className="mb-1.5 block text-sm font-medium tracking-tight text-slate-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          required={required}
          placeholder={props.placeholder ?? (label ? `Enter ${label.toLowerCase()}` : undefined)}
          className={`
            w-full rounded-xl border border-slate-200 bg-white/95 px-4 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60
            placeholder:text-slate-400
            focus:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-100
            disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500
            transition-all duration-200
            ${error ? 'border-red-300 focus:border-red-300 focus:ring-red-100' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{getErrorMessage(error)}</p>
        )}
        {hint && !error && (
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>
        )}
        {onF3Press && !error && (
          <p className="mt-1 text-xs text-gray-500">
            Press{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
              F3
            </kbd>{' '}
            to add new
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

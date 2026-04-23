import { forwardRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  hint?: string;
  fieldName?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, label, hint, required, className = '', fieldName, ...props }, ref) => {
    return (
      <div className="w-full" data-field-name={fieldName}>
        {label && (
          <label className="mb-1.5 block text-sm font-medium tracking-tight text-slate-700">
            {label}
            {required ? <span className="ml-1 text-red-500">*</span> : null}
          </label>
        )}
        <textarea
          ref={ref}
          required={required}
          placeholder={props.placeholder ?? (label ? `Enter ${label.toLowerCase()}` : undefined)}
          className={`min-h-[104px] w-full rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-sm shadow-slate-200/60 transition-all duration-200 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-100 ${error ? 'border-red-300 focus:border-red-300 focus:ring-red-100' : ''} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;

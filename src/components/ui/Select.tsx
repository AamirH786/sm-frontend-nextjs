'use client';

import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { playErrorSound } from '@/lib/utils';
import { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';

interface SelectOption {
  value: string | number;
  label: string;
  active?: boolean;
}

interface SelectProps {
  label?: string;
  error?: string | FieldError | Merge<FieldError, FieldErrorsImpl> | undefined;
  options: SelectOption[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onF3Press?: () => void;
  showAddButton?: boolean;
  fieldName?: string;
}

const getErrorMessage = (
  error: string | FieldError | Merge<FieldError, FieldErrorsImpl> | undefined
): string => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error) return String(error.message);
  return '';
};

const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      value,
      onChange,
      placeholder = 'Select an option',
      required,
      disabled,
      onF3Press,
      showAddButton = false,
      fieldName,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    let sortedOptions = [...options].sort((a, b) => {
      const labelA = a?.label ?? '';
      const labelB = b?.label ?? '';

      if (a.active && !b.active) return -1;
      if (!a.active && b.active) return 1;

      return labelA.localeCompare(labelB);
    });

    if (options.some((o) => o.label === 'All')) {
      const all = sortedOptions.find((o) => o.label === 'All');
      sortedOptions = [
        ...(all ? [all] : []),
        ...sortedOptions.filter((o) => o.label !== 'All'),
      ];
    }

    const filteredOptions = useMemo(
      () =>
        sortedOptions.filter((opt) => {
          const currentLabel = opt?.label ?? '';
          return currentLabel.toLowerCase().includes(searchTerm.toLowerCase());
        }),
      [sortedOptions, searchTerm]
    );

    const selectedOption = sortedOptions.find((o) => String(o.value) === String(value));

    const openDropdown = () => {
      const selectedIndex = filteredOptions.findIndex((o) => String(o.value) === String(value));
      const fallbackIndex = sortedOptions.findIndex((o) => String(o.value) === String(value));

      setHighlightedIndex(
        selectedIndex >= 0 ? selectedIndex : fallbackIndex >= 0 ? fallbackIndex : 0
      );
      setIsOpen(true);
    };

    useEffect(() => {
      if (isOpen) {
        const el = document.getElementById(`select-opt-${highlightedIndex}`);
        if (el) {
          el.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [highlightedIndex, isOpen]);

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (dropdownRef.current?.contains(e.target as Node)) return;
        setIsOpen(false);
        setSearchTerm('');
      };

      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
      if (isOpen) {
        window.setTimeout(() => inputRef.current?.focus(), 70);
      }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((p) => (p < filteredOptions.length - 1 ? p + 1 : 0));
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((p) => (p > 0 ? p - 1 : Math.max(filteredOptions.length - 1, 0)));
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (!filteredOptions.length) return playErrorSound();

        onChange?.(filteredOptions[highlightedIndex].value);
        setIsOpen(false);
        setSearchTerm('');
      }

      if (e.key === 'F3' && onF3Press) {
        e.preventDefault();
        setIsOpen(false);
        onF3Press();
      }
    };

    return (
      <div className="w-full" ref={ref} data-field-name={fieldName}>
        {label && (
          <label className="mb-1.5 block text-sm font-medium tracking-tight text-slate-700">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}

        <div className="relative" ref={dropdownRef}>
          <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            aria-expanded={isOpen}
            onClick={() => {
              if (!disabled) {
                isOpen ? setIsOpen(false) : openDropdown();
              }
            }}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                isOpen ? setIsOpen(false) : openDropdown();
              }
              if (e.key === 'ArrowDown' && !isOpen) {
                e.preventDefault();
                openDropdown();
              }
            }}
            className={[
              'flex w-full items-center justify-between rounded-xl border bg-white/95 px-4 py-2.5 text-sm shadow-sm shadow-slate-200/60 transition-all duration-200',
              error ? 'border-red-300 focus:ring-red-100' : 'border-slate-200',
              disabled ? 'cursor-not-allowed bg-slate-50 text-slate-400' : 'hover:border-blue-200 hover:bg-blue-50/30',
              isOpen ? 'border-blue-300 ring-4 ring-blue-100' : '',
            ].join(' ')}
          >
            <span className={selectedOption ? 'text-slate-900' : 'text-slate-400'}>
              {selectedOption?.label || placeholder || (label ? `Select ${label.toLowerCase()}` : 'Select an option')}
            </span>

            <div className="flex items-center justify-end gap-2">
              {showAddButton && onF3Press ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onF3Press();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onF3Press();
                    }
                  }}
                  className="rounded-full p-1 text-primary-600 transition-colors hover:bg-primary-50"
                >
                  <Plus size={16} />
                </span>
              ) : null}

              <ChevronDown
                size={18}
                className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </div>

          {isOpen ? (
            <>
              <div
                className="fixed inset-0 z-[1098] cursor-default bg-transparent"
                onClick={() => {
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              />
              <div
                tabIndex={0}
                onKeyDown={handleKeyDown}
                className="absolute left-0 right-0 top-[calc(100%+6px)] z-[1099] overflow-hidden rounded-2xl border border-slate-200/85 bg-white/98 shadow-[0_28px_80px_rgba(15,23,42,0.18)] ring-1 ring-black/5 backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-200"
              >
                <div className="border-b border-slate-100 p-2.5">
                  <input
                    ref={inputRef}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search options..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto">
                  {filteredOptions.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500">No options found</div>
                  ) : (
                    filteredOptions.map((opt, index) => (
                      <button
                        key={opt.value}
                        type="button"
                        id={`select-opt-${index}`}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => {
                          onChange?.(opt.value);
                          setIsOpen(false);
                          setSearchTerm('');
                        }}
                        className={[
                          'w-full px-4 py-2.5 text-left text-sm transition-colors duration-150',
                          highlightedIndex === index
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-slate-700 hover:bg-slate-50',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {error && <p className="mt-1 text-sm text-red-600">{getErrorMessage(error)}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;

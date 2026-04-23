'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableMultiSelectOption {
  value: number;
  label: string;
  description?: string | null;
  disabled?: boolean;
}

interface SearchableMultiSelectProps {
  label: string;
  value: number[];
  options: SearchableMultiSelectOption[];
  onChange: (value: number[]) => void;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  emptyText?: string;
  disabled?: boolean;
  searchable?: boolean;
  closeOnSelect?: boolean;
  error?: string;
  fieldName?: string;
}

export default function SearchableMultiSelect({
  label,
  value,
  options,
  onChange,
  required = false,
  placeholder = 'Select options',
  helperText,
  emptyText = 'No options available',
  disabled = false,
  searchable = true,
  closeOnSelect = false,
  error,
  fieldName,
}: SearchableMultiSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedOptions = useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const query = search.trim().toLowerCase();

    return options.filter((option) => {
      const haystack = `${option.label} ${option.description ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [options, search, searchable]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchable) {
      searchRef.current?.focus();
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((current) => {
      if (filteredOptions.length === 0) return 0;
      return Math.min(current, filteredOptions.length - 1);
    });
  }, [filteredOptions.length, isOpen]);

  const toggleValue = (optionValue: number) => {
    const isSelected = value.includes(optionValue);
    const newValue = isSelected
      ? value.filter((item) => item !== optionValue)
      : [...value, optionValue];

    onChange(newValue);

    if (closeOnSelect) {
      setIsOpen(false);
      setSearch('');
    } else {
      setIsOpen(true);
      window.setTimeout(() => {
        searchRef.current?.focus();
      }, 0);
    }
  };

  const clearSelection = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2" ref={rootRef} data-field-name={fieldName}>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </label>
        {value.length > 0 && !disabled ? (
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs font-medium text-primary-600 transition hover:text-primary-700"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="relative">
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          aria-expanded={isOpen}
          onClick={() => {
            if (!disabled) {
              setIsOpen((open) => !open);
            }
          }}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (isOpen && filteredOptions[activeIndex]) {
                toggleValue(filteredOptions[activeIndex].value);
                return;
              }
              setIsOpen((open) => !open);
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              if (!isOpen) {
                setIsOpen(true);
                return;
              }
              setActiveIndex((current) => Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)));
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              if (!isOpen) {
                setIsOpen(true);
                return;
              }
              setActiveIndex((current) => Math.max(current - 1, 0));
            }
            if (event.key === 'Escape') {
              setIsOpen(false);
              setSearch('');
            }
          }}
          className={cn(
            'flex min-h-[46px] w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition-all',
            'hover:border-primary-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-200',
            disabled && 'cursor-not-allowed bg-slate-50 text-slate-400 shadow-none',
            isOpen && 'border-primary-400 ring-2 ring-primary-200',
            error && 'border-red-300 focus:ring-red-100'
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {selectedOptions.length > 0 ? (
              <>
                {selectedOptions.slice(0, 2).map((option) => (
                  <span
                    key={option.value}
                    className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700"
                  >
                    <span className="max-w-[120px] truncate">{option.label}</span>
                    {!disabled ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleValue(option.value);
                        }}
                        className="rounded-full p-0.5 text-primary-500 transition hover:bg-primary-100 hover:text-primary-700"
                        aria-label={`Remove ${option.label}`}
                      >
                        <X size={12} />
                      </button>
                    ) : null}
                  </span>
                ))}

                {selectedOptions.length > 2 && (
                  <span className="text-xs font-medium text-slate-500">
                    +{selectedOptions.length - 2} more
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-slate-400">{placeholder}</span>
            )}
          </div>
          <ChevronDown
            size={16}
            className={cn('ml-3 shrink-0 text-slate-400 transition-transform', isOpen && 'rotate-180')}
          />
        </div>

        {isOpen ? (
            <div
              className={cn(
                'absolute left-0 right-0 top-[calc(100%+8px)] z-[1100] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-950/5',
                'transition-all duration-200 ease-out origin-top scale-100 opacity-100 translate-y-0'
              )}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="space-y-2 border-b border-slate-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {selectedOptions.length > 0 ? `${selectedOptions.length} selected` : 'Multi select'}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-600 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                  >
                    Close
                  </button>
                </div>

                {searchable && (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <Search size={15} className="text-slate-400" />
                    <input
                      ref={searchRef}
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') {
                          event.preventDefault();
                          setActiveIndex((current) =>
                            Math.min(current + 1, Math.max(filteredOptions.length - 1, 0))
                          );
                          return;
                        }

                        if (event.key === 'ArrowUp') {
                          event.preventDefault();
                          setActiveIndex((current) => Math.max(current - 1, 0));
                          return;
                        }

                        if (event.key === 'Enter' && filteredOptions[activeIndex]) {
                          event.preventDefault();
                          toggleValue(filteredOptions[activeIndex].value);
                          return;
                        }

                        event.stopPropagation();
                      }}
                      placeholder="Search..."
                      className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </div>
                )}

                {!disabled && filteredOptions.length > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange(filteredOptions.map((opt) => opt.value));
                        setIsOpen(true);
                        window.setTimeout(() => searchRef.current?.focus(), 0);
                      }}
                      className="font-medium text-primary-600 hover:text-primary-700"
                    >
                      Select All
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange([]);
                        setIsOpen(true);
                        window.setTimeout(() => searchRef.current?.focus(), 0);
                      }}
                      className="font-medium text-slate-500 hover:text-slate-700"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto p-2">
                {filteredOptions.length === 0 ? (
                  <div className="rounded-xl px-3 py-8 text-center text-sm text-slate-500">{emptyText}</div>
                ) : (
                  filteredOptions.map((option, index) => {
                    const isSelected = value.includes(option.value);
                    const isActive = index === activeIndex;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={option.disabled}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleValue(option.value);
                        }}
                        className={cn(
                          'flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition',
                          option.disabled
                            ? 'cursor-not-allowed opacity-50'
                            : 'hover:bg-primary-50 focus:bg-primary-50 focus:outline-none',
                          isSelected && 'bg-primary-50',
                          isActive && 'bg-slate-100'
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-700">{option.label}</div>
                          {option.description ? (
                            <div className="mt-0.5 text-xs text-slate-500">{option.description}</div>
                          ) : null}
                        </div>
                        <span
                          className={cn(
                            'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                            isSelected
                              ? 'border-primary-600 bg-primary-600 text-white'
                              : 'border-slate-300 bg-white text-transparent'
                          )}
                        >
                          <Check size={12} />
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
        ) : null}
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {helperText && !error ? <p className="text-xs text-slate-500">{helperText}</p> : null}
    </div>
  );
}

'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import Tooltip from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  variant?: 'default' | 'danger';
  size?: 'sm' | 'md';
}

export default function IconButton({
  label,
  icon,
  variant = 'default',
  size = 'sm',
  className,
  disabled,
  ...props
}: IconButtonProps) {
  const sizeClass = size === 'md' ? 'h-10 w-10' : 'h-8 w-8';
  const variantClass =
    variant === 'danger'
      ? 'text-red-600 hover:bg-red-50 hover:text-red-700 focus:ring-red-200'
      : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700 focus:ring-blue-200';

  return (
    <Tooltip text={label}>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-full border border-transparent bg-white/90 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          sizeClass,
          variantClass,
          className
        )}
        {...props}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

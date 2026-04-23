'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
  index?: number;
}

export default function Toast({ message, type = 'success', onClose, duration = 5000, index = 0 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-800" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />, // 👈 added
  };

  const styles = {
    success: 'bg-green-100 border-green-300',
    error: 'bg-red-100 border-red-300',
    warning: 'bg-yellow-100 border-yellow-300',
    info: 'bg-blue-100 border-blue-300', // 👈 added
  };


  return (
    <div className={cn(
      'fixed left-1/2 z-[9999] flex max-w-md -translate-x-1/2 items-center gap-3 rounded-lg border px-4 py-3 shadow-lg',
      styles[type]
    )} style={{ bottom: `${2.5 + index * 4.5}rem` }}>
      {icons[type]}
      <p className="flex-1 text-sm text-gray-800">{message}</p>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
    </div>
  );
}

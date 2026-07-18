import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastProps extends Toast {
  onClose: (id: string) => void;
}

const toastConfig: Record<ToastType, { bg: string; border: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
  },
  info: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    border: 'border-cyan-200 dark:border-cyan-800',
    icon: <Info className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
  },
};

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  action,
  onClose,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const config = toastConfig[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <div
      className={cn(
        'flex items-start gap-4 px-5 py-4 rounded-lg border backdrop-blur-sm transition-all duration-300 animate-slide-up',
        config.bg,
        config.border,
        isExiting && 'animate-fade-out opacity-0'
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{config.icon}</div>

      <div className="flex-1 min-w-0">
        <h3 className={cn(
          'font-semibold text-sm',
          type === 'success' && 'text-emerald-900 dark:text-emerald-100',
          type === 'error' && 'text-red-900 dark:text-red-100',
          type === 'warning' && 'text-amber-900 dark:text-amber-100',
          type === 'info' && 'text-cyan-900 dark:text-cyan-100',
        )}>
          {title}
        </h3>
        {message && (
          <p className={cn(
            'text-xs mt-1',
            type === 'success' && 'text-emerald-800 dark:text-emerald-200',
            type === 'error' && 'text-red-800 dark:text-red-200',
            type === 'warning' && 'text-amber-800 dark:text-amber-200',
            type === 'info' && 'text-cyan-800 dark:text-cyan-200',
          )}>
            {message}
          </p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              'mt-2 text-xs font-medium underline hover:no-underline',
              type === 'success' && 'text-emerald-700 dark:text-emerald-300',
              type === 'error' && 'text-red-700 dark:text-red-300',
              type === 'warning' && 'text-amber-700 dark:text-amber-300',
              type === 'info' && 'text-cyan-700 dark:text-cyan-300',
            )}
          >
            {action.label}
          </button>
        )}
      </div>

      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onClose(id), 300);
        }}
        className="flex-shrink-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-400 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export { Toast };

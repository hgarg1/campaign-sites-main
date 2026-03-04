'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastItemProps extends Toast {
  onClose: (id: string) => void;
}

function ToastItem({ id, title, message, type, duration = 5000, action, onClose }: ToastItemProps) {
  useEffect(() => {
    if (duration === 0) return;
    
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const typeStyles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: '✅',
      title: 'text-green-900',
      message: 'text-green-700',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: '❌',
      title: 'text-red-900',
      message: 'text-red-700',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'ℹ️',
      title: 'text-blue-900',
      message: 'text-blue-700',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: '⚠️',
      title: 'text-yellow-900',
      message: 'text-yellow-700',
    },
  };

  const style = typeStyles[type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 400, y: 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 400, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${style.bg} border ${style.border} rounded-lg p-4 mb-3 max-w-md`}
    >
      <div className="flex gap-3">
        <span className="text-xl flex-shrink-0">{style.icon}</span>
        <div className="flex-1">
          <p className={`font-semibold ${style.title}`}>{title}</p>
          {message && <p className={`text-sm mt-1 ${style.message}`}>{message}</p>}
          {action && (
            <button
              onClick={() => {
                action.onClick();
                onClose(id);
              }}
              className={`text-sm font-medium mt-2 underline hover:no-underline ${style.message}`}
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onClose(id)}
          className={`text-xl flex-shrink-0 hover:opacity-70 transition-opacity ${style.message}`}
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} {...toast} onClose={onClose} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

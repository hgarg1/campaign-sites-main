'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastContainer } from './Toast';

interface ToastContextType {
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  toast: (toast: Omit<Toast, 'id'>) => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (title: string, message?: string, duration?: number) => {
      addToast({ title, message, type: 'success', duration });
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) => {
      addToast({ title, message, type: 'error', duration: duration ?? 6000 });
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) => {
      addToast({ title, message, type: 'info', duration });
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) => {
      addToast({ title, message, type: 'warning', duration });
    },
    [addToast]
  );

  const toast = useCallback((toastObj: Omit<Toast, 'id'>) => {
    addToast(toastObj);
  }, [addToast]);

  const showToast = useCallback(
    (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string, duration?: number) => {
      switch (type) {
        case 'success':
          success(title, message, duration);
          break;
        case 'error':
          error(title, message, duration);
          break;
        case 'info':
          info(title, message, duration);
          break;
        case 'warning':
          warning(title, message, duration);
          break;
      }
    },
    [success, error, info, warning]
  );

  const value: ToastContextType = { success, error, info, warning, toast, showToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

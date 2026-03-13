'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  icon?: 'warning' | 'info' | 'error' | 'success';
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
  icon = 'warning',
}: ConfirmationModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  const getIconStyles = () => {
    switch (icon) {
      case 'error':
        return {
          bg: 'bg-red-100',
          text: 'text-red-600',
          icon: '⚠️',
        };
      case 'warning':
        return {
          bg: 'bg-amber-100',
          text: 'text-amber-600',
          icon: '⚠️',
        };
      case 'info':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-600',
          icon: 'ℹ️',
        };
      case 'success':
        return {
          bg: 'bg-green-100',
          text: 'text-green-600',
          icon: '✓',
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-600',
          icon: '?',
        };
    }
  };

  const iconStyles = getIconStyles();
  const isLoading_ = isLoading || isConfirming;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onCancel}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Header with gradient */}
              <div
                className={`px-6 pt-6 pb-4 bg-gradient-to-r ${
                  isDangerous
                    ? 'from-red-50 to-orange-50'
                    : 'from-blue-50 to-blue-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                    className={`w-12 h-12 rounded-full ${iconStyles.bg} flex items-center justify-center text-2xl flex-shrink-0`}
                  >
                    {iconStyles.icon}
                  </motion.div>

                  {/* Title */}
                  <div className="flex-1 pt-1">
                    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                  </div>
                </div>
              </div>

              {/* Content */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="px-6 py-4"
              >
                <p className="text-gray-700 leading-relaxed">{message}</p>
              </motion.div>

              {/* Footer with actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end"
              >
                <button
                  onClick={onCancel}
                  disabled={isLoading_}
                  className="px-5 py-2.5 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelText}
                </button>

                <motion.button
                  whileHover={{ scale: isLoading_ ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading_ ? 1 : 0.98 }}
                  onClick={handleConfirm}
                  disabled={isLoading_}
                  className={`px-5 py-2.5 rounded-lg font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDangerous
                      ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 shadow-lg shadow-red-500/20'
                      : 'bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 shadow-lg shadow-blue-500/20'
                  }`}
                >
                  {isLoading_ ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      Processing...
                    </span>
                  ) : (
                    confirmText
                  )}
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

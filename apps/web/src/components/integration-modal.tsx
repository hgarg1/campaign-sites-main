'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  features: string[];
  useCases: string[];
  icon: string;
  setupTime: string;
  documentation?: string;
}

interface IntegrationModalProps {
  integration: Integration | null;
  isOpen: boolean;
  onClose: () => void;
}

export function IntegrationModal({
  integration,
  isOpen,
  onClose,
}: IntegrationModalProps) {
  if (!integration) return null;

  const categoryColors: Record<string, { badge: string; border: string; text: string }> = {
    fundraising: {
      badge: 'bg-green-100 text-green-700',
      border: 'border-green-200',
      text: 'text-green-600',
    },
    crm: {
      badge: 'bg-blue-100 text-blue-700',
      border: 'border-blue-200',
      text: 'text-blue-600',
    },
    analytics: {
      badge: 'bg-purple-100 text-purple-700',
      border: 'border-purple-200',
      text: 'text-purple-600',
    },
    marketing: {
      badge: 'bg-pink-100 text-pink-700',
      border: 'border-pink-200',
      text: 'text-pink-600',
    },
    workflow: {
      badge: 'bg-orange-100 text-orange-700',
      border: 'border-orange-200',
      text: 'text-orange-600',
    },
  };

  const colors = categoryColors[integration.category] || categoryColors.workflow;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative w-full max-w-3xl max-h-[calc(100vh-32px)] rounded-3xl bg-white dark:bg-gray-800 shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-10 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Header Section */}
            <div className={`border-b ${colors.border} bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700/50 p-8 md:p-10`}>
              <div className="flex items-start gap-4">
                <div className="text-4xl">{integration.icon}</div>
                <div className="flex-1">
                  <div className={`inline-block mb-2 px-3 py-1 ${colors.badge} rounded-full text-xs font-semibold`}>
                    {integration.category.charAt(0).toUpperCase() + integration.category.slice(1)}
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {integration.name}
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-300">
                    {integration.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 overflow-y-auto p-8 md:p-10">
              <div className="space-y-8">
                {/* Setup Time */}
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-900/50">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Setup Time</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {integration.setupTime}
                    </p>
                  </div>
                </div>

                {/* Key Features */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Key Features
                  </h3>
                  <ul className="space-y-3">
                    {integration.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3"
                      >
                        <span className={`${colors.text} font-bold text-lg flex-shrink-0 mt-0.5`}>
                          ✓
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Use Cases */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Built For
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {integration.useCases.map((useCase) => (
                      <div
                        key={useCase}
                        className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {useCase}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer with CTA Buttons */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 md:p-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/get-started"
                className={`flex-1 inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold transition-all hover:shadow-xl hover:scale-105 active:scale-95 ${colors.text} border-2 ${colors.border} hover:bg-gray-50 dark:hover:bg-gray-700`}
              >
                Get Started with {integration.name}
              </Link>
              <button
                onClick={onClose}
                className="flex-1 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full px-6 py-3 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

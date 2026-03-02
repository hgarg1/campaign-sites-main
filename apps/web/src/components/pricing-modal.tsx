'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface PricingPlan {
  name: string;
  price: string;
  cadence: string;
  subtitle: string;
  features: string[];
  highlight: boolean;
  details: {
    description: string;
    includes: string[];
    support: string;
    bestFor: string;
  };
}

interface PricingModalProps {
  plan: PricingPlan | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PricingModal({ plan, isOpen, onClose }: PricingModalProps) {
  if (!plan) return null;

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
            className="relative w-full max-w-2xl max-h-[calc(100vh-32px)] rounded-3xl bg-white dark:bg-gray-800 shadow-2xl overflow-hidden flex flex-col"
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12">
              <div className="inline-block mb-4 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
                {plan.name} Plan
              </div>

              <h2 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">{plan.name}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{plan.details.bestFor}</p>

              {/* Pricing */}
              <div className="mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                  <span className="text-gray-600 dark:text-gray-400">{plan.cadence}</span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">{plan.subtitle}</p>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">About this plan</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{plan.details.description}</p>
              </div>

              {/* What's Included */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">What's included</h3>
                <ul className="space-y-3">
                  {plan.details.includes.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-xl flex-shrink-0 mt-0.5">✓</span>
                      <span className="text-gray-700 dark:text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support */}
              <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-900/50">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Support</h3>
                <p className="text-gray-700 dark:text-gray-300">{plan.details.support}</p>
              </div>
            </div>

            {/* Sticky Footer with CTA Buttons */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 md:p-12 flex flex-col sm:flex-row gap-3">
              <Link
                href={plan.name === 'Enterprise' ? '/contact' : '/get-started'}
                className={[
                  'flex-1 inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold transition-all',
                  plan.highlight
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl'
                    : 'bg-blue-600 text-white hover:bg-blue-700',
                ].join(' ')}
              >
                {plan.name === 'Enterprise' ? 'Schedule a Call' : 'Get Started'}
              </Link>
              <button
                onClick={onClose}
                className="flex-1 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full px-6 py-3 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Learn More
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

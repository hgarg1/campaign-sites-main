'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DatePicker } from './DatePicker';

interface DateRangePickerProps {
  label: string;
  onRangeChange?: (startDate: string, endDate: string) => void;
  placeholder?: string;
}

const QUICK_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function formatRange(start: string, end: string): string {
  const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function DateRangePicker({
  label,
  onRangeChange,
  placeholder = 'Select date range',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const displayValue = startDate && endDate ? formatRange(startDate, endDate) : placeholder;

  const handleStartChange = (date: string) => {
    setStartDate(date);
    if (date && endDate) onRangeChange?.(date, endDate);
    // If new start is after current end, clear end
    if (date && endDate && date > endDate) setEndDate('');
  };

  const handleEndChange = (date: string) => {
    setEndDate(date);
    if (startDate && date) onRangeChange?.(startDate, date);
  };

  const handleQuickSelect = (days: number) => {
    const start = offsetDate(days);
    const end = today();
    setStartDate(start);
    setEndDate(end);
    onRangeChange?.(start, end);
    setIsOpen(false);
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    onRangeChange?.('', '');
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-3 py-2 rounded-lg border text-sm text-left flex items-center justify-between gap-2
          bg-white transition-colors
          ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <span className={displayValue === placeholder ? 'text-gray-400' : 'text-gray-900'}>
          {displayValue}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-80"
            onClick={e => e.stopPropagation()}
          >
            {/* Quick select */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {QUICK_RANGES.map(({ label: ql, days }) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handleQuickSelect(days)}
                  className="px-2 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  {ql}
                </button>
              ))}
            </div>

            {/* Date pickers */}
            <div className="space-y-3 mb-4">
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={handleStartChange}
                max={endDate || undefined}
                placeholder="Start date"
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={handleEndChange}
                min={startDate || undefined}
                placeholder="End date"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Done
              </button>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex-1 px-3 py-2 text-sm text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}


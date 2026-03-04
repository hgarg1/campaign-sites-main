'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DateRangePickerProps {
  label: string;
  onRangeChange?: (startDate: string, endDate: string) => void;
  placeholder?: string;
}

export function DateRangePicker({
  label,
  onRangeChange,
  placeholder = 'Select date range',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [displayValue, setDisplayValue] = useState<string>(placeholder);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setStartDate(date);
    updateRange(date, endDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setEndDate(date);
    updateRange(startDate, date);
  };

  const updateRange = (start: string, end: string) => {
    if (start && end) {
      const startFormatted = new Date(start).toLocaleDateString();
      const endFormatted = new Date(end).toLocaleDateString();
      setDisplayValue(`${startFormatted} - ${endFormatted}`);
      onRangeChange?.(start, end);
    }
  };

  const handleQuickSelect = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    setStartDate(startStr);
    setEndDate(endStr);
    updateRange(startStr, endStr);
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    setDisplayValue(placeholder);
    onRangeChange?.('', '');
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-left flex justify-between items-center bg-white hover:border-gray-400"
      >
        <span className={displayValue === placeholder ? 'text-gray-500' : 'text-gray-900'}>
          {displayValue}
        </span>
        <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>📅</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 right-0 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick select buttons */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickSelect(7)}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                Last 7 days
              </button>
              <button
                onClick={() => handleQuickSelect(30)}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                Last 30 days
              </button>
              <button
                onClick={() => handleQuickSelect(90)}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                Last 90 days
              </button>
            </div>

            {/* Date inputs */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                Done
              </button>
              {startDate || endDate ? (
                <button
                  onClick={handleClear}
                  className="flex-1 px-3 py-2 text-sm text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

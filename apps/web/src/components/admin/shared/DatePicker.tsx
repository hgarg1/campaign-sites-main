'use client';

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseDate(str: string): Date | null {
  if (!str) return null;
  const d = new Date(str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function formatDisplay(str: string): string {
  const d = parseDate(str);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export interface DatePickerProps {
  value: string; // YYYY-MM-DD or ''
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  className?: string;
  /** When true, renders just the calendar widget inline (no trigger button) */
  inline?: boolean;
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  min,
  max,
  className = '',
  inline = false,
}: DatePickerProps) {
  const today = new Date();
  const selected = parseDate(value);
  const minDate = parseDate(min ?? '');
  const maxDate = parseDate(max ?? '');

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());
  const [inputText, setInputText] = useState(formatDisplay(value));
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [portalPos, setPortalPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Recalculate portal position whenever opened or on scroll/resize
  const updatePortalPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPortalPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePortalPos();
    window.addEventListener('scroll', updatePortalPos, true);
    window.addEventListener('resize', updatePortalPos);
    return () => {
      window.removeEventListener('scroll', updatePortalPos, true);
      window.removeEventListener('resize', updatePortalPos);
    };
  }, [open, updatePortalPos]);

  // Sync display when value changes externally
  useEffect(() => {
    setInputText(formatDisplay(value));
    if (value) {
      const d = parseDate(value);
      if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
    }
  }, [value]);

  // Close on outside click — check both trigger container and portal
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inPortal = portalRef.current?.contains(target);
      if (!inContainer && !inPortal) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }, [viewMonth]);

  const selectDay = useCallback((day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    const ymd = toYMD(d);
    onChange(ymd);
    setInputText(formatDisplay(ymd));
    setOpen(false);
  }, [viewYear, viewMonth, onChange]);

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };

  const isSelected = (day: number) => {
    if (!selected) return false;
    return selected.getFullYear() === viewYear && selected.getMonth() === viewMonth && selected.getDate() === day;
  };

  const isToday = (day: number) => {
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
  };

  // Build calendar grid
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const calendar = (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 w-72 select-none">
      {/* Month/Year header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {/* Month select */}
          <select
            value={viewMonth}
            onChange={e => setViewMonth(Number(e.target.value))}
            className="text-sm font-semibold text-gray-900 bg-transparent border-none cursor-pointer focus:outline-none focus:ring-0 pr-1"
          >
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          {/* Year select */}
          <select
            value={viewYear}
            onChange={e => setViewYear(Number(e.target.value))}
            className="text-sm font-semibold text-gray-900 bg-transparent border-none cursor-pointer focus:outline-none focus:ring-0"
          >
            {Array.from({ length: 30 }, (_, i) => today.getFullYear() - 10 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
          aria-label="Next month"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const disabled = isDisabled(day);
          const sel = isSelected(day);
          const tod = isToday(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => !disabled && selectDay(day)}
              disabled={disabled}
              className={`
                h-8 w-8 mx-auto rounded-lg text-sm font-medium transition-colors
                ${sel
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : tod
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Today shortcut */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
        <button
          type="button"
          onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); selectDay(today.getDate()); }}
          className="flex-1 text-xs text-blue-600 hover:text-blue-800 font-medium py-1 rounded hover:bg-blue-50 transition-colors"
        >
          Today
        </button>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setInputText(''); }}
            className="flex-1 text-xs text-gray-500 hover:text-red-600 font-medium py-1 rounded hover:bg-red-50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );

  if (inline) return calendar;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`
          w-full px-3 py-2 rounded-lg border text-sm text-left flex items-center justify-between gap-2
          transition-colors bg-white
          ${open
            ? 'border-blue-500 ring-1 ring-blue-500'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value ? inputText : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {open && mounted && portalPos && createPortal(
        <div
          ref={portalRef}
          style={{ position: 'absolute', top: portalPos.top, left: portalPos.left, zIndex: 9999 }}
        >
          {calendar}
        </div>,
        document.body,
      )}
    </div>
  );
}

'use client';

/**
 * The dialog primitive.
 *
 * Every overlay in both portals was previously a bare `div`: no role, no focus
 * management, and no way to dismiss with the keyboard. A screen reader never
 * announced that anything had opened, and Tab walked through the obscured page
 * behind the overlay.
 *
 * Supports a centred modal and a right-hand slide-over, because the codebase
 * had four separate hand-rolled implementations of the latter.
 */

import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional supporting line, announced with the title. */
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** 'center' for a modal, 'right' for a slide-over. */
  side?: 'center' | 'right';
  size?: 'sm' | 'md' | 'lg';
  /** Set false for a destructive flow that should not close on a stray click. */
  dismissOnOverlayClick?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'center',
  size = 'md',
  dismissOnOverlayClick = true,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  // Remember what had focus, so closing returns the user where they were
  // rather than dumping them at the top of the document.
  useEffect(() => {
    if (!open) return;
    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panelRef.current)?.focus();
    return () => restoreFocusTo.current?.focus?.();
  }, [open]);

  // The page behind a modal should not scroll under it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      // Focus trap: cycle within the panel instead of escaping to the page
      // behind, which is invisible to the user but still tabbable.
      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

  const panel =
    side === 'right'
      ? `relative ml-auto h-full w-full ${sizes[size]} bg-white shadow-xl flex flex-col`
      : `relative w-full ${sizes[size]} max-h-[90vh] rounded-xl bg-white shadow-xl flex flex-col`;

  return (
    <div
      className={`fixed inset-0 z-50 flex ${side === 'right' ? '' : 'items-center justify-center p-4'}`}
      onKeyDown={onKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={dismissOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={panel}
      >
        <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-sm text-gray-600">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-m-1 shrink-0 rounded p-1 text-2xl leading-none text-gray-400 hover:text-gray-700"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && <div className="border-t bg-gray-50 px-6 py-3">{footer}</div>}
      </div>
    </div>
  );
}

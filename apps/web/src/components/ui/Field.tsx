'use client';

/**
 * Form field primitives.
 *
 * Roughly nine in ten labels in the codebase sat next to their input without
 * being associated with it, so screen readers announced the control as
 * unlabelled and clicking the label did nothing. These generate the association
 * with `useId`, which makes it impossible to forget.
 */

import { useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FieldShellProps {
  label: string;
  /** Guidance shown under the control, and announced with it. */
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: (ids: { id: string; describedBy: string | undefined }) => ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldShellProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="ml-0.5 text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children({ id, describedBy: describedBy || undefined })}

      {hint && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  hint?: ReactNode;
  error?: string;
};

export function TextField({ label, hint, error, required, ...rest }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy }) => (
        <input
          {...rest}
          id={id}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-lg border px-3 py-2 text-sm ${
            error ? 'border-red-400' : 'border-gray-300'
          }`}
        />
      )}
    </Field>
  );
}

type AreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  mono?: boolean;
};

export function TextAreaField({ label, hint, error, required, mono, ...rest }: AreaProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy }) => (
        <textarea
          {...rest}
          id={id}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-lg border px-3 py-2 text-sm ${mono ? 'font-mono' : ''} ${
            error ? 'border-red-400' : 'border-gray-300'
          }`}
        />
      )}
    </Field>
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
};

export function SelectField({ label, hint, error, required, children, ...rest }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy }) => (
        <select
          {...rest}
          id={id}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-lg border px-3 py-2 text-sm ${
            error ? 'border-red-400' : 'border-gray-300'
          }`}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

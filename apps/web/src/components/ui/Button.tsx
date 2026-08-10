'use client';

/* eslint-disable react/button-has-type --
   This is the wrapper that makes the rule enforceable everywhere else: `type`
   is a required prop, so every call site must choose. The rule wants a literal,
   which a wrapper cannot provide by construction. */

/**
 * Button primitive.
 *
 * `type` is required rather than optional. An HTML button inside a form submits
 * by default, so incidental buttons — "split evenly", "remove row", a toggle —
 * were firing form submissions on click and on Enter. Making the prop required
 * means the decision has to be made rather than inherited.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Required on purpose — see the note above. */
  type: 'button' | 'submit' | 'reset';
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

/*
 * `primary` follows the tenant's colour, everything else does not.
 *
 * A themed portal that renders platform blue on its main action reads as a
 * half-finished white-label. `danger` deliberately stays red — a destructive
 * action must not be recoloured into a party's own palette, where a Republican
 * tenant's "Delete" would be indistinguishable from its "Save".
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-brand-fg hover:bg-brand-hover disabled:opacity-50 disabled:hover:bg-brand',
  secondary: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  ghost: 'text-gray-600 hover:bg-gray-100',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

export function Button({
  type,
  variant = 'secondary',
  size = 'md',
  loading,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-fast ease-enter disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}

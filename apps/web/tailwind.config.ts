import type { Config } from 'tailwindcss';

/**
 * Design tokens.
 *
 * `theme.extend` was empty, so every colour, duration and elevation decision was
 * made independently at ~5,000 call sites. The measurable results: 11 distinct
 * animation durations, four competing corner radii, no elevation ladder, and a
 * white-label theme that reached two components while 39 `bg-blue-600` buttons
 * stayed blue for a Republican tenant.
 *
 * Tokens here are additive — nothing existing changes meaning. They give new and
 * migrated code one place to agree with.
 */

/**
 * `darkMode: 'class'` is deliberate and load-bearing.
 *
 * Tailwind's default is 'media', which compiled `body { dark:bg-gray-950 }` into
 * an unconditional `@media (prefers-color-scheme: dark)` rule. Every visitor on a
 * dark OS got a near-black page behind the admin and tenant portals, neither of
 * which has a single `dark:` variant — and `layout.tsx`'s theme script toggled a
 * `.dark` class that matched nothing, so it could not be overridden.
 *
 * Switching to 'class' makes that script live and makes dark mode opt-in.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /**
         * The tenant's own colour, not ours.
         *
         * Bound to the `--t-*` custom properties that `buildCssVars()` already
         * writes onto the portal shell, with the platform blue as the fallback
         * so these classes are safe on pages that never set a tenant theme.
         * `bg-brand` is what `bg-blue-600` should have been.
         */
        brand: {
          DEFAULT: 'var(--t-primary, #2563eb)',
          fg: 'var(--t-primary-fg, #ffffff)',
          hover: 'var(--t-primary-hover, #1d4ed8)',
          ring: 'var(--t-primary-ring, #93c5fd)',
          soft: 'var(--t-accent, #93c5fd)',
          secondary: 'var(--t-secondary, #7c3aed)',
          /*
           * The tint ramp, numbered to match the Tailwind palette it replaces:
           * `bg-blue-50` becomes `bg-brand-50` and keeps reading the same way.
           * Fallbacks are the platform blues, so these are safe on untenanted
           * surfaces.
           */
          50: 'var(--t-primary-50, #eff6ff)',
          100: 'var(--t-primary-100, #dbeafe)',
          200: 'var(--t-primary-200, #bfdbfe)',
          300: 'var(--t-primary-300, #93c5fd)',
          600: 'var(--t-primary, #2563eb)',
          700: 'var(--t-primary-hover, #1d4ed8)',
          800: 'var(--t-primary-800, #1e40af)',
          900: 'var(--t-primary-900, #1e3a8a)',
        },
      },

      /**
       * The rungs the scale was missing.
       *
       * `text-sm` and `text-xs` carry 1,836 of the 2,440 sizing utilities in the
       * app — 75% of all typography sits at 12 or 14px, and `text-base` appears
       * 13 times. Dense is the right call for an operator tool, but a scale with
       * no middle cannot express hierarchy inside a card: heading, value and
       * caption all land on `text-sm`, separated only by weight and colour.
       *
       * These are additive. `xs` and `sm` keep their sizes — redefining either
       * would move 1,836 call sites at once — and gain tracking, which is what
       * separates dense from cramped at those sizes. `2xs` and `md` fill the gaps
       * above and below.
       */
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }], // 11px
        xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }], // 12px
        sm: ['0.875rem', { lineHeight: '1.35rem', letterSpacing: '0.005em' }], // 14px
        md: ['0.9375rem', { lineHeight: '1.45rem' }], // 15px — the missing step
      },

      /**
       * One elevation ladder instead of four unrelated shadows.
       *
       * Each step is a tight ambient shadow plus a softer diffuse one, so cards
       * read as lifted rather than outlined. `raised` is the resting state for a
       * card, `overlay` for a popover, `modal` for a dialog — the name says where
       * it belongs, which `shadow-xl` never did.
       */
      boxShadow: {
        raised: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        floating: '0 2px 4px -1px rgb(15 23 42 / 0.05), 0 6px 16px -4px rgb(15 23 42 / 0.10)',
        overlay: '0 4px 8px -2px rgb(15 23 42 / 0.06), 0 16px 32px -8px rgb(15 23 42 / 0.14)',
        modal: '0 8px 16px -4px rgb(15 23 42 / 0.08), 0 32px 64px -16px rgb(15 23 42 / 0.20)',
      },

      /**
       * Three durations, chosen by distance travelled.
       *
       * A colour swap and a full-screen dialog were both running at 300ms. Short
       * moves should finish before they are noticed; long ones need time to be
       * followed.
       */
      transitionDuration: {
        fast: '120ms', // hover, focus, colour — imperceptible by design
        base: '200ms', // the default for anything that moves a small distance
        slow: '320ms', // dialogs, drawers, anything crossing the viewport
      },

      /**
       * Two curves with opposite jobs.
       *
       * `enter` decelerates into place; `exit` accelerates away. `emphasis`
       * overshoots slightly and is reserved for a state change worth noticing —
       * a proposal resolving, not a dropdown opening.
       */
      transitionTimingFunction: {
        /*
         * Overriding DEFAULT is what gives the app one feel without touching
         * ~370 call sites: every `transition-*` utility that does not name a
         * curve inherits this one. Tailwind's own default is a symmetric
         * ease-in-out, which makes short UI moves feel sluggish at the start.
         */
        DEFAULT: 'cubic-bezier(0.16, 1, 0.3, 1)',
        enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
        emphasis: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        /** Sweeps a highlight across a skeleton — calmer than a pulsing block. */
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },

      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-up': 'fade-in-up 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 320ms cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};

export default config;

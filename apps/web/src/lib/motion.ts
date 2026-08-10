/**
 * The motion vocabulary.
 *
 * 95 files import framer-motion. Across 128 duration declarations there were
 * eleven distinct values and only twelve explicit easing curves — so roughly
 * ninety per cent of the app's motion ran on whatever the library defaulted to,
 * and a hover tint took as long as a full-screen panel. The entrance gesture had
 * three different distances (`y: 20` 66 times, `y: 10` 34 times, plus x-axis and
 * scale variants) for what is conceptually one move.
 *
 * These constants mirror the Tailwind tokens exactly, so a CSS transition and a
 * framer animation on the same element agree.
 */

/** Decelerates into place. The default for anything arriving. */
export const EASE_ENTER = [0.16, 1, 0.3, 1] as const;

/** Accelerates away. For anything leaving. */
export const EASE_EXIT = [0.4, 0, 1, 1] as const;

/**
 * Overshoots slightly. Reserved for a state change worth noticing — a proposal
 * resolving — not for a dropdown opening. Spend it once per screen at most.
 */
export const EASE_EMPHASIS = [0.34, 1.4, 0.64, 1] as const;

/** Chosen by distance travelled, not by taste. */
export const DURATION = {
  /** Hover, focus, colour. Should finish before it is noticed. */
  fast: 0.12,
  /** The default: anything moving a short distance. */
  base: 0.2,
  /** Dialogs, drawers, anything crossing the viewport. */
  slow: 0.32,
} as const;

export const TRANSITION = {
  fast: { duration: DURATION.fast, ease: EASE_ENTER },
  base: { duration: DURATION.base, ease: EASE_ENTER },
  slow: { duration: DURATION.slow, ease: EASE_ENTER },
  exit: { duration: DURATION.base, ease: EASE_EXIT },
  emphasis: { duration: DURATION.slow, ease: EASE_EMPHASIS },
} as const;

/**
 * One entrance gesture. 8px, not 20 — a large offset reads as the element
 * flying in, which is only appropriate when it genuinely came from somewhere.
 */
export const fadeInUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: TRANSITION.base,
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: TRANSITION.base,
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.97 },
  transition: TRANSITION.base,
};

export const slideInRight = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
  transition: TRANSITION.slow,
};

/**
 * Stagger for a list that appears as a unit.
 *
 * Per-item `delay: index * 0.05` was written out by hand in several places,
 * which unbounded the total: a 20-row list took a full second to finish
 * arriving. `staggerChildren` with a cap keeps the whole list under ~300ms.
 */
export function staggerContainer(childCount: number) {
  return {
    initial: 'hidden',
    animate: 'visible',
    variants: {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: Math.min(0.04, 0.3 / Math.max(childCount, 1)),
        },
      },
    },
  };
}

export const staggerItem = {
  variants: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: TRANSITION.base },
  },
};

'use client';

/**
 * Gives the whole tree one motion character, and makes reduced-motion actually
 * work.
 *
 * Two problems this solves at the root rather than at 95 call sites.
 *
 * First, easing. Only 12 of 128 framer transitions specified a curve, so almost
 * all of the app's motion ran on the library default. `MotionConfig`'s
 * `transition` is inherited by every descendant that does not override it, so
 * setting the enter curve here gives everything the same feel without touching
 * the components.
 *
 * Second — and this is the real defect — `prefers-reduced-motion` was handled
 * only in CSS. globals.css collapses `animation-duration` and
 * `transition-duration`, which does nothing to framer-motion: it animates by
 * writing inline styles frame by frame from JavaScript, so all 95 files ignored
 * the preference entirely. `reducedMotion="user"` makes framer honour it,
 * disabling transform and layout animation while keeping opacity changes, so
 * content still appears rather than being hidden.
 */

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';
import { EASE_ENTER, DURATION } from '@/lib/motion';

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: DURATION.base, ease: EASE_ENTER }}
    >
      {children}
    </MotionConfig>
  );
}

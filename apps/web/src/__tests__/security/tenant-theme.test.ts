/**
 * The white-label palette has to stay legible for a colour we did not choose.
 *
 * A tenant supplies its own primary via branding JSON, and every themed control
 * paints text on top of it. A fixed white label passes on Democrat navy and
 * fails on a pale accent, so the foreground is derived rather than assumed.
 */

import {
  PARTY_THEMES,
  DEFAULT_THEME,
  buildCssVars,
  mergeTheme,
  readableForeground,
  shade,
} from '@/lib/tenant-theme';

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('readableForeground', () => {
  it('picks white on dark grounds and near-black on light ones', () => {
    expect(readableForeground('#1d4ed8')).toBe('#ffffff');
    expect(readableForeground('#fcd34d')).toBe('#111827');
  });

  it('clears WCAG AA (4.5:1) for every party primary', () => {
    for (const [party, theme] of Object.entries(PARTY_THEMES)) {
      const primary = theme.primaryColor!;
      const fg = readableForeground(primary);
      // Guards the actual failure: a button label that cannot be read at all.
      expect({ party, ratio: contrastRatio(primary, fg) }).toEqual({
        party,
        ratio: expect.any(Number),
      });
      expect(contrastRatio(primary, fg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('falls back to white rather than throwing on an unparseable colour', () => {
    // Branding JSON is tenant-supplied, so it can contain anything.
    expect(readableForeground('rebeccapurple')).toBe('#ffffff');
    expect(readableForeground('')).toBe('#ffffff');
  });

  it('accepts three-digit hex', () => {
    expect(readableForeground('#fff')).toBe('#111827');
    expect(readableForeground('#000')).toBe('#ffffff');
  });
});

describe('shade', () => {
  it('darkens toward black below 1 and lightens toward white above', () => {
    expect(luminance(shade('#2563eb', 0.86))).toBeLessThan(luminance('#2563eb'));
    expect(luminance(shade('#2563eb', 1.55))).toBeGreaterThan(luminance('#2563eb'));
  });

  it('never leaves the 0-255 range', () => {
    expect(shade('#ffffff', 1.9)).toBe('#ffffff');
    expect(shade('#000000', 0.1)).toBe('#000000');
  });

  it('returns the input unchanged when it cannot be parsed', () => {
    expect(shade('not-a-colour', 0.5)).toBe('not-a-colour');
  });
});

describe('buildCssVars', () => {
  it('emits the derived variables the brand utilities bind to', () => {
    const vars = buildCssVars(DEFAULT_THEME);
    // bg-brand / text-brand-fg / hover:bg-brand-hover resolve through these.
    expect(vars['--t-primary']).toBe('#2563eb');
    expect(vars['--t-primary-fg']).toBe('#ffffff');
    expect(vars['--t-primary-hover']).not.toBe(vars['--t-primary']);
    expect(vars['--t-primary-ring']).not.toBe(vars['--t-primary']);
  });

  it('derives the foreground from the tenant override, not the default', () => {
    const amber = mergeTheme(DEFAULT_THEME, PARTY_THEMES.LIBERTARIAN);
    const vars = buildCssVars(mergeTheme(amber, { primaryColor: '#fcd34d' }));
    expect(vars['--t-primary-fg']).toBe('#111827');
  });
});

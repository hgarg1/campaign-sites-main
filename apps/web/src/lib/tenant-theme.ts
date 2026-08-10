export interface TenantTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarFrom: string;
  sidebarTo: string;
  topbarBg: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

export const DEFAULT_THEME: TenantTheme = {
  primaryColor: '#2563eb',
  secondaryColor: '#7c3aed',
  accentColor: '#93c5fd',
  sidebarFrom: '#0f172a',
  sidebarTo: '#1e293b',
  topbarBg: '#ffffff',
  logoUrl: null,
  faviconUrl: null,
};

export const PARTY_THEMES: Record<string, Partial<TenantTheme>> = {
  REPUBLICAN:  { primaryColor: '#dc2626', secondaryColor: '#ef4444', accentColor: '#fca5a5', sidebarFrom: '#7f1d1d', sidebarTo: '#991b1b' },
  DEMOCRAT:    { primaryColor: '#1d4ed8', secondaryColor: '#2563eb', accentColor: '#93c5fd', sidebarFrom: '#1e3a8a', sidebarTo: '#1d4ed8' },
  LIBERTARIAN: { primaryColor: '#b45309', secondaryColor: '#d97706', accentColor: '#fcd34d', sidebarFrom: '#78350f', sidebarTo: '#92400e' },
  GREEN:       { primaryColor: '#15803d', secondaryColor: '#16a34a', accentColor: '#86efac', sidebarFrom: '#14532d', sidebarTo: '#166534' },
  INDEPENDENT: { primaryColor: '#475569', secondaryColor: '#64748b', accentColor: '#cbd5e1', sidebarFrom: '#1e293b', sidebarTo: '#334155' },
  NONPARTISAN: { primaryColor: '#1e40af', secondaryColor: '#3b82f6', accentColor: '#bfdbfe', sidebarFrom: '#0f172a', sidebarTo: '#1e3a8a' },
  OTHER:       { primaryColor: '#7c3aed', secondaryColor: '#8b5cf6', accentColor: '#ddd6fe', sidebarFrom: '#4c1d95', sidebarTo: '#5b21b6' },
};

/** Merge partial theme onto base, skipping null/undefined/empty string values */
export function mergeTheme(base: TenantTheme, override?: Partial<TenantTheme> | null): TenantTheme {
  if (!override) return base;
  const result = { ...base };
  for (const key of Object.keys(override) as Array<keyof TenantTheme>) {
    const val = override[key];
    if (val !== null && val !== undefined && val !== '') {
      (result as any)[key] = val;
    }
  }
  return result;
}

/** Extract theme fields from a branding JSON object */
export function themeFromBranding(branding: Record<string, any> | null | undefined): Partial<TenantTheme> {
  if (!branding) return {};
  const result: Partial<TenantTheme> = {};
  const fields: Array<keyof TenantTheme> = [
    'primaryColor', 'secondaryColor', 'accentColor',
    'sidebarFrom', 'sidebarTo', 'topbarBg',
    'logoUrl', 'faviconUrl',
  ];
  for (const field of fields) {
    const val = branding[field];
    if (val !== undefined) {
      (result as any)[field] = val;
    }
  }
  return result;
}

/** Parse `#rgb` or `#rrggbb` into channels. Returns null for anything else. */
function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1];
  const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

/**
 * Relative luminance, per WCAG 2.1.
 *
 * Needed because a tenant may pick any primary colour. Libertarian amber
 * (#b45309) and Green (#15803d) sit far enough apart that a fixed white label
 * fails contrast on one of them — the text colour has to follow the background.
 */
function luminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** White or near-black, whichever has more contrast against `hex`. */
export function readableForeground(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return '#ffffff';
  // 0.179 is the luminance at which white and #111827 contrast equally.
  return luminance(rgb) > 0.179 ? '#111827' : '#ffffff';
}

/** Scale each channel toward black (`amount` < 1) or white (> 1). */
export function shade(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const adjust = (c: number) => (amount <= 1 ? c * amount : c + (255 - c) * (amount - 1));
  return `#${toHex(adjust(rgb[0]))}${toHex(adjust(rgb[1]))}${toHex(adjust(rgb[2]))}`;
}

/**
 * Convert a TenantTheme into CSS custom property key-value pairs.
 *
 * The derived entries (`-fg`, `-hover`, `-ring`) exist so a component can render
 * a themed button without knowing anything about the tenant's palette. Without
 * them every call site would have to hardcode `bg-blue-600 hover:bg-blue-700`,
 * which is exactly why 39 primary buttons in the tenant portal stayed platform
 * blue while the sidebar beside them turned red.
 */
export function buildCssVars(theme: TenantTheme): Record<string, string> {
  return {
    '--t-primary': theme.primaryColor,
    '--t-primary-fg': readableForeground(theme.primaryColor),
    '--t-primary-hover': shade(theme.primaryColor, 0.86),
    '--t-primary-ring': shade(theme.primaryColor, 1.55),
    '--t-secondary': theme.secondaryColor,
    '--t-accent': theme.accentColor,
    '--t-sidebar-from': theme.sidebarFrom,
    '--t-sidebar-to': theme.sidebarTo,
    '--t-topbar-bg': theme.topbarBg,
  };
}

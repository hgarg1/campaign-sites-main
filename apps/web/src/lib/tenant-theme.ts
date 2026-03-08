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

/** Convert a TenantTheme into CSS custom property key-value pairs */
export function buildCssVars(theme: TenantTheme): Record<string, string> {
  return {
    '--t-primary': theme.primaryColor,
    '--t-secondary': theme.secondaryColor,
    '--t-accent': theme.accentColor,
    '--t-sidebar-from': theme.sidebarFrom,
    '--t-sidebar-to': theme.sidebarTo,
    '--t-topbar-bg': theme.topbarBg,
  };
}

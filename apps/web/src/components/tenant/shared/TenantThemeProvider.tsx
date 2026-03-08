'use client';

import { useEffect } from 'react';
import { DEFAULT_THEME, buildCssVars, TenantTheme } from '@/lib/tenant-theme';

interface Props {
  orgId: string;
  initialTheme?: TenantTheme | null;
}

export function TenantThemeProvider({ orgId, initialTheme }: Props) {
  useEffect(() => {
    const applyTheme = (theme: TenantTheme) => {
      const vars = buildCssVars(theme);
      Object.entries(vars).forEach(([k, v]) => {
        document.documentElement.style.setProperty(k, v);
      });
    };

    if (initialTheme) applyTheme(initialTheme);

    fetch(`/api/tenant/${orgId}/effective-theme`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.theme) applyTheme(data.theme); })
      .catch(() => { if (!initialTheme) applyTheme(DEFAULT_THEME); });

    return () => {
      const vars = buildCssVars(DEFAULT_THEME);
      Object.entries(vars).forEach(([k, v]) => {
        document.documentElement.style.setProperty(k, v);
      });
    };
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

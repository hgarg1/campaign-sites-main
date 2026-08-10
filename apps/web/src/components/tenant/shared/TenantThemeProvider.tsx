'use client';

import { useEffect } from 'react';
import { DEFAULT_THEME, buildCssVars, TenantTheme } from '@/lib/tenant-theme';

interface Props {
  orgId: string;
  initialTheme?: TenantTheme | null;
}

export function TenantThemeProvider({ orgId, initialTheme }: Props) {
  useEffect(() => {
    /*
     * Write to the server-rendered theme wrapper when there is one.
     *
     * `app/tenant/[id]/layout.tsx` now emits these variables during render so the
     * first paint is already themed, on an element that sits *below* `html`.
     * Custom properties resolve from the nearest ancestor that defines them, so
     * continuing to write to `documentElement` here would have been silently
     * overridden by that wrapper — live branding previews would have stopped
     * updating. Falling back to the root keeps this working on any surface that
     * mounts the provider without the wrapper.
     */
    const target =
      document.querySelector<HTMLElement>('[data-tenant-theme]') ?? document.documentElement;

    const applyTheme = (theme: TenantTheme) => {
      const vars = buildCssVars(theme);
      Object.entries(vars).forEach(([k, v]) => {
        target.style.setProperty(k, v);
      });
    };

    if (initialTheme) applyTheme(initialTheme);

    fetch(`/api/tenant/${orgId}/effective-theme`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.theme) applyTheme(data.theme); })
      .catch(() => { if (!initialTheme) applyTheme(DEFAULT_THEME); });

    return () => {
      // Reset the root specifically: leaving a tenant must not carry its colour
      // into the admin portal, and the wrapper is unmounting with us anyway.
      const vars = buildCssVars(DEFAULT_THEME);
      Object.entries(vars).forEach(([k, v]) => {
        document.documentElement.style.setProperty(k, v);
      });
    };
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

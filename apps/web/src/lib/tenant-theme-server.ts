import { prisma } from '@/lib/database';
import {
  DEFAULT_THEME,
  PARTY_THEMES,
  TenantTheme,
  buildCssVars,
  mergeTheme,
  themeFromBranding,
} from '@/lib/tenant-theme';

/**
 * Resolve a tenant's effective theme on the server.
 *
 * Extracted from the `effective-theme` route so the tenant layout can resolve it
 * during render rather than after hydration. `TenantThemeProvider` applies the
 * variables in a `useEffect`, which was tolerable when two components read them
 * and is not now that ~300 utilities do: a Republican tenant would paint the
 * whole portal platform-blue on first frame and then flip to red once the fetch
 * landed. The provider still runs — it picks up branding changes without a
 * reload — but it no longer owns the first paint.
 */
export async function resolveEffectiveTheme(orgId: string): Promise<TenantTheme> {
  type OrgRow = {
    id: string;
    partyAffiliation: string | null;
    branding: unknown;
    parentId: string | null;
  };

  const chain: Array<{ partyAffiliation: string | null; branding: unknown }> = [];

  let currentId: string | null = orgId;
  let depth = 0;
  // Depth-capped walk, matching the route it was extracted from.
  while (currentId && depth <= 5) {
    const row: OrgRow | null = (await prisma.organization.findUnique({
      where: { id: currentId },
      select: { id: true, partyAffiliation: true, branding: true, parentId: true },
    })) as OrgRow | null;
    if (!row) break;
    chain.unshift({ partyAffiliation: row.partyAffiliation, branding: row.branding });
    currentId = row.parentId ?? null;
    depth++;
  }

  // Party comes from the root of the chain; branding is layered root-first so a
  // child's own branding wins over anything it inherits.
  let theme: TenantTheme = { ...DEFAULT_THEME };
  const rootParty = chain[0]?.partyAffiliation ?? null;
  if (rootParty && PARTY_THEMES[rootParty]) {
    theme = mergeTheme(theme, PARTY_THEMES[rootParty]);
  }
  for (const level of chain) {
    theme = mergeTheme(theme, themeFromBranding(level.branding as Record<string, unknown> | null));
  }

  return theme;
}

/**
 * The same variables as `buildCssVars`, shaped for a React `style` prop so they
 * can be attached to the server-rendered shell.
 */
export function themeStyle(theme: TenantTheme): React.CSSProperties {
  return buildCssVars(theme) as unknown as React.CSSProperties;
}

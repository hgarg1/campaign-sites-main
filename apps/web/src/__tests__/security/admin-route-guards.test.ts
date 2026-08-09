/**
 * Structural guard against the class of bug that left /api/admin/[...slug]
 * fully unauthenticated: a route handler that ships without an authorization
 * check. This is a static check over the route tree rather than a request test,
 * so it needs no server or database and cannot be skipped by a slow CI.
 */

import * as fs from 'fs';
import * as path from 'path';

const ADMIN_API_DIR = path.join(process.cwd(), 'src/app/api/admin');
const TENANT_API_DIR = path.join(process.cwd(), 'src/app/api/tenant');

/**
 * Self-service routes act on the caller's own resources, so they require a
 * session but deliberately not an admin claim.
 */
const SELF_SERVICE = [path.join('passkeys', 'me')];

const HANDLER = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;

function findRoutes(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findRoutes(full);
    return entry.name === 'route.ts' ? [full] : [];
  });
}

describe('admin API route guards', () => {
  const routes = findRoutes(ADMIN_API_DIR);

  it('finds admin routes to check', () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  it.each(routes.map((r) => [path.relative(ADMIN_API_DIR, r), r]))(
    '%s enforces a permission claim',
    (rel, full) => {
      const source = fs.readFileSync(full, 'utf-8');
      if (SELF_SERVICE.some((s) => (rel as string).startsWith(s))) return;

      const handlers = [...source.matchAll(HANDLER)].map((m) => m[1]);
      expect(handlers.length).toBeGreaterThan(0);

      const guarded =
        source.includes('requireAdmin') ||
        source.includes('requireAdminForSlug') ||
        source.includes('hasSystemAdminPermission') ||
        source.includes('hasSystemAdminAnyPermission');

      expect(guarded).toBe(true);
    }
  );

  it('has no route that reads the forgeable userRole cookie for authorization', () => {
    for (const route of routes) {
      const source = fs.readFileSync(route, 'utf-8');
      expect(source).not.toMatch(/cookies\(\)[\s\S]{0,80}get\(['"]userRole['"]\)/);
    }
  });
});

describe('tenant API route guards', () => {
  const routes = findRoutes(TENANT_API_DIR);

  it.each(routes.map((r) => [path.relative(TENANT_API_DIR, r), r]))(
    '%s checks org access',
    (_rel, full) => {
      const source = fs.readFileSync(full, 'utf-8');
      const handlers = [...source.matchAll(HANDLER)].map((m) => m[1]);
      if (handlers.length === 0) return;

      expect(source).toMatch(/getAuthUserId|parseAndVerifySessionToken/);
      expect(source).toMatch(
        /verifyOrgAccess|verifyOrgAdmin|verifyOrgOwner|verifyOrgMember|verifyDescendantAccess/
      );
    }
  );
});

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
 * session but deliberately not an admin claim. `permissions/route.ts` returns
 * only the calling admin's own resolved claims.
 */
const SELF_SERVICE = [path.join('passkeys', 'me'), path.join('permissions', 'route.ts')];

const HANDLER = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;

const GUARD =
  /requireAdmin|requireAdminForSlug|hasSystemAdminPermission|hasSystemAdminAnyPermission/;

/**
 * Splits a route module into one slice per exported handler.
 *
 * Checking guards per FILE rather than per HANDLER is what let an
 * unauthenticated `GET /api/admin/users` ship: the file's POST was guarded, so
 * a file-level search found a match and the GET went unnoticed.
 */
function handlerSlices(source: string): Array<{ method: string; body: string }> {
  const marks = [...source.matchAll(HANDLER)].map((m) => ({
    index: m.index ?? 0,
    method: m[1],
  }));
  return marks.map((mark, i) => ({
    method: mark.method,
    body: source.slice(mark.index, marks[i + 1]?.index ?? source.length),
  }));
}

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
    'every handler in %s enforces a permission claim',
    (rel, full) => {
      const source = fs.readFileSync(full, 'utf-8');
      if (SELF_SERVICE.some((s) => (rel as string).startsWith(s))) return;

      const slices = handlerSlices(source);
      expect(slices.length).toBeGreaterThan(0);

      const unguarded = slices.filter((s) => !GUARD.test(s.body)).map((s) => s.method);
      expect(unguarded).toEqual([]);
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

/**
 * Audit logging for system admin and tenant admin actions
 */

import { prisma } from './database';

export interface AuditLogEntry {
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  changes?: Record<string, any>;
  justification?: string;
  performedBy?: string;
  performedAt?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
}

/**
 * Log a system admin action directly to the database
 * This is the primary method for logging all admin actions
 */
export async function logSystemAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.systemAdminAuditLog.create({
      data: {
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        resourceName: entry.resourceName || undefined,
        changes: entry.changes || undefined,
        justification: entry.justification || undefined,
        performedBy: entry.performedBy || 'system',
        performedAt: entry.performedAt ? new Date(entry.performedAt) : new Date(),
        status: entry.status,
        errorMessage: entry.errorMessage || undefined,
      },
    });
  } catch (error) {
    console.error('Failed to log system admin action to database:', error);
    // Don't throw - logging failures should not break the main operation
  }
}

// Tenant-side actions are recorded by `writeAuditLog` in
// apps/web/src/app/api/tenant/auth-utils.ts, which writes to the database
// directly. A previous `logTenantAdminAction` helper here issued a relative
// fetch to this app's own API from server code — which always throws, since
// server-side fetch requires an absolute URL — and had no callers.

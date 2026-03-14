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

/**
 * Log a tenant admin action
 */
export async function logTenantAdminAction(entry: AuditLogEntry, orgId: string): Promise<void> {
  try {
    await fetch(`/api/admin/organizations/${orgId}/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch (error) {
    console.error('Failed to log tenant admin action:', error);
  }
}

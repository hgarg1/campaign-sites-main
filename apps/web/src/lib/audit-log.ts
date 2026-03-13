/**
 * Audit logging for system admin and tenant admin actions
 */

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
 * Log a system admin action
 */
export async function logSystemAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    await fetch('/api/admin/audit-logs/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch (error) {
    console.error('Failed to log system admin action:', error);
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

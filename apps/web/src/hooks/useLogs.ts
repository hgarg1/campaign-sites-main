import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/admin/shared/ToastContext';

// Types
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
export type LogSource = 'auth' | 'api' | 'database' | 'worker' | 'startup' | 'other';
export type ActionType = 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'suspend' | 'restore' | 'login' | 'logout' | 'config_change';
export type ResourceType = 'user' | 'organization' | 'website' | 'setting' | 'api_key' | 'webhook' | 'integration';

export interface ApplicationLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: LogSource;
  message: string;
  stackTrace?: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminId: string;
  adminEmail: string;
  action: ActionType;
  resourceType: ResourceType;
  resourceId?: string;
  resourceName?: string;
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  ipAddress: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
}

export interface LogFilters {
  levels: LogLevel[];
  sources: LogSource[];
  startDate: string;
  endDate: string;
  searchQuery: string;
  requestId?: string;
  userId?: string;
}

export interface AuditFilters {
  actions: ActionType[];
  resourceTypes: ResourceType[];
  startDate: string;
  endDate: string;
  searchQuery: string;
  adminEmail?: string;
  resourceId?: string;
}

export interface ExportOptions {
  format: 'csv' | 'json';
  startDate: string;
  endDate: string;
  includeStackTraces: boolean;
  filters: LogFilters;
}

// Application Logs Hook
export function useLogs(initialFilters?: Partial<LogFilters>) {
  const [logs, setLogs] = useState<ApplicationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LogFilters>({
    levels: [],
    sources: [],
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    searchQuery: '',
    ...initialFilters,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const { error: showError } = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.levels.length > 0) params.append('levels', filters.levels.join(','));
      if (filters.sources.length > 0) params.append('sources', filters.sources.join(','));
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.searchQuery) params.append('q', filters.searchQuery);
      if (filters.requestId) params.append('requestId', filters.requestId);
      if (filters.userId) params.append('userId', filters.userId);
      params.append('page', page.toString());

      const response = await fetch(`/api/admin/logs/application?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      setLogs(data.logs || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      showError('Error', `Failed to load logs: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [filters, page, showError]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const updateFilters = useCallback((newFilters: Partial<LogFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  }, []);

  const exportLogs = useCallback(async (options: ExportOptions) => {
    try {
      const response = await fetch('/api/admin/logs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      if (!response.ok) throw new Error('Failed to export logs');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${new Date().toISOString().split('T')[0]}.${options.format}`;
      a.click();
      window.URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError('Error', `Failed to export logs: ${message}`);
      return false;
    }
  }, [showError]);

  return {
    logs,
    loading,
    error,
    filters,
    totalCount,
    page,
    updateFilters,
    setPage,
    refetch: fetchLogs,
    exportLogs,
  };
}

// Audit Trail Hook
export function useAuditTrail(initialFilters?: Partial<AuditFilters>) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditFilters>({
    actions: [],
    resourceTypes: [],
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    searchQuery: '',
    ...initialFilters,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const { error: showError } = useToast();

  const fetchAuditTrail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.actions.length > 0) params.append('actions', filters.actions.join(','));
      if (filters.resourceTypes.length > 0) params.append('resourceTypes', filters.resourceTypes.join(','));
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.searchQuery) params.append('q', filters.searchQuery);
      if (filters.adminEmail) params.append('adminEmail', filters.adminEmail);
      if (filters.resourceId) params.append('resourceId', filters.resourceId);
      params.append('page', page.toString());

      const response = await fetch(`/api/admin/logs/audit-trail?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch audit trail');
      const data = await response.json();
      setEntries(data.entries || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      showError('Error', `Failed to load audit trail: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [filters, page, showError]);

  useEffect(() => {
    fetchAuditTrail();
  }, [fetchAuditTrail]);

  const updateFilters = useCallback((newFilters: Partial<AuditFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  }, []);

  const exportAuditTrail = useCallback(async (format: 'csv' | 'json' = 'csv') => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (filters.actions.length > 0) params.append('actions', filters.actions.join(','));
      if (filters.resourceTypes.length > 0) params.append('resourceTypes', filters.resourceTypes.join(','));
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/admin/logs/audit-trail/export?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to export audit trail');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError('Error', `Failed to export audit trail: ${message}`);
      return false;
    }
  }, [filters, showError]);

  return {
    entries,
    loading,
    error,
    filters,
    totalCount,
    page,
    updateFilters,
    setPage,
    refetch: fetchAuditTrail,
    exportAuditTrail,
  };
}

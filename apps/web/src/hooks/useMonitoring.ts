'use client';

import { useEffect, useState, useCallback } from 'react';

export interface ServiceStatus {
  name: string;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  uptime: number; // percentage
  latency: number | null; // milliseconds
  load: number; // percentage
  lastChecked: string;
  message?: string;
}

export interface SystemMetrics {
  timestamp: string;
  cpu: number; // percentage
  memory: number; // percentage
  diskIO: number; // MB/s
  networkIO: number; // MB/s
  databaseConnections: number;
  redisMemory: number; // MB
}

export interface PerformanceMetrics {
  apiResponseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  databaseQueryTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  workerJobTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  llmApiLatency: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface Alert {
  id: string;
  level: 'CRITICAL' | 'WARNING' | 'INFO';
  type: string;
  message: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
  triggeredAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  acknowledgedBy: string | null;
  resolvedBy: string | null;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS';
  threshold: number;
  level: 'CRITICAL' | 'WARNING' | 'INFO';
  enabled: boolean;
  channels: string[];
  cooldownMinutes: number;
  description?: string;
}

export interface AlertChannel {
  id: string;
  type: 'EMAIL' | 'SLACK' | 'PAGERDUTY' | 'WEBHOOK';
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

// Hook for system health status
export function useSystemHealth(autoRefresh = true, refreshInterval = 30000, enabled = true) {
  const [data, setData] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch('/api/admin/monitoring/health');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result.data || result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchHealth();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchHealth();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [fetchHealth, autoRefresh, refreshInterval, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchHealth,
  };
}

// Hook for system metrics over time
export function useSystemMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h', enabled = true) {
  const [data, setData] = useState<SystemMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/admin/monitoring/metrics?range=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result.data || result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchMetrics();
  }, [fetchMetrics, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchMetrics,
  };
}

// Hook for performance metrics
export function usePerformanceMetrics(autoRefresh = true, refreshInterval = 60000, enabled = true) {
  const [data, setData] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPerformance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch('/api/admin/monitoring/performance');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchPerformance();

    if (!autoRefresh) {
      return;
    }

    const interval = setInterval(() => {
      fetchPerformance();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchPerformance, autoRefresh, refreshInterval, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchPerformance,
  };
}

// Hook for alerts
export function useAlerts(
  filters?: { status?: Alert['status']; level?: Alert['level'] },
  autoRefresh = true,
  refreshInterval = 30000,
  enabled = true
) {
  const [data, setData] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.level) params.append('level', filters.level);

      const response = await globalThis.fetch(`/api/admin/monitoring/alerts?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result.data || result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    const response = await globalThis.fetch(`/api/admin/monitoring/alerts/${alertId}/acknowledge`, {
      method: 'PATCH',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchAlerts();
  }, [fetchAlerts]);

  const resolveAlert = useCallback(async (alertId: string) => {
    const response = await globalThis.fetch(`/api/admin/monitoring/alerts/${alertId}/resolve`, {
      method: 'PATCH',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchAlerts();

    if (!autoRefresh) {
      return;
    }

    const interval = setInterval(() => {
      fetchAlerts();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchAlerts, autoRefresh, refreshInterval, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchAlerts,
    acknowledgeAlert,
    resolveAlert,
  };
}

// Hook for alert rules
export function useAlertRules(enabled = true) {
  const [data, setData] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAlertRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch('/api/admin/monitoring/alert-rules');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result.data || result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAlertRule = useCallback(async (ruleId: string, updates: Partial<AlertRule>) => {
    const response = await globalThis.fetch(`/api/admin/monitoring/alert-rules/${ruleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchAlertRules();
  }, [fetchAlertRules]);

  const toggleAlertRule = useCallback(async (ruleId: string, enabled: boolean) => {
    await updateAlertRule(ruleId, { enabled });
  }, [updateAlertRule]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchAlertRules();
  }, [fetchAlertRules, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchAlertRules,
    updateAlertRule,
    toggleAlertRule,
  };
}

// Hook for alert channels
export function useAlertChannels(enabled = true) {
  const [data, setData] = useState<AlertChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch('/api/admin/monitoring/alert-channels');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result.data || result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateChannel = useCallback(async (channelId: string, updates: Partial<AlertChannel>) => {
    const response = await globalThis.fetch(`/api/admin/monitoring/alert-channels/${channelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchChannels();
  }, [fetchChannels]);

  const toggleChannel = useCallback(async (channelId: string, enabled: boolean) => {
    await updateChannel(channelId, { enabled });
  }, [updateChannel]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchChannels();
  }, [fetchChannels, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchChannels,
    updateChannel,
    toggleChannel,
  };
}

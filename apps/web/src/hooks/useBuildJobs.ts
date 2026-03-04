'use client';

import { useEffect, useState, useCallback } from 'react';

export interface BuildJob {
  id: string;
  websiteId: string;
  stage: 'BUILDER' | 'AUDITOR_1' | 'CICD_BUILDER' | 'AUDITOR_2' | 'DEPLOYMENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  website: {
    id: string;
    name: string;
    slug: string;
  };
  llmLogs?: LLMLog[];
}

export interface LLMLog {
  id: string;
  buildJobId: string;
  provider: string;
  model: string;
  prompt: string;
  response: string;
  tokenCount: number | null;
  latency: number | null;
  createdAt: string;
}

export interface QueueStatus {
  pending: number;
  inProgress: number;
  completedToday: number;
  failedToday: number;
  averageCompletionTime: number; // in minutes
}

export interface ProviderStats {
  provider: string;
  model: string;
  status: 'active' | 'error';
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  lastError: string | null;
}

export interface CostAnalytics {
  today: number;
  week: number;
  month: number;
  year: number;
  byProvider: {
    provider: string;
    cost: number;
  }[];
  byOrganization: {
    organizationId: string;
    organizationName: string;
    cost: number;
  }[];
}

interface BuildJobsResponse {
  data: BuildJob[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

interface UseBuildJobsOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  websiteId?: string;
}

export function useBuildJobs(options: UseBuildJobsOptions = {}) {
  const pollingIntervalMs = 15000;
  const {
    page: initialPage,
    pageSize: initialPageSize,
    status,
    websiteId,
  } = options;

  const [data, setData] = useState<BuildJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState({
    page: initialPage ?? 1,
    pageSize: initialPageSize ?? 20,
    total: 0,
  });

  const fetchBuildJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(initialPage ?? pagination.page),
        pageSize: String(initialPageSize ?? pagination.pageSize),
        ...(status && { status }),
        ...(websiteId && { websiteId }),
      });

      const response = await globalThis.fetch(`/api/admin/jobs?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: BuildJobsResponse = await response.json();
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [initialPage, initialPageSize, status, websiteId, pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchBuildJobs();
  }, [fetchBuildJobs]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchBuildJobs();
    }, pollingIntervalMs);

    return () => clearInterval(interval);
  }, [fetchBuildJobs]);

  return {
    data,
    loading,
    error,
    pagination,
    refetch: fetchBuildJobs,
    setPage: (page: number) => {
      setPagination((prev) => ({ ...prev, page }));
    },
  };
}

export function useBuildJob(jobId: string) {
  const [data, setData] = useState<BuildJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBuildJob = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/admin/jobs/${jobId}`);
      
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
  }, [jobId]);

  const cancelJob = useCallback(async () => {
    try {
      const response = await globalThis.fetch(`/api/admin/jobs/${jobId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await fetchBuildJob();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error');
    }
  }, [jobId, fetchBuildJob]);

  useEffect(() => {
    fetchBuildJob();
  }, [fetchBuildJob]);

  return {
    data,
    loading,
    error,
    refetch: fetchBuildJob,
    cancelJob,
  };
}

export function useQueueStatus() {
  const [data, setData] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchQueueStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch('/api/admin/jobs/queue-status');
      
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
    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchQueueStatus]);

  return {
    data,
    loading,
    error,
    refetch: fetchQueueStatus,
  };
}

export function useProviderStats() {
  const [data, setData] = useState<ProviderStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProviderStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch('/api/admin/llm/providers');
      
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
    fetchProviderStats();
  }, [fetchProviderStats]);

  return {
    data,
    loading,
    error,
    refetch: fetchProviderStats,
  };
}

export function useCostAnalytics() {
  const [data, setData] = useState<CostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCostAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch('/api/admin/llm/costs');
      
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
    fetchCostAnalytics();
  }, [fetchCostAnalytics]);

  return {
    data,
    loading,
    error,
    refetch: fetchCostAnalytics,
  };
}

export function useLLMLogs(websiteId: string) {
  const [data, setData] = useState<LLMLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLLMLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/admin/websites/${websiteId}/llm-logs`);
      
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
  }, [websiteId]);

  useEffect(() => {
    fetchLLMLogs();
  }, [fetchLLMLogs]);

  return {
    data,
    loading,
    error,
    refetch: fetchLLMLogs,
  };
}

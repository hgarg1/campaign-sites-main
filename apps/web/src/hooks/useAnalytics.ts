import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/admin/shared/ToastContext';

// Types
export interface GrowthMetric {
  date: string;
  users: number;
  organizations: number;
  websites: number;
}

export interface GrowthStats {
  usersGrowth: number; // percentage
  organizationsGrowth: number;
  websitesGrowth: number;
  metrics: GrowthMetric[];
}

export interface UsageMetric {
  date: string;
  dailyActiveUsers: number;
  apiCalls: number;
  buildJobs: number;
  averageBuildTime: number; // seconds
  successRate: number; // percentage
}

export interface EngagementMetric {
  metric: string;
  value: number;
  trend: number; // percentage change
}

export interface CostBreakdown {
  totalCost: number;
  period: 'day' | 'week' | 'month' | 'year';
  byOrganization: { organizationId: string; organizationName: string; cost: number }[];
  byUser: { userId: string; userName: string; cost: number }[];
  byWebsite: { websiteId: string; websiteName: string; cost: number }[];
  byProvider: { provider: string; cost: number }[]; // LLM providers
  infrastructure: number;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  organization?: string;
}

export interface BillingData {
  invoices: Invoice[];
  paymentHistory: { date: string; amount: number; method: string }[];
  outstandingBalance: number;
  nextBillingDate: string;
  subscriptionStatus: 'active' | 'paused' | 'cancelled';
}

export interface ReportOptions {
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
  startDate?: string;
  endDate?: string;
  metrics: string[]; // growth, usage, engagement, costs
  dimensions: string[]; // org, user, region
  format: 'pdf' | 'csv';
}

export interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  generatedAt: string;
  downloadUrl: string;
  format: string;
}

// Growth Metrics Hook
export function useGrowthMetrics(enabled = true) {
  const [data, setData] = useState<GrowthStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { error: showError } = useToast();

  useEffect(() => {
    if (enabled) fetchGrowthMetrics();
  }, [enabled]);

  const fetchGrowthMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/analytics/growth', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch growth metrics');
      const result = await response.json();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      showError('Error', `Failed to load growth metrics: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  return { data, loading, error, refetch: fetchGrowthMetrics };
}

// Usage Analytics Hook
export function useUsageAnalytics(enabled = true) {
  const [data, setData] = useState<UsageMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { error: showError } = useToast();

  useEffect(() => {
    if (enabled) fetchUsageAnalytics();
  }, [enabled]);

  const fetchUsageAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/analytics/usage', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch usage analytics');
      const result = await response.json();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      showError('Error', `Failed to load usage analytics: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  return { data, loading, error, refetch: fetchUsageAnalytics };
}

// Engagement Metrics Hook
export function useEngagementMetrics(enabled = true) {
  const [data, setData] = useState<EngagementMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { error: showError } = useToast();

  useEffect(() => {
    if (enabled) fetchEngagementMetrics();
  }, [enabled]);

  const fetchEngagementMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/analytics/engagement', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch engagement metrics');
      const result = await response.json();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      showError('Error', `Failed to load engagement metrics: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  return { data, loading, error, refetch: fetchEngagementMetrics };
}

// Cost Analytics Hook
export function useCostAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month', enabled = true) {
  const [data, setData] = useState<CostBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { error: showError } = useToast();

  useEffect(() => {
    if (enabled) fetchCostAnalytics();
  }, [period, enabled]);

  const fetchCostAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/analytics/costs?period=${period}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch cost analytics');
      const result = await response.json();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      showError('Error', `Failed to load cost analytics: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [period, showError]);

  return { data, loading, error, refetch: fetchCostAnalytics };
}

// Billing Data Hook
export function useBillingData(enabled = true) {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { error: showError } = useToast();

  useEffect(() => {
    if (enabled) fetchBillingData();
  }, [enabled]);

  const fetchBillingData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/analytics/billing', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch billing data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      showError('Error', `Failed to load billing data: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  return { data, loading, error, refetch: fetchBillingData };
}

// Report Generation Hook
export function useReportGeneration(enabled = true) {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { error: showError, success: showSuccess } = useToast();

  useEffect(() => {
    if (enabled) fetchReports();
  }, [enabled]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/analytics/reports', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch reports');
      const result = await response.json();
      setReports(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      showError('Error', `Failed to load reports: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const generateReport = useCallback(
    async (options: ReportOptions) => {
      setGenerating(true);
      setError(null);
      try {
        const response = await fetch('/api/admin/analytics/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(options),
        });

        if (!response.ok) throw new Error('Failed to generate report');
        const report = await response.json();

        setReports((prev) => [report, ...prev]);
        showSuccess('Success', 'Report generated successfully');

        return report;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        showError('Error', `Failed to generate report: ${message}`);
        return null;
      } finally {
        setGenerating(false);
      }
    },
    [showSuccess, showError]
  );

  const downloadReport = useCallback(async (reportId: string) => {
    try {
      const response = await fetch(`/api/admin/analytics/reports/${reportId}/download`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to download report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);

      showSuccess('Success', 'Report downloaded successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError('Error', `Failed to download report: ${message}`);
    }
  }, [showSuccess, showError]);

  return {
    reports,
    loading,
    generating,
    error,
    refetch: fetchReports,
    generateReport,
    downloadReport,
  };
}

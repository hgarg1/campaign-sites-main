'use client';

import { useEffect, useState, useCallback } from 'react';

export interface WebhookLogEntry {
  id: string;
  url: string;
  eventType: string;
  statusCode: number | null;
  success: boolean;
  durationMs: number;
  createdAt: string;
}

export interface TenantOrg {
  id: string;
  name: string;
  slug: string;
  whiteLabel: boolean;
  customDomain: string | null;
  memberCount: number;
  websiteCount: number;
  storageUsedMb: number;
  status: 'active' | 'suspended';
  branding: {
    primaryColor?: string;
    logoUrl?: string;
    faviconUrl?: string;
  } | null;
  createdAt: string;
}

export interface TenantMember {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user: { id: string; name: string | null; email: string };
  joinedAt: string;
  customRoleId?: string | null;
  customRole?: { id: string; name: string; color: string } | null;
}

export interface TenantUsage {
  monthlyBuilds: number;
  monthlyBuildsLimit: number;
  apiCalls: number;
  apiCallsLimit: number;
  storageUsedMb: number;
  storageLimit: number;
  llmCosts: number;
  // Extended fields
  plan?: string;
  resetDate?: string;
  websitesCount?: number;
  websitesLimit?: number;
  membersCount?: number;
  membersLimit?: number;
  llmUsage?: { openai?: number; anthropic?: number; google?: number };
}

export interface TenantIntegration {
  id: string;
  type: 'FUNDRAISING' | 'CRM' | 'EMAIL' | 'ANALYTICS';
  provider: string;
  isActive: boolean;
  config: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface TenantAnalytics {
  totalVisitors: number;
  totalDonations: number;
  donationAmount: number;
  conversionRate: number;
  websiteStats: Array<{
    websiteId: string;
    websiteName: string;
    visitors: number;
    donations: number;
    pageViews?: number;
  }>;
  // Extended fields
  totalPageViews?: number;
  uniqueVisitors?: number;
  totalRaisedUsd?: number;
  byWebsite?: Record<string, { pageViews?: number; visitors?: number }>;
  donationsByMonth?: Array<{ label: string; amount: number }>;
}

export interface TenantSettings {
  name: string;
  slug: string;
  description: string | null;
  primaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  customDomain: string | null;
  notifyOnBuildComplete: boolean;
  notifyOnBuildFailed: boolean;
  notifyOnTeamChanges: boolean;
  webhookUrl: string | null;
  webhookLog?: WebhookLogEntry[];
  // Extended fields
  whiteLabel?: boolean;
  plan?: string;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string | null;
    faviconUrl?: string | null;
  };
  notifications?: {
    builds?: boolean;
    errors?: boolean;
    team?: boolean;
    publish?: boolean;
    webhookUrl?: string | null;
  };
}

export function useTenantOrg(orgId: string) {
  const [data, setData] = useState<TenantOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrg = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/tenant/${orgId}`);

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
  }, [orgId]);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  return { data, loading, error, refetch: fetchOrg };
}

export function useTenantMembers(orgId: string) {
  const [data, setData] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/tenant/${orgId}/members`);

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
  }, [orgId]);

  const updateMemberRole = useCallback(
    async (memberId: string, role: 'OWNER' | 'ADMIN' | 'MEMBER') => {
      try {
        const response = await globalThis.fetch(`/api/tenant/${orgId}/members/${memberId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        await fetchMembers();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Unknown error');
      }
    },
    [orgId, fetchMembers]
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      try {
        const response = await globalThis.fetch(`/api/tenant/${orgId}/members/${memberId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        await fetchMembers();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Unknown error');
      }
    },
    [orgId, fetchMembers]
  );

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { data, loading, error, refetch: fetchMembers, updateMemberRole, removeMember };
}

export function useTenantUsage(orgId: string) {
  const [data, setData] = useState<TenantUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/tenant/${orgId}/usage`);

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
  }, [orgId]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return { data, loading, error, refetch: fetchUsage };
}

export function useTenantIntegrations(orgId: string) {
  const [data, setData] = useState<TenantIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/tenant/${orgId}/integrations`);

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
  }, [orgId]);

  const createIntegration = useCallback(
    async (payload: Omit<TenantIntegration, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const response = await globalThis.fetch(`/api/tenant/${orgId}/integrations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        await fetchIntegrations();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Unknown error');
      }
    },
    [orgId, fetchIntegrations]
  );

  const deleteIntegration = useCallback(
    async (integrationId: string) => {
      try {
        const response = await globalThis.fetch(`/api/tenant/${orgId}/integrations/${integrationId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        await fetchIntegrations();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Unknown error');
      }
    },
    [orgId, fetchIntegrations]
  );

  const toggleIntegration = useCallback(
    async (integrationId: string, isActive: boolean) => {
      try {
        const response = await globalThis.fetch(`/api/tenant/${orgId}/integrations/${integrationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        await fetchIntegrations();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Unknown error');
      }
    },
    [orgId, fetchIntegrations]
  );

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  return {
    data,
    loading,
    error,
    refetch: fetchIntegrations,
    createIntegration,
    deleteIntegration,
    toggleIntegration,
  };
}

export function useTenantAnalytics(orgId: string) {
  const [data, setData] = useState<TenantAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/tenant/${orgId}/analytics`);

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
  }, [orgId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { data, loading, error, refetch: fetchAnalytics };
}

export function useTenantSettings(orgId: string) {
  const [data, setData] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/tenant/${orgId}/settings`);

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
  }, [orgId]);

  const updateSettings = useCallback(
    async (updates: Partial<TenantSettings>) => {
      try {
        const response = await globalThis.fetch(`/api/tenant/${orgId}/settings`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Unknown error');
      }
    },
    [orgId]
  );

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { data, loading, error, refetch: fetchSettings, updateSettings };
}

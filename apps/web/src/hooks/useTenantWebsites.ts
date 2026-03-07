'use client';

import { useEffect, useState, useCallback } from 'react';

export interface TenantWebsite {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: 'DRAFT' | 'BUILDING' | 'AUDITING' | 'DEPLOYING' | 'PUBLISHED' | 'FAILED';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Extended fields returned by API
  pageCount?: number;
  lastBuiltAt?: string | null;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  owner: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface TenantWebsitePage {
  id: string;
  path: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantWebsiteIntegration {
  id: string;
  type: 'FUNDRAISING' | 'CRM' | 'EMAIL' | 'ANALYTICS';
  provider: string;
  isActive: boolean;
  config?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface TenantWebsitesResponse {
  data: TenantWebsite[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

interface UseTenantWebsitesOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

export function useTenantWebsites(orgId: string, options: UseTenantWebsitesOptions = {}) {
  const pollingIntervalMs = 15000;
  const { page: initialPage, pageSize: initialPageSize, status, search } = options;

  const [data, setData] = useState<TenantWebsite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState({
    page: initialPage ?? 1,
    pageSize: initialPageSize ?? 20,
    total: 0,
  });

  const fetchWebsites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(initialPage ?? pagination.page),
        pageSize: String(initialPageSize ?? pagination.pageSize),
        ...(status && { status }),
        ...(search && { search }),
      });

      const response = await globalThis.fetch(`/api/tenant/${orgId}/websites?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: TenantWebsitesResponse = await response.json();
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [orgId, initialPage, initialPageSize, status, search, pagination.page, pagination.pageSize]);

  const createWebsite = useCallback(
    async (payload: { name: string; slug: string; domain?: string }) => {
      try {
        const response = await globalThis.fetch(`/api/tenant/${orgId}/websites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        await fetchWebsites();
        return result;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Unknown error');
      }
    },
    [orgId, fetchWebsites]
  );

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchWebsites();
    }, pollingIntervalMs);

    return () => clearInterval(interval);
  }, [fetchWebsites]);

  return {
    data,
    loading,
    error,
    pagination,
    refetch: fetchWebsites,
    createWebsite,
    setPage: (page: number) => {
      setPagination((prev) => ({ ...prev, page }));
    },
  };
}

export function useTenantWebsite(orgId: string, websiteId: string) {
  const [data, setData] = useState<TenantWebsite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWebsite = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/tenant/${orgId}/websites/${websiteId}`);

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
  }, [orgId, websiteId]);

  const triggerRebuild = useCallback(async () => {
    try {
      const response = await globalThis.fetch(`/api/tenant/${orgId}/websites/${websiteId}/rebuild`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await fetchWebsite();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error');
    }
  }, [orgId, websiteId, fetchWebsite]);

  const updateWebsite = useCallback(
    async (updates: Partial<TenantWebsite>) => {
      try {
        const response = await globalThis.fetch(`/api/tenant/${orgId}/websites/${websiteId}`, {
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
    [orgId, websiteId]
  );

  const deleteWebsite = useCallback(async () => {
    try {
      const response = await globalThis.fetch(`/api/tenant/${orgId}/websites/${websiteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error');
    }
  }, [orgId, websiteId]);

  const publish = useCallback(async () => {
    try {
      const response = await globalThis.fetch(`/api/tenant/${orgId}/websites/${websiteId}/publish`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await fetchWebsite();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error');
    }
  }, [orgId, websiteId, fetchWebsite]);

  const unpublish = useCallback(async () => {
    try {
      const response = await globalThis.fetch(`/api/tenant/${orgId}/websites/${websiteId}/unpublish`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await fetchWebsite();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error');
    }
  }, [orgId, websiteId, fetchWebsite]);

  useEffect(() => {
    fetchWebsite();
  }, [fetchWebsite]);

  return {
    data,
    loading,
    error,
    refetch: fetchWebsite,
    triggerRebuild,
    updateWebsite,
    deleteWebsite,
    publish,
    unpublish,
  };
}

export function useTenantWebsitePages(orgId: string, websiteId: string) {
  const [data, setData] = useState<TenantWebsitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/tenant/${orgId}/websites/${websiteId}/pages`);

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
  }, [orgId, websiteId]);

  const updatePage = useCallback(
    async (pageId: string, updates: Partial<TenantWebsitePage>) => {
      try {
        const response = await globalThis.fetch(
          `/api/tenant/${orgId}/websites/${websiteId}/pages/${pageId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        await fetchPages();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Unknown error');
      }
    },
    [orgId, websiteId, fetchPages]
  );

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  return { data, loading, error, refetch: fetchPages, updatePage };
}

export function useTenantWebsiteIntegrations(orgId: string, websiteId: string) {
  const [data, setData] = useState<TenantWebsiteIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(
        `/api/tenant/${orgId}/websites/${websiteId}/integrations`
      );

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
  }, [orgId, websiteId]);

  const createIntegration = useCallback(
    async (payload: Omit<TenantWebsiteIntegration, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const response = await globalThis.fetch(
          `/api/tenant/${orgId}/websites/${websiteId}/integrations`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        await fetchIntegrations();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Unknown error');
      }
    },
    [orgId, websiteId, fetchIntegrations]
  );

  const updateIntegration = useCallback(
    async (integrationId: string, updates: Partial<TenantWebsiteIntegration>) => {
      try {
        const response = await globalThis.fetch(
          `/api/tenant/${orgId}/websites/${websiteId}/integrations/${integrationId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        await fetchIntegrations();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Unknown error');
      }
    },
    [orgId, websiteId, fetchIntegrations]
  );

  const deleteIntegration = useCallback(
    async (integrationId: string) => {
      try {
        const response = await globalThis.fetch(
          `/api/tenant/${orgId}/websites/${websiteId}/integrations/${integrationId}`,
          {
            method: 'DELETE',
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        await fetchIntegrations();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Unknown error');
      }
    },
    [orgId, websiteId, fetchIntegrations]
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
    updateIntegration,
    deleteIntegration,
  };
}

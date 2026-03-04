'use client';

import { useEffect, useState, useCallback } from 'react';

export interface Website {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: 'DRAFT' | 'BUILDING' | 'AUDITING' | 'DEPLOYING' | 'PUBLISHED' | 'FAILED';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface WebsitePage {
  id: string;
  path: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteIntegration {
  id: string;
  type: 'FUNDRAISING' | 'CRM' | 'EMAIL' | 'ANALYTICS';
  provider: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WebsitesResponse {
  data: Website[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

interface UseWebsitesOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  organizationId?: string;
  search?: string;
}

export function useWebsites(options: UseWebsitesOptions = {}) {
  const pollingIntervalMs = 15000;
  const {
    page: initialPage,
    pageSize: initialPageSize,
    status,
    organizationId,
    search,
  } = options;

  const [data, setData] = useState<Website[]>([]);
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
        ...(organizationId && { organizationId }),
        ...(search && { search }),
      });

      const response = await globalThis.fetch(`/api/admin/websites?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: WebsitesResponse = await response.json();
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [initialPage, initialPageSize, status, organizationId, search, pagination.page, pagination.pageSize]);

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
    setPage: (page: number) => {
      setPagination((prev) => ({ ...prev, page }));
    },
  };
}

export function useWebsite(websiteId: string) {
  const [data, setData] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWebsite = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/admin/websites/${websiteId}`);
      
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
  }, [websiteId]);

  const triggerRebuild = useCallback(async () => {
    try {
      const response = await globalThis.fetch(`/api/admin/websites/${websiteId}/rebuild`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await fetchWebsite();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error');
    }
  }, [websiteId, fetchWebsite]);

  const deleteWebsite = useCallback(async () => {
    try {
      const response = await globalThis.fetch(`/api/admin/websites/${websiteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error');
    }
  }, [websiteId]);

  useEffect(() => {
    fetchWebsite();
  }, [fetchWebsite]);

  return {
    data,
    loading,
    error,
    refetch: fetchWebsite,
    triggerRebuild,
    deleteWebsite,
  };
}

export function useWebsitePages(websiteId: string) {
  const [data, setData] = useState<WebsitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/admin/websites/${websiteId}/pages`);
      
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
    fetchPages();
  }, [fetchPages]);

  return {
    data,
    loading,
    error,
    refetch: fetchPages,
  };
}

export function useWebsiteIntegrations(websiteId: string) {
  const [data, setData] = useState<WebsiteIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/admin/websites/${websiteId}/integrations`);
      
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
    fetchIntegrations();
  }, [fetchIntegrations]);

  return {
    data,
    loading,
    error,
    refetch: fetchIntegrations,
  };
}

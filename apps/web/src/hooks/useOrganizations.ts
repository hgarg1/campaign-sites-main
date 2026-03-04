'use client';

import { useEffect, useState, useCallback } from 'react';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  whiteLabel: boolean;
  customDomain: string | null;
  memberCount: number;
  websiteCount: number;
  status: 'active' | 'suspended';
  createdAt: string;
  owner?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface OrganizationMember {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface OrganizationWebsite {
  id: string;
  name: string;
  slug: string;
  status: 'DRAFT' | 'BUILDING' | 'AUDITING' | 'DEPLOYING' | 'PUBLISHED' | 'FAILED';
  publishedAt: string | null;
  createdAt: string;
}

export interface OrganizationUsage {
  monthlyBuilds: number;
  apiCalls: number;
  storageUsed: number; // in MB
  llmCosts: number;
}

interface OrganizationsResponse {
  data: Organization[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

interface UseOrganizationsOptions {
  page?: number;
  pageSize?: number;
  whiteLabel?: boolean;
  status?: string;
  search?: string;
}

export function useOrganizations(options: UseOrganizationsOptions = {}) {
  const pollingIntervalMs = 15000;
  const {
    page: initialPage,
    pageSize: initialPageSize,
    whiteLabel,
    status,
    search,
  } = options;

  const [data, setData] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState({
    page: initialPage ?? 1,
    pageSize: initialPageSize ?? 20,
    total: 0,
  });

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(initialPage ?? pagination.page),
        pageSize: String(initialPageSize ?? pagination.pageSize),
        ...(whiteLabel !== undefined && { whiteLabel: String(whiteLabel) }),
        ...(status && { status }),
        ...(search && { search }),
      });

      const response = await globalThis.fetch(`/api/admin/organizations?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: OrganizationsResponse = await response.json();
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [initialPage, initialPageSize, whiteLabel, status, search, pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrganizations();
    }, pollingIntervalMs);

    return () => clearInterval(interval);
  }, [fetchOrganizations]);

  return {
    data,
    loading,
    error,
    pagination,
    refetch: fetchOrganizations,
    setPage: (page: number) => {
      setPagination((prev) => ({ ...prev, page }));
    },
  };
}

export function useOrganization(organizationId: string) {
  const [data, setData] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganization = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/admin/organizations/${organizationId}`);
      
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
  }, [organizationId]);

  const updateOrganization = useCallback(async (updates: Partial<Organization>) => {
    try {
      const response = await globalThis.fetch(`/api/admin/organizations/${organizationId}`, {
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
  }, [organizationId]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  return {
    data,
    loading,
    error,
    refetch: fetchOrganization,
    updateOrganization,
  };
}

export function useOrganizationMembers(organizationId: string) {
  const [data, setData] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/admin/organizations/${organizationId}/members`);
      
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
  }, [organizationId]);

  const updateMemberRole = useCallback(async (memberId: string, role: 'OWNER' | 'ADMIN' | 'MEMBER') => {
    try {
      const response = await globalThis.fetch(`/api/admin/organizations/${organizationId}/members/${memberId}`, {
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
  }, [organizationId, fetchMembers]);

  const removeMember = useCallback(async (memberId: string) => {
    try {
      const response = await globalThis.fetch(`/api/admin/organizations/${organizationId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await fetchMembers();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error');
    }
  }, [organizationId, fetchMembers]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    data,
    loading,
    error,
    refetch: fetchMembers,
    updateMemberRole,
    removeMember,
  };
}

export function useOrganizationWebsites(organizationId: string) {
  const [data, setData] = useState<OrganizationWebsite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWebsites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/admin/organizations/${organizationId}/websites`);
      
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
  }, [organizationId]);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  return {
    data,
    loading,
    error,
    refetch: fetchWebsites,
  };
}

export function useOrganizationUsage(organizationId: string) {
  const [data, setData] = useState<OrganizationUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/admin/organizations/${organizationId}/usage`);
      
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
  }, [organizationId]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return {
    data,
    loading,
    error,
    refetch: fetchUsage,
  };
}

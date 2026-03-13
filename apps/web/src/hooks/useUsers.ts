'use client';

import { useEffect, useState, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN' | 'GLOBAL_ADMIN';
  status: 'active' | 'suspended' | 'deleted';
  organizationCount: number;
  websiteCount: number;
  createdAt: string;
  lastLogin?: string;
}

interface UsersResponse {
  data: User[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

interface UseUsersOptions {
  page?: number;
  pageSize?: number;
  role?: string;
  status?: string;
  search?: string;
}

export function useUsers(options: UseUsersOptions = {}) {
  // Polling disabled - only refetch on demand or filter changes
  // const pollingIntervalMs = 15000;
  const {
    page: initialPage,
    pageSize: initialPageSize,
    role,
    status,
    search,
  } = options;

  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState({
    page: initialPage ?? 1,
    pageSize: initialPageSize ?? 20,
    total: 0,
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(initialPage ?? pagination.page),
        pageSize: String(initialPageSize ?? pagination.pageSize),
        ...(role && { role }),
        ...(status && { status }),
        ...(search && { search }),
      });

      const response = await globalThis.fetch(`/api/admin/users?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: UsersResponse = await response.json();
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [initialPage, initialPageSize, role, status, search, pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    data,
    loading,
    error,
    pagination,
    refetch: fetchUsers,
    setPage: (page: number) => {
      setPagination((prev) => ({ ...prev, page }));
    },
  };
}

export function useUser(userId: string) {
  const [data, setData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch(`/api/admin/users/${userId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId, fetchUser]);

  const updateUser = useCallback(
    async (updates: Partial<User>) => {
      try {
        const response = await globalThis.fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        setData(result.data);
        return result.data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [userId]
  );

  const suspendUser = useCallback(
    async (reason: string) => {
      try {
        const response = await globalThis.fetch(`/api/admin/users/${userId}/suspend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        setData(result.data);
        return result.data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [userId]
  );

  const unsuspendUser = useCallback(async () => {
    try {
      const response = await globalThis.fetch(`/api/admin/users/${userId}/unsuspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result.data);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    }
  }, [userId]);

  const resetPassword = useCallback(async () => {
    try {
      const response = await globalThis.fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    }
  }, [userId]);

  const deleteUser = useCallback(async () => {
    try {
      const response = await globalThis.fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    }
  }, [userId]);

  const impersonateUser = useCallback(async () => {
    try {
      const response = await globalThis.fetch(`/api/admin/users/${userId}/impersonate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    }
  }, [userId]);

  return {
    data,
    loading,
    error,
    refetch: fetchUser,
    updateUser,
    suspendUser,
    unsuspendUser,
    resetPassword,
    deleteUser,
    impersonateUser,
  };
}

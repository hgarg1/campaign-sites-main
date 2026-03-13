/**
 * React hook for checking system admin permissions in components
 * Usage: const { hasPermission, permissions } = useSystemAdminPermissions();
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface Permissions {
  allowedClaims: string[];
  deniedClaims: string[];
  allClaims: string[];
}

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
let permissionsCache: Permissions | null = null;
let cacheTimestamp = 0;

export function useSystemAdminPermissions() {
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      // Check cache
      const now = Date.now();
      if (
        permissionsCache &&
        now - cacheTimestamp < CACHE_DURATION_MS
      ) {
        setPermissions(permissionsCache);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/permissions');
      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }

      const data = await response.json();
      permissionsCache = data;
      cacheTimestamp = now;
      setPermissions(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unknown error'
      );
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (claim: string): boolean => {
      if (!permissions) return false;

      // Check exact match
      if (permissions.allowedClaims.includes(claim)) {
        return true;
      }

      // Check wildcard matches
      for (const allowedClaim of permissions.allowedClaims) {
        if (allowedClaim.includes('*')) {
          const pattern = allowedClaim.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          if (regex.test(claim)) {
            return true;
          }
        }
      }

      return false;
    },
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (claims: string[]): boolean => {
      return claims.some((claim) => hasPermission(claim));
    },
    [hasPermission]
  );

  const hasAllPermissions = useCallback(
    (claims: string[]): boolean => {
      return claims.every((claim) => hasPermission(claim));
    },
    [hasPermission]
  );

  const refetch = useCallback(() => {
    permissionsCache = null;
    fetchPermissions();
  }, [fetchPermissions]);

  return {
    permissions,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refetch,
  };
}

/**
 * Higher-order component to protect pages/components based on permission
 */
export function ProtectedByPermission({
  children,
  claim,
  fallback = null,
}: {
  children: React.ReactNode;
  claim: string;
  fallback?: React.ReactNode;
}) {
  const { hasPermission, loading } = useSystemAdminPermissions();

  if (loading) {
    return <div className="p-4">Loading permissions...</div>;
  }

  if (!hasPermission(claim)) {
    return (
      <>
        {fallback || (
          <div className="p-4 bg-red-50 text-red-700 rounded">
            You do not have permission to access this feature.
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}

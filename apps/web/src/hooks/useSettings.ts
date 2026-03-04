'use client';

import { useEffect, useState, useCallback } from 'react';

// Email Configuration Types
export interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  tls: boolean;
  ssl: boolean;
  fromEmail: string;
}

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Key & Webhook Types
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  createdAt: string;
}

export interface RateLimitSettings {
  globalLimit: number;
  globalWindow: number; // seconds
  perOrgLimit: number;
  perOrgWindow: number;
  perUserLimit: number;
  perUserWindow: number;
  whitelistIps: string[];
}

// Security Policy Types
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expirationDays: number | null;
  historyCount: number;
}

export interface SessionPolicy {
  timeoutMinutes: number;
  rememberMeDuration: number;
  maxConcurrentSessions: number;
  forceLogoutOnIpChange: boolean;
}

export interface AuthenticationSettings {
  require2FA: boolean;
  twoFAMethods: ('TOTP' | 'SMS' | 'EMAIL')[];
  trustedDeviceDuration: number; // days
}

export interface IpFilter {
  id: string;
  ip: string;
  type: 'WHITELIST' | 'BLACKLIST';
  description?: string;
}

// Data Retention Types
export interface RetentionPolicies {
  deletedWebsitesRetention: number; // days
  deletedUsersRetention: number;
  logsRetention: number;
}

export interface BackupSettings {
  frequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  lastBackupAt: string | null;
  nextBackupAt: string | null;
  backupSize: number; // MB
  enabled: boolean;
}

// Feature Flag Types
export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetAudiences: string[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

// Hook for email configuration
export function useEmailSettings() {
  const [data, setData] = useState<SmtpSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch('/api/admin/settings/email');

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

  const updateSettings = useCallback(async (updates: Partial<SmtpSettings>) => {
    const response = await globalThis.fetch('/api/admin/settings/email', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchSettings();
  }, [fetchSettings]);

  const testEmail = useCallback(async (recipientEmail: string) => {
    const response = await globalThis.fetch('/api/admin/settings/email/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { data, loading, error, updateSettings, testEmail, refetch: fetchSettings };
}

// Hook for email templates
export function useEmailTemplates() {
  const [data, setData] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch('/api/admin/settings/email/templates');

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

  const updateTemplate = useCallback(async (templateId: string, updates: Partial<EmailTemplate>) => {
    const response = await globalThis.fetch(`/api/admin/settings/email/templates/${templateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { data, loading, error, updateTemplate, refetch: fetchTemplates };
}

// Hook for API keys
export function useApiKeys() {
  const [data, setData] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch('/api/admin/settings/api-keys');

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

  const createKey = useCallback(async (name: string, permissions: string[]) => {
    const response = await globalThis.fetch('/api/admin/settings/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, permissions }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchKeys();
    return response.json();
  }, [fetchKeys]);

  const revokeKey = useCallback(async (keyId: string) => {
    const response = await globalThis.fetch(`/api/admin/settings/api-keys/${keyId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchKeys();
  }, [fetchKeys]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  return { data, loading, error, createKey, revokeKey, refetch: fetchKeys };
}

// Hook for webhooks
export function useWebhooks() {
  const [data, setData] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch('/api/admin/settings/webhooks');

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

  const createWebhook = useCallback(async (webhook: Omit<Webhook, 'id' | 'createdAt'>) => {
    const response = await globalThis.fetch('/api/admin/settings/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhook),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchWebhooks();
  }, [fetchWebhooks]);

  const updateWebhook = useCallback(async (webhookId: string, updates: Partial<Webhook>) => {
    const response = await globalThis.fetch(`/api/admin/settings/webhooks/${webhookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchWebhooks();
  }, [fetchWebhooks]);

  const testWebhook = useCallback(async (webhookId: string) => {
    const response = await globalThis.fetch(`/api/admin/settings/webhooks/${webhookId}/test`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  return { data, loading, error, createWebhook, updateWebhook, testWebhook, refetch: fetchWebhooks };
}

// Hook for rate limit settings
export function useRateLimitSettings() {
  const [data, setData] = useState<RateLimitSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch('/api/admin/settings/rate-limits');

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

  const updateSettings = useCallback(async (updates: Partial<RateLimitSettings>) => {
    const response = await globalThis.fetch('/api/admin/settings/rate-limits', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { data, loading, error, updateSettings, refetch: fetchSettings };
}

// Hook for security policies
export function useSecurityPolicies() {
  const [password, setPassword] = useState<PasswordPolicy | null>(null);
  const [session, setSession] = useState<SessionPolicy | null>(null);
  const [auth, setAuth] = useState<AuthenticationSettings | null>(null);
  const [ipFilters, setIpFilters] = useState<IpFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [pwResponse, sessResponse, authResponse, ipResponse] = await Promise.all([
        globalThis.fetch('/api/admin/settings/security/password-policy'),
        globalThis.fetch('/api/admin/settings/security/session-policy'),
        globalThis.fetch('/api/admin/settings/security/auth-settings'),
        globalThis.fetch('/api/admin/settings/security/ip-filters'),
      ]);

      if (!pwResponse.ok || !sessResponse.ok || !authResponse.ok || !ipResponse.ok) {
        throw new Error('Failed to fetch policies');
      }

      const [pwData, sessData, authData, ipData] = await Promise.all([
        pwResponse.json(),
        sessResponse.json(),
        authResponse.json(),
        ipResponse.json(),
      ]);

      setPassword(pwData);
      setSession(sessData);
      setAuth(authData);
      setIpFilters(ipData.data || ipData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePasswordPolicy = useCallback(async (updates: Partial<PasswordPolicy>) => {
    const response = await globalThis.fetch('/api/admin/settings/security/password-policy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchPolicies();
  }, [fetchPolicies]);

  const updateSessionPolicy = useCallback(async (updates: Partial<SessionPolicy>) => {
    const response = await globalThis.fetch('/api/admin/settings/security/session-policy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchPolicies();
  }, [fetchPolicies]);

  const updateAuthSettings = useCallback(async (updates: Partial<AuthenticationSettings>) => {
    const response = await globalThis.fetch('/api/admin/settings/security/auth-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchPolicies();
  }, [fetchPolicies]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  return {
    password,
    session,
    auth,
    ipFilters,
    loading,
    error,
    updatePasswordPolicy,
    updateSessionPolicy,
    updateAuthSettings,
    refetch: fetchPolicies,
  };
}

// Hook for data retention & backup
export function useDataRetention() {
  const [policies, setPolicies] = useState<RetentionPolicies | null>(null);
  const [backup, setBackup] = useState<BackupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [polResponse, backupResponse] = await Promise.all([
        globalThis.fetch('/api/admin/settings/data-retention/policies'),
        globalThis.fetch('/api/admin/settings/data-retention/backup'),
      ]);

      if (!polResponse.ok || !backupResponse.ok) {
        throw new Error('Failed to fetch settings');
      }

      const [polData, backupData] = await Promise.all([
        polResponse.json(),
        backupResponse.json(),
      ]);

      setPolicies(polData);
      setBackup(backupData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePolicies = useCallback(async (updates: Partial<RetentionPolicies>) => {
    const response = await globalThis.fetch('/api/admin/settings/data-retention/policies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchSettings();
  }, [fetchSettings]);

  const triggerManualBackup = useCallback(async () => {
    const response = await globalThis.fetch('/api/admin/settings/data-retention/backup/manual', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    policies,
    backup,
    loading,
    error,
    updatePolicies,
    triggerManualBackup,
    refetch: fetchSettings,
  };
}

// Hook for feature flags
export function useFeatureFlags() {
  const [data, setData] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await globalThis.fetch('/api/admin/settings/feature-flags');

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

  const updateFlag = useCallback(async (flagId: string, updates: Partial<FeatureFlag>) => {
    const response = await globalThis.fetch(`/api/admin/settings/feature-flags/${flagId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await fetchFlags();
  }, [fetchFlags]);

  const toggleFlag = useCallback(async (flagId: string, enabled: boolean) => {
    await updateFlag(flagId, { enabled });
  }, [updateFlag]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  return { data, loading, error, updateFlag, toggleFlag, refetch: fetchFlags };
}

'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { ApiKey } from '@/hooks/useSettings';
import { useToast } from '../shared/ToastContext';

interface ApiKeysManagerProps {
  keys: ApiKey[];
  loading: boolean;
  onCreate: (name: string, permissions: string[]) => Promise<{ key: string }>;
  onRevoke: (keyId: string) => Promise<void>;
}

const defaultPermissions = [
  'users:read',
  'users:write',
  'organizations:read',
  'organizations:write',
  'websites:read',
  'websites:write',
  'analytics:read',
  'settings:read',
  'settings:write',
];

export function ApiKeysManager({ keys, loading, onCreate, onRevoke }: ApiKeysManagerProps) {
  const { showToast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', permissions: defaultPermissions });
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      showToast('info', 'Please enter a key name');
      return;
    }

    try {
      setCreatingKey(true);
      const result = await onCreate(formData.name, formData.permissions);
      setNewKey(result.key);
      setFormData({ name: '', permissions: defaultPermissions });
      showToast('success', 'API key created successfully');
    } catch (error) {
      showToast('error', 'Failed to create API key');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      setRevoking(keyId);
      await onRevoke(keyId);
      showToast('success', 'API key revoked successfully');
    } catch (error) {
      showToast('error', 'Failed to revoke API key');
    } finally {
      setRevoking(null);
    }
  };

  const handleCopy = (key: string, keyId: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
          <p className="text-sm text-gray-600 mt-1">{keys.length} active key{keys.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          {showCreate ? 'Cancel' : '+ Create Key'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          {newKey ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">✓ API Key Created</h4>
                <p className="text-sm text-green-800 mb-3">
                  Save this key somewhere safe. You won't be able to see it again.
                </p>
                <div className="bg-white rounded p-3 font-mono text-sm text-gray-900 break-all mb-3 border border-green-200">
                  {newKey}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(newKey, 'new')}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    {copiedKey === 'new' ? '✓ Copied!' : 'Copy to Clipboard'}
                  </button>
                  <button
                    onClick={() => {
                      setNewKey(null);
                      setShowCreate(false);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Key Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="My API Key"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                  {defaultPermissions.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData((prev) => ({
                              ...prev,
                              permissions: [...prev.permissions, permission],
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              permissions: prev.permissions.filter((p) => p !== permission),
                            }));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creatingKey || !formData.name}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                >
                  {creatingKey ? 'Creating...' : 'Create Key'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Keys List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {keys.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No API keys created yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {keys.map((key, index) => (
              <motion.div
                key={key.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{key.name}</h4>
                    <p className="text-sm text-gray-600 mt-1 font-mono">
                      •••••••••• {key.key.slice(-4)}
                    </p>
                    <div className="flex gap-3 mt-3 text-xs text-gray-500">
                      <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                      {key.lastUsedAt && (
                        <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    {key.permissions.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {key.permissions.slice(0, 3).map((perm) => (
                          <span key={perm} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {perm}
                          </span>
                        ))}
                        {key.permissions.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            +{key.permissions.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRevoke(key.id)}
                    disabled={revoking === key.id}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 rounded-lg font-medium transition-colors"
                  >
                    {revoking === key.id ? 'Revoking...' : 'Revoke'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

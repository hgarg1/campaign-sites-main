'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/shared/AdminLayout';
import { PermissionOverrideManager } from '@/components/admin/rbac/PermissionOverrideManager';

interface SystemAdmin {
  id: string;
  email: string;
  name?: string;
  isActive: boolean;
  roles: Array<{ name: string }>;
}

export default function PermissionOverridesPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<SystemAdmin[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchAdmins = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/system-admins');
        if (res.ok) {
          const data = await res.json();
          setAdmins(data.admins || []);
          // Auto-select first admin
          if (data.admins?.length > 0) {
            setSelectedAdminId(data.admins[0].id);
          }
        } else {
          setError('Failed to fetch system admins');
        }
      } catch (err) {
        console.error('Error fetching admins:', err);
        setError('An error occurred while fetching admins');
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, []);

  const selectedAdmin = admins.find((a) => a.id === selectedAdminId);

  if (loading) {
    return (
      <AdminLayout title="Loading" subtitle="Please wait...">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Loading permission management...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Error" subtitle="Something went wrong">
        <div className="p-8 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  if (admins.length === 0) {
    return (
      <AdminLayout title="Permission Overrides" subtitle="No admins found">
        <div className="p-8 text-center">
          <p className="text-gray-600">No system admins found</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Permission Overrides"
      subtitle="Manage fine-grained permission exceptions"
    >
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => router.back()}
            className="mb-4 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Permission Overrides</h1>
          <p className="text-gray-600 mt-2">
            Create fine-grained permission exceptions for system admins. Overrides
            take absolute precedence over role-based permissions.
          </p>
        </motion.div>

        {/* Admin Selector */}
        <motion.div
          className="bg-white rounded-xl border border-gray-200 p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Select System Admin
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {admins.map((admin) => (
              <button
                key={admin.id}
                onClick={() => setSelectedAdminId(admin.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedAdminId === admin.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">
                  {admin.name || admin.email}
                </div>
                <div className="text-xs text-gray-500 mt-1">{admin.email}</div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {admin.roles?.map((role) => (
                    <span
                      key={role.name}
                      className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                    >
                      {role.name}
                    </span>
                  ))}
                </div>
                {!admin.isActive && (
                  <div className="text-xs text-orange-600 mt-2 font-medium">
                    Inactive
                  </div>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Permission Override Manager */}
        {selectedAdmin && (
          <PermissionOverrideManager
            key={`${selectedAdminId}-${refreshKey}`}
            systemAdminId={selectedAdminId}
            adminName={selectedAdmin.name || selectedAdmin.email}
            onOverridesUpdated={() => setRefreshKey((k) => k + 1)}
          />
        )}
      </div>
    </AdminLayout>
  );
}

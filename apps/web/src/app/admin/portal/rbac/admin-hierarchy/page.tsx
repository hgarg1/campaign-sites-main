/**
 * System Admin Hierarchy Management Page
 * /admin/portal/rbac/admin-hierarchy
 *
 * Visualize and manage the admin delegation hierarchy using React Flow
 */

'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/shared/AdminLayout';
import { ReactFlowProvider } from 'reactflow';
import { AdminHierarchyGraph } from '@/components/admin/rbac/AdminHierarchyGraph';
import type { Node, Edge } from 'reactflow';

interface HierarchyData {
  nodes: Node[];
  edges: Edge[];
  admins: Array<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    roles: string[];
  }>;
}

export default function AdminHierarchyPage() {
  const [hierarchyData, setHierarchyData] = useState<HierarchyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/rbac/admin-hierarchy');
      if (!response.ok) {
        throw new Error('Failed to fetch admin hierarchy');
      }
      const data = await response.json();
      setHierarchyData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setHierarchyData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHierarchy = async (edges: any[]) => {
    try {
      const response = await fetch('/api/admin/rbac/admin-hierarchy/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edges,
          justification: 'Updated admin delegation hierarchy',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save hierarchy');
      }

      // Refetch hierarchy after successful save
      await fetchHierarchy();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  return (
    <AdminLayout title="Admin Hierarchy" subtitle="Manage system admin delegation structure">
      <div className="space-y-6">
        {/* Header Card */}
        <motion.div
          className="bg-white rounded-xl border border-gray-200 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Admin Delegation Hierarchy
              </h3>
              <p className="text-sm text-gray-600">
                Visualize and manage the system admin hierarchy. Admins can delegate authority to
                subordinates, who inherit permissions cascading down the hierarchy.
              </p>
            </div>
            <button
              onClick={fetchHierarchy}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>How it works:</strong> Drag a connection from one admin (source) to another
              (target) to indicate that the target admin delegates to the source. This creates a
              hierarchy where the target inherits permissions from the source.
            </p>
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            className="bg-red-50 border border-red-200 rounded-xl p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm text-red-900">
              <strong>Error:</strong> {error}
            </p>
            <button
              onClick={fetchHierarchy}
              className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <motion.div
            className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-gray-600">Loading admin hierarchy...</p>
          </motion.div>
        )}

        {/* Graph */}
        {!loading && hierarchyData && (
          <motion.div
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <ReactFlowProvider>
              <AdminHierarchyGraph
                initialNodes={hierarchyData.nodes}
                initialEdges={hierarchyData.edges}
                onSave={handleSaveHierarchy}
              />
            </ReactFlowProvider>
          </motion.div>
        )}

        {/* Admin List for Reference */}
        {!loading && hierarchyData && (
          <motion.div
            className="bg-white rounded-xl border border-gray-200 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Admins</h3>
            <div className="space-y-3">
              {hierarchyData.admins.map((admin) => (
                <motion.div
                  key={admin.id}
                  className={`p-4 rounded-lg border ${
                    admin.isActive
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{admin.name}</p>
                      <p className="text-sm text-gray-600">{admin.email}</p>
                      {admin.roles.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {admin.roles.map((role) => (
                            <span
                              key={role}
                              className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {!admin.isActive && (
                      <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}

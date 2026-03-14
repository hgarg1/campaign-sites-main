'use client';

import { AdminLayout } from '@/components/admin/shared';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Permission {
  id: string;
  claim: string;
  description?: string;
  category: string;
  action: string;
  operationType: string;
  createdAt: string;
  updatedAt: string;
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterOperation, setFilterOperation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load permissions
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const res = await fetch('/api/admin/rbac/permissions-list');
        if (!res.ok) throw new Error('Failed to load permissions');

        const data = await res.json();
        setPermissions(data);
      } catch (error) {
        console.error('Failed to load permissions:', error);
        alert('Failed to load permissions');
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, []);

  const filteredPermissions = permissions.filter(p => {
    const matchesCategory = !filterCategory || p.category === filterCategory;
    const matchesOperation = !filterOperation || p.operationType === filterOperation;
    const matchesSearch = !searchQuery || 
      p.claim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesOperation && matchesSearch;
  });

  const categories = [...new Set(permissions.map(p => p.category))].sort();
  const operations = [...new Set(permissions.map(p => p.operationType))].sort();

  const operationColors: Record<string, string> = {
    READ: 'bg-blue-100 text-blue-700',
    WRITE: 'bg-amber-100 text-amber-700',
    DELETE: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return (
      <AdminLayout title="Permissions" subtitle="View all system admin permissions">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="System Admin Permissions" 
      subtitle="Browse all available permissions across the system admin portal"
    >
      <div className="mb-6">
        <p className="text-gray-600 mb-4">Total permissions: {filteredPermissions.length} of {permissions.length}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={filterOperation}
            onChange={(e) => setFilterOperation(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Operations</option>
            {operations.map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearchQuery('');
              setFilterCategory('');
              setFilterOperation('');
            }}
            className="px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Permissions Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredPermissions.length > 0 ? (
          filteredPermissions.map(perm => (
            <motion.div
              key={perm.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-mono font-semibold text-gray-900 flex-1 break-all">
                  {perm.claim}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded ml-2 flex-shrink-0 ${operationColors[perm.operationType] || 'bg-gray-100 text-gray-700'}`}>
                  {perm.operationType}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-3">
                {perm.description || 'No description provided'}
              </p>

              <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                <span className="bg-gray-100 px-2 py-1 rounded">{perm.category}</span>
                <span className="bg-gray-100 px-2 py-1 rounded">{perm.action}</span>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 text-lg">No permissions match your filters</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('');
                setFilterOperation('');
              }}
              className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700 text-sm"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">READ Permissions</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">
            {permissions.filter(p => p.operationType === 'READ').length}
          </div>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="text-sm text-amber-600 font-medium">WRITE Permissions</div>
          <div className="text-2xl font-bold text-amber-900 mt-1">
            {permissions.filter(p => p.operationType === 'WRITE').length}
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600 font-medium">DELETE Permissions</div>
          <div className="text-2xl font-bold text-red-900 mt-1">
            {permissions.filter(p => p.operationType === 'DELETE').length}
          </div>
        </div>
      </div>

      {/* Categories Summary */}
      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions by Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map(cat => {
            const count = permissions.filter(p => p.category === cat).length;
            return (
              <div key={cat} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-sm font-medium text-gray-700">{cat}</div>
                <div className="text-lg font-bold text-gray-900 mt-1">{count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}

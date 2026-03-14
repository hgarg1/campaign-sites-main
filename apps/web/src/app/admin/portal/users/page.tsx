'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/shared';
import { UserFilters, UsersTable, BulkActionsToolbar } from '@/components/admin/users';
import { useUsers } from '@/hooks/useUsers';
import { motion, AnimatePresence } from 'framer-motion';

interface Role {
  id: string;
  name: string;
  description?: string;
  _count?: { permissions: number; adminAssignments: number };
}

export default function UsersPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: '' as string,
    justification: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);
  const pageSize = 20;

  const [filters, setFilters] = useState<{
    role?: string;
    status?: string;
    search?: string;
  }>({});

  const { data: userData, loading, pagination, setPage, refetch } = useUsers({
    ...filters,
    pageSize,
  });

  // Ensure data is always an array
  const data = Array.isArray(userData) ? userData : [];

  // Fetch available roles when modal opens or step changes to 2
  useEffect(() => {
    if (showCreateModal && wizardStep === 2 && availableRoles.length === 0) {
      fetchAvailableRoles();
    }
  }, [showCreateModal, wizardStep]);

  const fetchAvailableRoles = async () => {
    setLoadingRoles(true);
    try {
      const res = await fetch('/api/admin/roles');
      if (res.ok) {
        const data = await res.json();
        setAvailableRoles(data);
        // Set default to first role if not already set
        if (!formData.role && data.length > 0) {
          setFormData(prev => ({ ...prev, role: data[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  }, [setPage]);

  // Bulk operations
  const handleBulkSuspend = async (userIds: string[]): Promise<void> => {
    try {
      await Promise.all(
        userIds.map((id) =>
          fetch('/api/admin/users/suspend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: id }),
          })
        )
      );
      setSelectedIds([]);
      // Refetch users after action
    } catch (error) {
      console.error('Failed to suspend users:', error);
    }
  };

  const handleBulkUnsuspend = async (userIds: string[]): Promise<void> => {
    try {
      await Promise.all(
        userIds.map((id) =>
          fetch('/api/admin/users/unsuspend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: id }),
          })
        )
      );
      setSelectedIds([]);
    } catch (error) {
      console.error('Failed to unsuspend users:', error);
    }
  };

  const handleBulkDelete = async (userIds: string[]): Promise<void> => {
    try {
      await Promise.all(
        userIds.map((id) =>
          fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
        )
      );
      setSelectedIds([]);
    } catch (error) {
      console.error('Failed to delete users:', error);
    }
  };

  const handleExport = (userIds: string[]) => {
    const selectedUsers = data.filter((u) => userIds.includes(u.id));
    const csv = [
      ['ID', 'Email', 'Name', 'Role', 'Status', 'Organizations', 'Websites'],
      ...selectedUsers.map((u) => [
        u.id,
        u.email,
        u.name || '',
        u.role,
        u.status,
        u.organizationCount || 0,
        u.websiteCount || 0,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleOpenCreateModal = () => {
    setWizardStep(1);
    setFormData({ email: '', name: '', role: 'ADMIN', justification: '' });
    setCreatedUser(null);
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setTimeout(() => {
      setWizardStep(1);
      setFormData({ email: '', name: '', role: 'ADMIN', justification: '' });
      setCreatedUser(null);
    }, 300);
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return isValidEmail(formData.email) && formData.name.trim().length > 0;
      case 2:
        return typeof formData.role === 'string' && formData.role.length > 0;
      case 3:
        return formData.justification.trim().length > 10;
      default:
        return false;
    }
  };

  const handleCreateUser = async () => {
    if (!validateStep(3)) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create user');
      }

      const result = await res.json();
      setCreatedUser(result);
      setWizardStep(4);
      
      // Refetch user list to show new user
      setTimeout(() => refetch(), 500);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title="Users Management"
      subtitle="Manage system users and permissions"
    >
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Users</h2>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ➕ Create New User
        </button>
      </div>

      <UserFilters
        onSearch={(search) => setFilters({ ...filters, search })}
        onFilterChange={(newFilters) => handleFilterChange(newFilters)}
      />

      <BulkActionsToolbar
        selectedCount={selectedIds.length}
        selectedUserIds={selectedIds}
        onSuspend={handleBulkSuspend}
        onUnsuspend={handleBulkUnsuspend}
        onDelete={handleBulkDelete}
        onExport={handleExport}
        onClearSelection={() => setSelectedIds([])}
      />

      <UsersTable
        data={data}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        loading={loading}
        pagination={pagination ? {
          currentPage: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: setPage,
        } : undefined}
      />

      {/* Create User Wizard Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseCreateModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-8 flex flex-col max-h-[90vh]"
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Create New User</h2>
                <p className="text-gray-600 mt-2">Step {wizardStep} of 4</p>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {/* Progress Bar */}
                <div className="mb-8 flex gap-2">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-2 flex-1 rounded-full transition-colors ${
                        step < wizardStep
                          ? 'bg-green-600'
                          : step === wizardStep
                          ? 'bg-blue-600'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>

              {/* Step 1: Email & Name */}
              {wizardStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                        formData.email && !isValidEmail(formData.email)
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="user@example.com"
                    />
                    {formData.email && !isValidEmail(formData.email) && (
                      <p className="text-xs text-red-600 mt-1">Please enter a valid email address</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                        formData.name && formData.name.trim().length === 0
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="John Doe"
                    />
                    {formData.name && formData.name.trim().length === 0 && (
                      <p className="text-xs text-red-600 mt-1">Name cannot be empty</p>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mt-4">
                    💡 A temporary password will be generated automatically. The user will be prompted to change it on first login.
                  </p>
                </motion.div>
              )}

              {/* Step 2: Role Selection */}
              {wizardStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    System Role *
                  </label>

                  {loadingRoles ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="inline-block animate-spin">
                          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                        </div>
                        <p className="text-sm text-gray-600 mt-4">Loading available roles...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                        {availableRoles.map((role) => (
                          <label
                            key={role.id}
                            className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                              formData.role === role.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200'
                            }`}
                          >
                            <input
                              type="radio"
                              name="role"
                              value={role.id}
                              checked={formData.role === role.id}
                              onChange={(e) =>
                                setFormData({ ...formData, role: e.target.value })
                              }
                              className="mt-1 flex-shrink-0"
                            />
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{role.name}</div>
                              {role.description && (
                                <div className="text-sm text-gray-600 mt-1">{role.description}</div>
                              )}
                              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                {role._count && (
                                  <>
                                    <span>
                                      📋 {role._count.permissions} permission{role._count.permissions !== 1 ? 's' : ''}
                                    </span>
                                    <span>
                                      👤 {role._count.adminAssignments} assignment{role._count.adminAssignments !== 1 ? 's' : ''}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </label>
                        ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 3: Justification */}
              {wizardStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Creating This Account *
                    </label>
                    <textarea
                      value={formData.justification}
                      onChange={(e) =>
                        setFormData({ ...formData, justification: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={5}
                      placeholder="Explain why this user needs to be created. Include any relevant context or approvals."
                    />
                  </div>

                  <p className="text-sm text-gray-600">
                    ⚠️ This justification will be logged in the audit trail for accountability and compliance.
                  </p>

                  {/* Review Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 mt-6">
                    <h4 className="font-semibold text-gray-900">Review Summary</h4>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p>
                        <strong>Email:</strong> {formData.email}
                      </p>
                      <p>
                        <strong>Name:</strong> {formData.name}
                      </p>
                      <p>
                        <strong>Role:</strong> {formData.role}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Success */}
              {wizardStep === 4 && createdUser && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col h-full"
                >
                  <div className="max-h-[calc(100vh-300px)] overflow-y-auto pr-2 space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                      <div className="text-4xl mb-2">✅</div>
                      <h3 className="text-xl font-bold text-green-900">User Created Successfully!</h3>
                      <p className="text-green-700 mt-2">
                        {createdUser.data.name} ({createdUser.data.email}) has been created.
                      </p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Important - Temporary Password</h4>
                      <p className="text-sm text-yellow-800 mb-3">
                        A temporary password has been generated. Share this with the user securely:
                      </p>
                      <div className="bg-white border border-yellow-200 rounded p-3 font-mono text-sm break-all">
                        {createdUser.tempPassword}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(createdUser.tempPassword);
                          alert('Password copied to clipboard');
                        }}
                        className="mt-2 text-xs text-yellow-700 hover:text-yellow-900 underline"
                      >
                        📋 Copy to clipboard
                      </button>
                      <p className="text-xs text-yellow-700 mt-3">
                        The user must change this password on their first login.
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">📋 User Details</h4>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>
                          <strong>User ID:</strong> {createdUser.data.id}
                        </p>
                        <p>
                          <strong>Email:</strong> {createdUser.data.email}
                        </p>
                        <p>
                          <strong>Name:</strong> {createdUser.data.name}
                        </p>
                        <p>
                          <strong>Role:</strong> {createdUser.data.role}
                        </p>
                        <p>
                          <strong>Created:</strong>{' '}
                          {new Date(createdUser.data.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              </div>

              {/* Navigation Buttons */}
              <div className={`flex gap-3 ${wizardStep === 4 ? 'mt-6 pt-4 border-t border-gray-200' : 'mt-8'}`}>
                {wizardStep !== 4 && (
                  <>
                    <button
                      onClick={handleCloseCreateModal}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    {wizardStep > 1 && (
                      <button
                        onClick={() => setWizardStep(wizardStep - 1)}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        ← Back
                      </button>
                    )}

                    {wizardStep < 3 && (
                      <button
                        onClick={() => setWizardStep(wizardStep + 1)}
                        disabled={!validateStep(wizardStep) || isSubmitting}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        Next →
                      </button>
                    )}

                    {wizardStep === 3 && (
                      <button
                        onClick={handleCreateUser}
                        disabled={!validateStep(3) || isSubmitting}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? 'Creating...' : '✓ Create User'}
                      </button>
                    )}
                  </>
                )}

                {wizardStep === 4 && (
                  <>
                    <button
                      onClick={() => {
                        router.push(`/admin/portal/users/${createdUser.data.id}`);
                        handleCloseCreateModal();
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      👁️ View User Details
                    </button>
                    <button
                      onClick={handleCloseCreateModal}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Done
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

type Organization = {
  id: string;
  name: string;
  slug: string;
};

export default function TenantChooserPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [userRole, setUserRole] = useState<string>('USER');
  const [loading, setLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const isSystemAdmin = userRole === 'GLOBAL_ADMIN' || userRole === 'ADMIN';

  useEffect(() => {
    async function fetchOrgs() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (!response.ok) {
          router.push('/login');
          return;
        }

        const data = await response.json();
        setOrgs(data.organizations ?? []);
        setUserRole(data.role ?? 'USER');
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    fetchOrgs();
  }, [router]);

  function handleSelectOrgAndRedirect(orgId: string) {
    setSelectedOrgId(orgId);
    // Brief delay for visual feedback
    setTimeout(() => {
      router.push(`/tenant/${orgId}`);
    }, 300);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex gap-2 mb-4">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="w-3 h-3 rounded-full bg-blue-600"
            />
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
              className="w-3 h-3 rounded-full bg-purple-600"
            />
          </div>
          <p className="text-gray-600">Loading your organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-blue-100 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Workspace</span>
          </h1>
          <p className="text-xl text-gray-600">
            Select which organization you'd like to access
          </p>
        </motion.div>

        {/* Card Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* System Admin Portal card — shown first for admins */}
          {isSystemAdmin && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-slate-700 to-gray-900 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-all duration-300 -z-10" />
              <Link href="/admin/portal" className="block h-full">
                <div className="relative bg-gradient-to-br from-slate-800 to-gray-900 rounded-2xl p-8 border border-slate-600 group-hover:border-slate-400 transition-all duration-300 h-full">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-slate-500 to-gray-600 flex items-center justify-center mb-4">
                    <span className="text-white text-xl">⚙️</span>
                  </div>

                  {/* Badge */}
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {userRole === 'GLOBAL_ADMIN' ? '★ Global Admin' : '★ System Admin'}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl font-bold text-white mb-2">
                    System Admin Portal
                  </h2>

                  <p className="text-sm text-slate-400 mb-4">
                    Manage tenants, users, policies &amp; platform settings
                  </p>

                  <motion.div
                    whileHover={{ x: 4 }}
                    className="text-sm font-semibold text-amber-400 group-hover:text-amber-300 flex items-center gap-2"
                  >
                    Enter portal
                    <span>→</span>
                  </motion.div>
                </div>
              </Link>
            </motion.div>
          )}

          {/* Tenant org cards */}
          {orgs.map((org, index) => (
            <motion.button
              key={org.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: (index + (isSystemAdmin ? 1 : 0)) * 0.1 }}
              onClick={() => handleSelectOrgAndRedirect(org.id)}
              disabled={selectedOrgId !== null}
              className="relative group text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-all duration-300 -z-10" />
              <div className="relative bg-white rounded-2xl p-8 border border-blue-100 group-hover:border-blue-300 transition-all duration-300 h-full">
                {/* Org Icon */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-lg">
                    {org.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Org Name */}
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {org.name}
                </h2>

                {/* Org Slug */}
                <p className="text-sm text-gray-500 mb-4">
                  {org.slug}
                </p>

                {/* CTA */}
                <motion.div
                  whileHover={{ x: 4 }}
                  className="text-sm font-semibold text-blue-600 group-hover:text-blue-700 flex items-center gap-2"
                >
                  Continue
                  <span>→</span>
                </motion.div>

                {/* Loading State */}
                {selectedOrgId === org.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4"
                  >
                    <div className="w-5 h-5 rounded-full border-2 border-transparent border-t-blue-600 animate-spin" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}

          {/* Empty state for non-admin with no orgs */}
          {!isSystemAdmin && orgs.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="md:col-span-2 lg:col-span-3 text-center py-16"
            >
              <p className="text-gray-500 text-lg mb-4">You don't belong to any organizations yet.</p>
              <Link href="/contact" className="text-blue-600 hover:underline font-medium">Contact support to get access →</Link>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-gray-600">
            Don't see the organization you're looking for?{' '}
            <Link
              href="/contact"
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Contact support
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

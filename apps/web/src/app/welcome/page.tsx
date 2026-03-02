'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

type UserWithOrgs = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

export default function WelcomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithOrgs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserAndRedirect() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (!response.ok) {
          router.push('/login');
          return;
        }

        const userData = (await response.json()) as UserWithOrgs;
        setUser(userData);

        // Auto-redirect after 3.5 seconds
        const timer = setTimeout(() => {
          determineRedirect(userData);
        }, 3500);

        return () => clearTimeout(timer);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    fetchUserAndRedirect();
  }, [router]);

  function determineRedirect(userData: UserWithOrgs) {
    const isGlobalAdmin = userData.role === 'GLOBAL_ADMIN';
    const orgCount = userData.organizations.length;

    if (isGlobalAdmin) {
      if (orgCount === 0) {
        // System admin only, no orgs
        router.push('/admin/portal');
      } else if (orgCount === 1) {
        // System admin with single org
        router.push(`/tenant/${userData.organizations[0].id}`);
      } else {
        // System admin with multiple orgs
        router.push('/tenant-chooser');
      }
    } else {
      if (orgCount === 0) {
        // No access (shouldn't happen, but failsafe)
        router.push('/get-started');
      } else if (orgCount === 1) {
        // Single org access
        router.push(`/tenant/${userData.organizations[0].id}`);
      } else {
        // Multiple orgs, show chooser
        router.push('/tenant-chooser');
      }
    }
  }

  const displayName = user?.name || user?.email?.split('@')[0] || '';
  const displayTenant = user?.role === 'GLOBAL_ADMIN' 
    ? 'CampaignSites' 
    : user?.organizations[0]?.name || 'Your Organization';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-blue-100 flex items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        {/* Animated Logo/Icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-8"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mx-auto flex items-center justify-center">
            <span className="text-3xl text-white font-bold">✓</span>
          </div>
        </motion.div>

        {/* Greeting Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            {loading || !displayName ? (
              'Welcome'
            ) : (
              <>
                Welcome,{' '}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {displayName}
                </span>
              </>
            )}
          </h1>
        </motion.div>

        {/* Tenant Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
        >
          <p className="text-xl text-gray-600 mb-8">
            Logging into <span className="font-semibold text-gray-900">{displayTenant}</span>
          </p>
        </motion.div>

        {/* Loading Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.6 }}
          className="flex justify-center gap-2"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-3 h-3 rounded-full bg-blue-600"
          />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            className="w-3 h-3 rounded-full bg-purple-600"
          />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            className="w-3 h-3 rounded-full bg-blue-600"
          />
        </motion.div>

        <p className="text-gray-500 text-sm mt-8">
          Preparing your environment...
        </p>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TenantTopBarProps {
  title: string;
  subtitle?: string;
  orgId: string;
}

export function TenantTopBar({ title, subtitle, orgId }: TenantTopBarProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [sessionUser, setSessionUser] = useState<{
    id: string;
    email: string;
    name: string | null;
    role: 'USER' | 'ADMIN' | 'GLOBAL_ADMIN';
    organizations: Array<{ id: string; name: string; slug: string }>;
  } | null>(null);

  useEffect(() => {
    let active = true;

    const fetchSessionUser = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (active) {
          setSessionUser(data);
        }
      } catch {
      }
    };

    fetchSessionUser();

    const handleUserUpdate = () => {
      fetchSessionUser();
    };

    window.addEventListener('user-profile-updated', handleUserUpdate);

    return () => {
      active = false;
      window.removeEventListener('user-profile-updated', handleUserUpdate);
    };
  }, []);

  const currentOrg = sessionUser?.organizations?.find((o) => o.id === orgId);
  const orgName = currentOrg?.name ?? 'Organization';

  const displayName = sessionUser?.name || sessionUser?.email || 'User';
  const displayEmail = sessionUser?.email || '';
  const displayRole = sessionUser?.role === 'GLOBAL_ADMIN' ? 'Global Admin' : (sessionUser?.role ?? 'Member');

  const avatarLetter = useMemo(
    () => (displayName?.charAt(0) || 'U').toUpperCase(),
    [displayName]
  );

  const menuVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.95 },
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setShowUserMenu(false);
      setIsSigningOut(false);
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <nav className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-40">
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-medium">{orgName}</span>
            <span className="text-gray-300">·</span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {title}
            </h1>
          </div>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
              {avatarLetter}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-600">{displayRole}</p>
            </div>
            <span className={`text-gray-600 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                variants={menuVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-600">{displayEmail}</p>
                </div>
                <Link
                  href={`/tenant/${orgId}/profile`}
                  className="w-full block text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  👤 Profile Settings
                </Link>
                <Link
                  href={`/tenant/${orgId}/settings/notifications`}
                  className="w-full block text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  🔔 Notifications
                </Link>
                <div className="border-t border-gray-100">
                  <button
                    type="button"
                    className="w-full block text-left px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors disabled:opacity-60"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                  >
                    {isSigningOut ? 'Signing out...' : '🚪 Sign Out'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TopBarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export function TopBar({ title, subtitle, onMenuClick }: TopBarProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [sessionUser, setSessionUser] = useState<{
    id: string;
    email: string;
    name: string | null;
    role: 'USER' | 'ADMIN' | 'GLOBAL_ADMIN';
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

    // Listen for user profile updates from profile/password pages
    const handleUserUpdate = () => {
      fetchSessionUser();
    };

    window.addEventListener('user-profile-updated', handleUserUpdate);

    return () => {
      active = false;
      window.removeEventListener('user-profile-updated', handleUserUpdate);
    };
  }, []);

  const displayName = sessionUser?.name || sessionUser?.email || 'Admin User';
  const displayEmail = sessionUser?.email || 'admin@campaignsites.com';
  const displayRole = sessionUser?.role
    ? sessionUser.role.replace(/_/g, ' ')
    : 'Global Admin';
  const avatarLetter = useMemo(
    () => (displayName?.charAt(0) || 'A').toUpperCase(),
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
      <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
            {title}
          </h1>
          {subtitle && <p className="text-xs sm:text-sm text-gray-600 truncate">{subtitle}</p>}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
              {avatarLetter}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-600">{displayRole}</p>
            </div>
            <span className={`text-gray-600 transition-transform hidden sm:block ${showUserMenu ? 'rotate-180' : ''}`}>
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
                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-600">{displayEmail}</p>
                </div>
                <Link
                  href="/admin/portal/profile"
                  className="w-full block text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  👤 Profile Settings
                </Link>
                <Link
                  href="/admin/portal/password"
                  className="w-full block text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  🔐 Change Password
                </Link>
                <Link
                  href="/admin/portal/notifications"
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

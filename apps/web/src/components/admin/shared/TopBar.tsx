'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
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

    return () => {
      active = false;
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

  return (
    <nav className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-40">
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {title}
          </h1>
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
                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-600">{displayEmail}</p>
                </div>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  👤 Profile Settings
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  🔐 Change Password
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  🔔 Notifications
                </button>
                <div className="border-t border-gray-100">
                  <Link
                    href="/login"
                    className="w-full block text-left px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    🚪 Sign Out
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}

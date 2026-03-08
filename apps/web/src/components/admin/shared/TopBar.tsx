'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TopBarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
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
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [markingRead, setMarkingRead] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications/count', { credentials: 'include' });
      if (r.ok) {
        const d = await r.json();
        setUnreadCount(d.unreadCount ?? 0);
      }
    } catch {}
  }, []);

  const fetchNotifs = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications?limit=10', { credentials: 'include' });
      if (r.ok) {
        const d = await r.json();
        setNotifs(d.data ?? []);
        setUnreadCount(d.unreadCount ?? 0);
      }
    } catch {}
  }, []);

  // Poll unread count every 30 s
  useEffect(() => {
    fetchCount();
    const t = setInterval(fetchCount, 30_000);
    return () => clearInterval(t);
  }, [fetchCount]);

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return;
    function handle(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [notifOpen]);

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

        {/* Notification Bell + User Menu */}
        <div className="flex items-center gap-2">
          {/* Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchNotifs(); }}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  variants={menuVariants}
                  initial="hidden" animate="visible" exit="exit"
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        disabled={markingRead}
                        onClick={async () => {
                          setMarkingRead(true);
                          try {
                            await fetch('/api/notifications', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ all: true }),
                            });
                            await fetchNotifs();
                          } catch {} finally { setMarkingRead(false); }
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                    {notifs.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-gray-400">No notifications yet</p>
                    ) : notifs.map((n) => (
                      <div key={n.id} className={`px-4 py-3 text-sm ${n.readAt ? 'opacity-60' : 'bg-blue-50/40'}`}>
                        <p className="font-medium text-gray-900 leading-snug">{n.title}</p>
                        <p className="text-gray-600 text-xs mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-gray-400 text-xs mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-100">
                    <Link href="/admin/portal/notifications" onClick={() => setNotifOpen(false)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      View all notifications →
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
      </div>
    </nav>
  );
}

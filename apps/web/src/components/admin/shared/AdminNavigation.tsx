'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  active?: boolean;
}

interface AdminNavigationProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export function AdminNavigation({ isMobileOpen = false, onClose }: AdminNavigationProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/admin/portal', icon: '📊' },
    { label: 'Users', href: '/admin/portal/users', icon: '👥' },
    { label: 'Organizations', href: '/admin/portal/organizations', icon: '🏢' },
    { label: 'Websites', href: '/admin/portal/websites', icon: '🌐' },
    { label: 'Build & LLM', href: '/admin/portal/jobs', icon: '⚙️' },
    { label: 'Monitoring', href: '/admin/portal/monitoring', icon: '📈' },
    { label: 'Logs & Audit', href: '/admin/portal/logs', icon: '📝' },
    { label: 'Hierarchy', href: '/admin/portal/hierarchy', icon: '🌳' },
    { label: 'Governance', href: '/admin/portal/governance', icon: '⚖️' },
    { label: 'Policies', href: '/admin/portal/policies', icon: '📋' },
    { label: 'Security', href: '/admin/portal/security', icon: '🔐' },
    { label: 'Settings', href: '/admin/portal/settings', icon: '⚙️' },
    { label: 'Analytics', href: '/admin/portal/analytics', icon: '📉' },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 flex flex-col
          lg:relative lg:sticky lg:top-0 lg:z-auto lg:h-screen
          bg-gradient-to-b from-slate-900 to-slate-800 text-white border-r border-slate-700
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-shrink-0 p-5 border-b border-slate-700 flex items-center justify-between"
        >
          <Link href="/admin/portal" className="flex items-center gap-2" onClick={onClose}>
            <span className="text-2xl">🛡️</span>
            <div>
              <h2 className="font-bold text-lg leading-tight">CampaignSites</h2>
              <p className="text-xs text-slate-400">Admin Portal</p>
            </div>
          </Link>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0"
            aria-label="Close menu"
          >
            ✕
          </button>
        </motion.div>

        {/* Navigation Items — scrollable */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item, index) => {
            const isDashboardRoute = item.href === '/admin/portal';
            const isActive = isDashboardRoute
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
              >
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span className="text-base flex-shrink-0">{item.icon}</span>
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-1 h-5 bg-white rounded-full"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex-shrink-0 p-4 border-t border-slate-700 bg-slate-900"
        >
          <p className="text-xs text-slate-500 text-center">Admin Portal v1.0</p>
        </motion.div>
      </aside>
    </>
  );
}


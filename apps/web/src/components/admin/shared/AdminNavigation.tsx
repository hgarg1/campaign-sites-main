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

export function AdminNavigation() {
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
    { label: 'Settings', href: '/admin/portal/settings', icon: '⚙️' },
    { label: 'Analytics', href: '/admin/portal/analytics', icon: '📉' },
  ];

  return (
    <aside className="sticky top-0 h-screen w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white border-r border-slate-700 flex flex-col overflow-hidden">
      {/* Logo Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex-shrink-0 p-6 border-b border-slate-700"
      >
        <Link href="/admin/portal" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <div>
            <h2 className="font-bold text-lg">CampaignSites</h2>
            <p className="text-xs text-slate-400">Admin Portal</p>
          </div>
        </Link>
      </motion.div>

      {/* Navigation Items — scrollable */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
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
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-1 h-6 bg-white rounded-r"
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
        <p className="text-xs text-slate-500 text-center">
          Admin Portal v1.0
        </p>
      </motion.div>
    </aside>
  );
}

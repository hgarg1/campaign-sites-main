'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface TenantNavigationProps {
  orgId: string;
}

export function TenantNavigation({ orgId }: TenantNavigationProps) {
  const pathname = usePathname();
  const [govUnread, setGovUnread] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch(`/api/tenant/${orgId}/notifications/governance?unreadCount=true`);
        if (res.ok) {
          const data = await res.json();
          setGovUnread(data.count ?? 0);
        }
      } catch {}
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [orgId]);

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: `/tenant/${orgId}`, icon: '📊' },
    { label: 'Websites', href: `/tenant/${orgId}/websites`, icon: '🌐' },
    { label: 'Hierarchy', href: `/tenant/${orgId}/hierarchy`, icon: '🌳' },
    { label: 'Governance', href: `/tenant/${orgId}/governance`, icon: '⚖️' },
    { label: 'Team', href: `/tenant/${orgId}/team`, icon: '👥' },
    { label: 'Integrations', href: `/tenant/${orgId}/integrations`, icon: '🔌' },
    { label: 'Analytics', href: `/tenant/${orgId}/analytics`, icon: '📈' },
    { label: 'Usage', href: `/tenant/${orgId}/usage`, icon: '💾' },
    { label: 'Settings', href: `/tenant/${orgId}/settings`, icon: '⚙️' },
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
        <Link href={`/tenant/${orgId}`} className="flex items-center gap-2">
          <span className="text-2xl">🏢</span>
          <div>
            <h2 className="font-bold text-lg">CampaignSites</h2>
            <p className="text-xs text-slate-400">Tenant Portal</p>
          </div>
        </Link>
        <Link
          href="/tenant-chooser"
          className="mt-4 flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-600 hover:border-slate-500 text-slate-200 hover:text-white text-sm font-medium transition-all duration-200"
        >
          <span>⇄</span>
          Switch Organization
        </Link>
      </motion.div>

      {/* Navigation Items — scrollable */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {navItems.map((item, index) => {
          const isDashboardRoute = item.href === `/tenant/${orgId}`;
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
                {item.label === 'Governance' && govUnread > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {govUnread > 9 ? '9+' : govUnread}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="tenantActiveIndicator"
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
          Tenant Portal v1.0
        </p>
      </motion.div>
    </aside>
  );
}

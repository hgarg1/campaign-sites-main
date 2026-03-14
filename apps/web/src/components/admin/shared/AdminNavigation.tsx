'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSystemAdminPermissions } from '@/hooks/use-system-admin-permissions';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  active?: boolean;
  requiredClaim?: string; // Permission required to see this item
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface AdminNavigationProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export function AdminNavigation({ isMobileOpen = false, onClose }: AdminNavigationProps) {
  const pathname = usePathname();
  const [userOrgs, setUserOrgs] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [orgsExpanded, setOrgsExpanded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Core', 'RBAC']));
  const { hasPermission } = useSystemAdminPermissions();

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.organizations?.length) setUserOrgs(d.organizations); })
      .catch(() => {});
  }, []);

  const navGroups: NavGroup[] = [
    {
      label: 'Core',
      items: [
        { label: 'Dashboard', href: '/admin/portal', icon: '📊' },
        { label: 'Users', href: '/admin/portal/users', icon: '👥', requiredClaim: 'system_admin_portal:users:read' },
        { label: 'Organizations', href: '/admin/portal/organizations', icon: '🏢', requiredClaim: 'system_admin_portal:organizations:read' },
        { label: 'Websites', href: '/admin/portal/websites', icon: '🌐', requiredClaim: 'system_admin_portal:websites:read' },
      ]
    },
    {
      label: 'Operations',
      items: [
        { label: 'Build & LLM', href: '/admin/portal/jobs', icon: '⚙️', requiredClaim: 'system_admin_portal:jobs:read' },
        { label: 'Monitoring', href: '/admin/portal/monitoring', icon: '📈', requiredClaim: 'system_admin_portal:monitoring:read' },
        { label: 'Logs & Audit', href: '/admin/portal/logs', icon: '📝', requiredClaim: 'system_admin_portal:logs:read' },
        { label: 'Analytics', href: '/admin/portal/analytics', icon: '📉', requiredClaim: 'system_admin_portal:analytics:read' },
      ]
    },
    {
      label: 'RBAC',
      items: [
        { label: 'Roles', href: '/admin/portal/rbac/roles', icon: '👔', requiredClaim: 'system_admin_portal:rbac:view_roles' },
        { label: 'Permissions', href: '/admin/portal/rbac/permissions', icon: '🔐', requiredClaim: 'system_admin_portal:rbac:view_permissions' },
        { label: 'Admin Hierarchy', href: '/admin/portal/rbac/admin-hierarchy', icon: '🔗', requiredClaim: 'system_admin_portal:rbac:view_hierarchy' },
        { label: 'Permission Overrides', href: '/admin/portal/rbac/permission-overrides', icon: '🛡️', requiredClaim: 'system_admin_portal:rbac:view_overrides' },
      ]
    },
    {
      label: 'Governance',
      items: [
        { label: 'Policies', href: '/admin/portal/policies', icon: '📋', requiredClaim: 'system_admin_portal:policies:read' },
        { label: 'Governance', href: '/admin/portal/governance', icon: '⚖️', requiredClaim: 'system_admin_portal:governance:read' },
        { label: 'Master Tenants', href: '/admin/portal/master-tenants', icon: '🏛️', requiredClaim: 'system_admin_portal:master_tenants:read' },
      ]
    },
    {
      label: 'System',
      items: [
        { label: 'Security', href: '/admin/portal/security', icon: '🔐', requiredClaim: 'system_admin_portal:security:read' },
        { label: 'Settings', href: '/admin/portal/settings', icon: '⚙️', requiredClaim: 'system_admin_portal:settings:read' },
        { label: 'Desktop App', href: '/admin/portal/download', icon: '📥' },
      ]
    }
  ];

  const toggleGroupExpanded = (groupLabel: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupLabel)) {
        newSet.delete(groupLabel);
      } else {
        newSet.add(groupLabel);
      }
      return newSet;
    });
  };

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
          fixed inset-y-0 left-0 z-40 flex flex-col
          lg:relative lg:sticky lg:top-0 lg:z-auto lg:h-screen
          bg-gradient-to-b from-slate-900 to-slate-800 text-white border-r border-slate-700
          transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-shrink-0 p-5 border-b border-slate-700 flex items-center justify-between gap-2"
        >
          {!sidebarCollapsed && (
            <Link href="/admin/portal" className="flex items-center gap-2 min-w-0 flex-1" onClick={onClose}>
              <span className="text-2xl flex-shrink-0">🛡️</span>
              <div className="min-w-0">
                <h2 className="font-bold text-lg leading-tight">CampaignSites</h2>
                <p className="text-xs text-slate-400">Admin Portal</p>
              </div>
            </Link>
          )}
          
          {/* Collapse button (desktop only) */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex w-8 h-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>

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
        <nav className="flex-1 overflow-y-auto p-3 space-y-2">
          {navGroups.map((group, groupIndex) => {
            // Filter items to only those with permission
            const visibleItems = group.items.filter(item => !item.requiredClaim || hasPermission(item.requiredClaim));
            
            if (visibleItems.length === 0) {
              return null; // Hide group if no visible items
            }

            const isExpanded = expandedGroups.has(group.label);

            return (
              <div key={group.label}>
                {/* Group Header */}
                {!sidebarCollapsed && (
                  <button
                    onClick={() => toggleGroupExpanded(group.label)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-slate-700/50 text-slate-300 hover:text-white mb-1"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider flex-1 text-left">{group.label}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7-7m0 0L5 14m7-7v12" />
                    </svg>
                  </button>
                )}

                {/* Group Items */}
                {isExpanded && (
                  <div className="space-y-1 pl-2">
                    {visibleItems.map((item, itemIndex) => {
                      const isDashboardRoute = item.href === '/admin/portal';
                      const isActive = isDashboardRoute
                        ? pathname === item.href
                        : pathname === item.href || pathname.startsWith(item.href + '/');

                      return (
                        <motion.div
                          key={item.href}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: (groupIndex * 5 + itemIndex) * 0.02 }}
                        >
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                            title={sidebarCollapsed ? item.label : undefined}
                          >
                            <span className="text-base flex-shrink-0">{item.icon}</span>
                            {!sidebarCollapsed && (
                              <>
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
                              </>
                            )}
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Tenant Switcher — shown when system admin also has tenant org memberships */}
        {userOrgs.length > 0 && !sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex-shrink-0 p-3 border-t border-slate-700"
          >
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">My Organizations</p>
              <button
                onClick={() => setOrgsExpanded(!orgsExpanded)}
                className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
                aria-label={orgsExpanded ? 'Collapse organizations' : 'Expand organizations'}
              >
                <motion.span
                  animate={{ rotate: orgsExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="inline-block"
                >
                  ▼
                </motion.span>
              </button>
            </div>
            {orgsExpanded && (
              <motion.div
                className="space-y-1"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                {userOrgs.slice(0, 3).map((org) => (
                  <Link
                    key={org.id}
                    href={`/tenant/${org.id}`}
                    onClick={onClose}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-sm"
                  >
                    <span className="text-xs">🏢</span>
                    <span className="truncate">{org.name}</span>
                  </Link>
                ))}
                {userOrgs.length > 3 && (
                  <p className="text-xs text-slate-500 px-3 py-1">
                    +{userOrgs.length - 3} more
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex-shrink-0 p-4 border-t border-slate-700 bg-slate-900"
        >
          {orgsExpanded && userOrgs.length > 0 && !sidebarCollapsed ? (
            <Link
              href="/tenant-chooser"
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-all"
            >
              <span>⇄</span>
              Switch to Tenant Portal
            </Link>
          ) : (
            <p className="text-xs text-slate-500 text-center">{sidebarCollapsed ? '📍' : 'Admin Portal v1.0'}</p>
          )}
        </motion.div>
      </aside>
    </>
  );
}

'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TenantLayout } from '@/components/tenant/shared';
import { MetricCard } from '@/components/admin/shared';
import { useTenantOrg } from '@/hooks/useTenant';
import { useTenantWebsites } from '@/hooks/useTenantWebsites';

interface AncestorNode { id: string; name: string; slug: string; partyAffiliation: string | null; ownStatus: string; depth: number; }
interface AncestryData { org: { id: string; name: string }; ancestors: AncestorNode[]; }
interface AggregateData { totalDescendants: number; totalMembers: number; totalWebsites: number; activeDescendants: number; suspendedDescendants: number; deactivatedDescendants: number; recentBuilds: number; }

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    PUBLISHED: 'bg-green-100 text-green-700',
    DRAFT: 'bg-yellow-100 text-yellow-700',
    BUILDING: 'bg-blue-100 text-blue-700',
    AUDITING: 'bg-blue-100 text-blue-700',
    DEPLOYING: 'bg-blue-100 text-blue-700',
    FAILED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

export default function TenantDashboardPage() {
  const params = useParams();
  const orgId = params.id as string;

  const { data: org, loading: orgLoading } = useTenantOrg(orgId);
  const { data: websites, loading: websitesLoading } = useTenantWebsites(orgId, { pageSize: 5 });

  const [ancestryData, setAncestryData] = useState<AncestryData | null>(null);
  const [aggregateData, setAggregateData] = useState<AggregateData | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      globalThis.fetch(`/api/tenant/${orgId}/ancestry`).then(r => r.ok ? r.json() : null).catch(() => null),
      globalThis.fetch(`/api/tenant/${orgId}/descendants/aggregate`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([ancestry, aggregate]) => {
      if (!active) return;
      if (ancestry) setAncestryData(ancestry);
      if (aggregate) setAggregateData(aggregate);
    });
    return () => { active = false; };
  }, [orgId]);

  const loading = orgLoading;

  const quickActions = [
    { title: 'Create Website', icon: '🌐', color: 'from-blue-600 to-blue-400', href: `/tenant/${orgId}/websites/new` },
    { title: 'Manage Team', icon: '👥', color: 'from-purple-600 to-purple-400', href: `/tenant/${orgId}/team` },
    { title: 'Settings', icon: '⚙️', color: 'from-orange-600 to-orange-400', href: `/tenant/${orgId}/settings` },
    { title: 'Analytics', icon: '📊', color: 'from-green-600 to-green-400', href: `/tenant/${orgId}/analytics` },
  ];

  if (loading) {
    return (
      <TenantLayout title="Dashboard" orgId={orgId}>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TenantLayout>
    );
  }

  const successRate = websites && websites.length > 0
    ? Math.round((websites.filter(w => w.status === 'PUBLISHED').length / websites.length) * 100)
    : 0;

  const storageGb = org ? (org.storageUsedMb / 1024).toFixed(1) + ' GB' : '—';

  return (
    <TenantLayout title="Dashboard" subtitle={org?.name || 'Tenant Portal'} orgId={orgId}>
      {/* Hierarchy breadcrumb banner */}
      {ancestryData && ancestryData.ancestors.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-xs text-blue-500 font-medium mb-1">Organization Hierarchy</p>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-blue-600 font-medium">Part of:</span>
            {[...ancestryData.ancestors].sort((a, b) => a.depth - b.depth).map((anc, i) => (
              <span key={anc.id} className="flex items-center gap-1">
                {i > 0 && <span className="text-blue-400">→</span>}
                <Link href={`/tenant/${anc.id}`} className="text-blue-700 hover:text-blue-800 font-medium">{anc.name}</Link>
              </span>
            ))}
            <span className="text-blue-400">→</span>
            <span className="font-bold text-blue-900">{org?.name ?? 'Your Org'}</span>
          </div>
        </div>
      )}

      {/* Your Network summary */}
      {aggregateData && aggregateData.totalDescendants > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">🌳 Your Network</h2>
            <Link href={`/tenant/${orgId}/hierarchy`} className="text-sm text-blue-600 hover:text-blue-700 font-medium">View Hierarchy →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-2xl font-bold text-gray-900">{aggregateData.totalDescendants}</p><p className="text-xs text-gray-500">Child Orgs</p></div>
            <div><p className="text-2xl font-bold text-gray-900">{aggregateData.totalMembers}</p><p className="text-xs text-gray-500">Total Members</p></div>
            <div><p className="text-2xl font-bold text-gray-900">{aggregateData.totalWebsites}</p><p className="text-xs text-gray-500">Total Websites</p></div>
            <div><p className="text-2xl font-bold text-gray-900">{aggregateData.recentBuilds}</p><p className="text-xs text-gray-500">Recent Builds</p></div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-6 mb-10">
        <MetricCard label="Total Websites" value={org?.websiteCount ?? 0} icon="🌐" variant="default" />
        <MetricCard label="Team Members" value={org?.memberCount ?? 0} icon="👥" variant="success" />
        <MetricCard label="Storage Used" value={storageGb} icon="💾" variant="default" />
        <MetricCard
          label="Build Success Rate"
          value={`${successRate}%`}
          icon="✓"
          variant={successRate >= 90 ? 'success' : successRate >= 70 ? 'warning' : 'danger'}
        />
      </div>

      <div className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
            >
              <Link href={action.href} className="relative group block">
                <div className={`absolute inset-0 bg-gradient-to-r ${action.color} rounded-xl opacity-0 group-hover:opacity-100 blur transition-all duration-300 -z-10`} />
                <div className="relative bg-white rounded-xl border border-gray-200 group-hover:border-transparent p-6 text-center transition-all duration-300 flex flex-col items-center gap-3 h-full">
                  <span className="text-3xl">{action.icon}</span>
                  <p className="font-semibold text-gray-900">{action.title}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Recent Websites</h2>
          <Link href={`/tenant/${orgId}/websites`} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all →
          </Link>
        </div>
        {websitesLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : websites && websites.length > 0 ? (
          <div className="space-y-3">
            {websites.slice(0, 5).map(website => (
              <div key={website.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{website.name}</p>
                  <p className="text-xs text-gray-500">{website.domain || website.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={website.status} />
                  <Link href={`/tenant/${orgId}/websites/${website.id}`} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                    Edit →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-3">No websites yet.</p>
            <Link href={`/tenant/${orgId}/websites/new`} className="text-blue-600 hover:text-blue-700 font-medium">
              Create your first website →
            </Link>
          </div>
        )}
      </div>

      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {websites && websites.slice(0, 3).map(website => (
            <div key={website.id} className="flex items-center gap-3 text-sm">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${website.status === 'PUBLISHED' ? 'bg-green-500' : website.status === 'FAILED' ? 'bg-red-500' : 'bg-blue-500'}`} />
              <span className="text-gray-700">
                <span className="font-medium">{website.name}</span>
                {' — '}
                {website.status === 'PUBLISHED' ? 'Published successfully' : website.status === 'FAILED' ? 'Build failed' : `Status: ${website.status}`}
              </span>
              <span className="text-gray-400 ml-auto text-xs">
                {website.updatedAt ? new Date(website.updatedAt).toLocaleDateString() : ''}
              </span>
            </div>
          ))}
          {(!websites || websites.length === 0) && (
            <p className="text-gray-500 text-sm">No recent activity.</p>
          )}
        </div>
      </div>
    </TenantLayout>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/shared';

interface OrgTreeNode {
  id: string;
  name: string;
  slug: string;
  partyAffiliation: string | null;
  ownStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  effectiveStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  canCreateChildren: boolean;
  setupCompletedAt: string | null;
  children: OrgTreeNode[];
}

const PARTY_COLORS: Record<string, string> = {
  REPUBLICAN: 'bg-red-100 text-red-700',
  DEMOCRAT: 'bg-blue-100 text-blue-700',
  LIBERTARIAN: 'bg-yellow-100 text-yellow-700',
  GREEN: 'bg-green-100 text-green-700',
  INDEPENDENT: 'bg-gray-100 text-gray-700',
  NONPARTISAN: 'bg-slate-100 text-slate-700',
  OTHER: 'bg-purple-100 text-purple-700',
};

const PARTY_LABELS: Record<string, string> = {
  REPUBLICAN: 'Republican',
  DEMOCRAT: 'Democrat',
  LIBERTARIAN: 'Libertarian',
  GREEN: 'Green',
  INDEPENDENT: 'Independent',
  NONPARTISAN: 'Nonpartisan',
  OTHER: 'Other',
};

const ALL_PARTIES = ['REPUBLICAN', 'DEMOCRAT', 'LIBERTARIAN', 'GREEN', 'INDEPENDENT', 'NONPARTISAN', 'OTHER'] as const;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-yellow-100 text-yellow-700',
  DEACTIVATED: 'bg-red-100 text-red-700',
};

function countAllNodes(nodes: OrgTreeNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countAllNodes(n.children), 0);
}

function collectAllIds(nodes: OrgTreeNode[]): Set<string> {
  const ids = new Set<string>();
  function traverse(ns: OrgTreeNode[]) {
    for (const n of ns) { ids.add(n.id); traverse(n.children); }
  }
  traverse(nodes);
  return ids;
}

function matchesFilter(node: OrgTreeNode, search: string, statusFilter: string, partyFilter: string): boolean {
  const nameMatch = !search || node.name.toLowerCase().includes(search.toLowerCase()) || node.slug.toLowerCase().includes(search.toLowerCase());
  const statusMatch = statusFilter === 'ALL' || node.ownStatus === statusFilter;
  const partyMatch = partyFilter === 'ALL' || node.partyAffiliation === partyFilter;
  if (nameMatch && statusMatch && partyMatch) return true;
  return node.children.some((c) => matchesFilter(c, search, statusFilter, partyFilter));
}

function filterTree(nodes: OrgTreeNode[], search: string, statusFilter: string, partyFilter: string): OrgTreeNode[] {
  return nodes
    .filter((n) => matchesFilter(n, search, statusFilter, partyFilter))
    .map((n) => ({ ...n, children: filterTree(n.children, search, statusFilter, partyFilter) }));
}

interface TreeNodeProps {
  node: OrgTreeNode;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  filtersActive: boolean;
}

function TreeNode({ node, depth, expandedIds, onToggle, filtersActive }: TreeNodeProps) {
  const router = useRouter();
  const isExpanded = filtersActive || expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isAncestorSuspended = node.effectiveStatus !== node.ownStatus;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg group"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          {hasChildren ? (isExpanded ? '▼' : '▶') : <span className="w-4" />}
        </button>

        {/* Org name */}
        <button
          onClick={() => router.push(`/admin/portal/hierarchy/${node.id}`)}
          className="font-medium text-gray-900 hover:text-blue-600 text-sm text-left"
        >
          {node.name}
        </button>

        <span className="text-xs text-gray-400 font-mono">{node.slug}</span>

        {/* Party badge */}
        {node.partyAffiliation && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PARTY_COLORS[node.partyAffiliation] ?? 'bg-gray-100 text-gray-700'}`}>
            {PARTY_LABELS[node.partyAffiliation] ?? node.partyAffiliation}
          </span>
        )}

        {/* Status badge */}
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[node.ownStatus]}`}>
          {node.ownStatus}
        </span>

        {/* Ancestor suspension warning */}
        {isAncestorSuspended && (
          <span className="text-xs text-orange-600 font-medium">(suspended by ancestor)</span>
        )}

        {/* Child count */}
        {hasChildren && (
          <span className="text-xs text-gray-400 ml-auto">{node.children.length} direct children</span>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="border-l border-gray-100 ml-6">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              filtersActive={filtersActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HierarchyPage() {
  const router = useRouter();
  const [tree, setTree] = useState<OrgTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'>('ALL');
  const [partyFilter, setPartyFilter] = useState<string>('ALL');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    globalThis.fetch('/api/admin/hierarchy')
      .then((r) => r.json())
      .then((data: { data: OrgTreeNode[] }) => {
        const nodes = data.data ?? [];
        setTree(nodes);
        setExpandedIds(new Set(nodes.map((n: OrgTreeNode) => n.id)));
      })
      .catch(() => setError('Failed to load hierarchy'))
      .finally(() => setLoading(false));
  }, []);

  const filtersActive = !!(search || statusFilter !== 'ALL' || partyFilter !== 'ALL');

  const filteredTree = useMemo(
    () => filtersActive ? filterTree(tree, search, statusFilter, partyFilter) : tree,
    [tree, search, statusFilter, partyFilter, filtersActive]
  );

  const totalCount = useMemo(() => countAllNodes(tree), [tree]);
  const filteredCount = useMemo(() => countAllNodes(filteredTree), [filteredTree]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function expandAll() { setExpandedIds(collectAllIds(tree)); }
  function collapseAll() { setExpandedIds(new Set()); }

  const STATUS_FILTERS: Array<{ label: string; value: 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' }> = [
    { label: 'All', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Suspended', value: 'SUSPENDED' },
    { label: 'Deactivated', value: 'DEACTIVATED' },
  ];

  return (
    <AdminLayout title="Organization Hierarchy" subtitle="Browse and manage the full organization tree">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{filtersActive ? `${filteredCount} of ${totalCount}` : totalCount} organizations</span>
          <span className="text-gray-300">|</span>
          <span>{tree.length} root orgs</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/admin/portal/master-tenants')}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            Manage Master Tenants
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-col gap-3">
          {/* Search row */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search by name or slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {filtersActive && (
              <button
                onClick={() => { setSearch(''); setStatusFilter('ALL'); setPartyFilter('ALL'); }}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Status filter row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide w-14">Status</span>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === f.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Party filter row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide w-14">Party</span>
            <button
              onClick={() => setPartyFilter('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                partyFilter === 'ALL'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {ALL_PARTIES.map((p) => (
              <button
                key={p}
                onClick={() => setPartyFilter(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  partyFilter === p
                    ? `${PARTY_COLORS[p]} border-transparent`
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {PARTY_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tree */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* Tree toolbar */}
        {!loading && !error && tree.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
            <span className="text-xs text-gray-500">
              {filtersActive ? `Showing ${filteredCount} matching organizations (auto-expanded)` : `${totalCount} organizations`}
            </span>
            {!filtersActive && (
              <div className="flex items-center gap-2">
                <button onClick={expandAll} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Expand All
                </button>
                <span className="text-gray-300">·</span>
                <button onClick={collapseAll} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Collapse All
                </button>
              </div>
            )}
          </div>
        )}

        <div className="p-4">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && filteredTree.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No organizations match the current filters</p>
              {filtersActive && (
                <button
                  onClick={() => { setSearch(''); setStatusFilter('ALL'); setPartyFilter('ALL'); }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {!loading && !error && filteredTree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              expandedIds={expandedIds}
              onToggle={toggleExpand}
              filtersActive={filtersActive}
            />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

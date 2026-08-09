/**
 * API endpoint to commit admin hierarchy changes
 * POST /api/admin/rbac/admin-hierarchy/commit
 *
 * Validates changes for cycles, then updates delegations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAdmin } from '@/lib/require-admin';
import { logSystemAdminAction } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

interface Edge {
  source: string;
  target: string;
}

/**
 * Detect cycles in a directed graph using DFS
 */
function hasCycle(edges: Edge[]): boolean {
  const graph = new Map<string, string[]>();

  // Build adjacency list
  for (const edge of edges) {
    if (!graph.has(edge.source)) {
      graph.set(edge.source, []);
    }
    graph.get(edge.source)!.push(edge.target);
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(node: string): boolean {
    visited.add(node);
    recStack.add(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true; // Cycle detected
      }
    }

    recStack.delete(node);
    return false;
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      if (dfs(node)) return true;
    }
  }

  return false;
}

export async function POST(request: NextRequest) {
  // Resolved outside the try so the failure path below can still attribute the
  // audit entry, and so the parsed body is available there without re-reading
  // the already-consumed request stream.
  const auth = await requireAdmin('system_admin_portal:rbac:edit_hierarchy');
  if (!auth.ok) return auth.error;
  const userId = auth.userId;

  let justification = 'Unknown';

  try {
    const body = await request.json();
    const { edges } = body;
    justification = body.justification;

    if (!Array.isArray(edges) || !justification) {
      return NextResponse.json(
        { error: 'edges (array) and justification are required' },
        { status: 400 }
      );
    }

    // Validate edges format
    for (const edge of edges) {
      if (!edge.source || !edge.target) {
        return NextResponse.json(
          { error: 'Each edge must have source and target' },
          { status: 400 }
        );
      }
    }

    // Check for cycles
    if (hasCycle(edges)) {
      return NextResponse.json(
        { error: 'Cycle detected in hierarchy. Admin delegation cannot form cycles.' },
        { status: 400 }
      );
    }

    // Verify all source and target admins exist
    const allAdminIds = new Set<string>();
    for (const edge of edges) {
      allAdminIds.add(edge.source);
      allAdminIds.add(edge.target);
    }

    const existingAdmins = await prisma.systemAdmin.findMany({
      where: { id: { in: Array.from(allAdminIds) } },
      select: { id: true },
    });

    const existingIds = new Set(existingAdmins.map((a) => a.id));
    for (const id of allAdminIds) {
      if (!existingIds.has(id)) {
        return NextResponse.json({ error: `System admin not found: ${id}` }, { status: 404 });
      }
    }

    // Delete all existing delegations and recreate
    await prisma.systemAdminDelegation.deleteMany({});

    // Create new delegations
    const newDelegations = await Promise.all(
      edges.map((edge) =>
        prisma.systemAdminDelegation.create({
          data: {
            delegatingAdminId: edge.source,
            delegatedToAdminId: edge.target,
          },
        })
      )
    );

    // TODO: Update closure table for efficient hierarchy queries
    // This would be a background job in production

    // Audit log
    await logSystemAdminAction({
      action: 'ADMIN_HIERARCHY_UPDATED',
      resourceType: 'AdminHierarchy',
      resourceId: 'global',
      resourceName: `Updated ${newDelegations.length} delegation relationships`,
      performedBy: userId,
      justification,
      status: 'success',
      changes: {
        edgeCount: edges.length,
        edgesCommitted: newDelegations.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Updated ${newDelegations.length} admin delegation relationships`,
      delegations: newDelegations,
    });
  } catch (error) {
    console.error('Failed to commit admin hierarchy:', error);

    // Audit log failure
    await logSystemAdminAction({
      action: 'ADMIN_HIERARCHY_UPDATE_FAILED',
      resourceType: 'AdminHierarchy',
      resourceId: 'global',
      resourceName: 'Failed hierarchy update',
      performedBy: userId,
      justification,
      status: 'failure',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to commit admin hierarchy changes' },
      { status: 500 }
    );
  }
}

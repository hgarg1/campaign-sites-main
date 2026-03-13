'use client';

import { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { OrganizationNodeModal } from './OrganizationNodeModal';

export interface HierarchyOrgNode {
  id: string;
  name: string;
  slug: string;
  ownStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  effectiveStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  children: HierarchyOrgNode[];
  memberCount?: number;
  websiteCount?: number;
  setupCompletedAt?: string | null;
  partyAffiliation?: string | null;
}

export interface HierarchyGraphProps {
  org: HierarchyOrgNode;
  onHierarchyChange?: () => Promise<void> | void;
  editable?: boolean;
}

interface OrgNodeData {
  label: string;
  status: string;
  org: HierarchyOrgNode;
}

const nodeStyle = {
  padding: '12px 16px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  border: '2px solid',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const getNodeColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return { bg: '#10b981', border: '#059669', text: 'white' };
    case 'SUSPENDED':
      return { bg: '#f59e0b', border: '#d97706', text: 'white' };
    case 'DEACTIVATED':
      return { bg: '#ef4444', border: '#dc2626', text: 'white' };
    default:
      return { bg: '#6b7280', border: '#4b5563', text: 'white' };
  }
};

function OrganizationNode({ data }: { data: OrgNodeData }) {
  const colors = getNodeColor(data.status);
  return (
    <div
      style={{
        ...nodeStyle,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
      }}
      className="shadow-lg hover:shadow-xl hover:scale-105 transform transition-all"
    >
      <div className="font-bold">{data.label}</div>
      {(data.org.memberCount !== undefined || data.org.websiteCount !== undefined) && (
        <div className="text-xs opacity-90 mt-1">
          {data.org.memberCount ?? 0} members • {data.org.websiteCount ?? 0} sites
        </div>
      )}
    </div>
  );
}

// Flatten tree into flat list with parent tracking
function flattenTree(
  node: HierarchyOrgNode,
  parentId: string | null = null,
  result: Array<HierarchyOrgNode & { parentId: string | null }> = []
): Array<HierarchyOrgNode & { parentId: string | null }> {
  result.push({ ...node, parentId });
  node.children.forEach((child) => flattenTree(child, node.id, result));
  return result;
}

// Layout nodes in a hierarchical tree
function layoutNodes(
  nodes: Array<HierarchyOrgNode & { parentId: string | null }>
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const levels: Record<string, number> = {};
  const levelCounts: Record<number, number> = {};

  const calculateLevel = (nodeId: string, parentId: string | null = null): number => {
    if (levels[nodeId] !== undefined) return levels[nodeId];

    let level = 0;
    if (parentId) {
      const parent = nodes.find((n) => n.id === parentId);
      if (parent) {
        level = calculateLevel(parent.id, parent.parentId) + 1;
      }
    }

    levels[nodeId] = level;
    return level;
  };

  nodes.forEach((node) => {
    const level = calculateLevel(node.id, node.parentId);
    levelCounts[level] = (levelCounts[level] ?? 0) + 1;

    positions[node.id] = {
      x: levelCounts[level] * 280,
      y: level * 120,
    };
  });

  return positions;
}

export function HierarchyGraph({ org, onHierarchyChange, editable = false }: HierarchyGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<HierarchyOrgNode | null>(null);
  const [showNodeModal, setShowNodeModal] = useState(false);

  useEffect(() => {
    const flatOrgs = flattenTree(org);
    const positions = layoutNodes(flatOrgs);

    const newNodes: Node<OrgNodeData>[] = flatOrgs.map((orgNode) => ({
      id: orgNode.id,
      data: {
        label: orgNode.name,
        status: orgNode.ownStatus,
        org: orgNode,
      },
      position: positions[orgNode.id],
      type: 'default',
      style: {
        width: 'auto',
        height: 'auto',
        background: 'none',
        border: 'none',
        padding: 0,
      },
    }));

    const newEdges: Edge[] = flatOrgs
      .filter((orgNode) => orgNode.parentId)
      .map((orgNode) => ({
        id: `${orgNode.parentId}-${orgNode.id}`,
        source: orgNode.parentId!,
        target: orgNode.id,
        animated: true,
      }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [org, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: any, node: Node<OrgNodeData>) => {
      setSelectedNode(node.data.org);
      setShowNodeModal(true);
    },
    []
  );

  return (
    <div className="w-full h-full relative bg-gray-50 rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      {showNodeModal && selectedNode && (
        <OrganizationNodeModal
          org={selectedNode}
          isOpen={showNodeModal}
          onClose={() => setShowNodeModal(false)}
        />
      )}
    </div>
  );
}

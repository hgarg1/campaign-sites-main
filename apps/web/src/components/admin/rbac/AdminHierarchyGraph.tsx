'use client';

import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';

interface AdminHierarchyGraphProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onSave?: (edges: Edge[]) => Promise<void>;
}

export function AdminHierarchyGraph({
  initialNodes,
  initialEdges,
  onSave,
}: AdminHierarchyGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [hasChanges, setHasChanges] = useState(false);
  const [justification, setJustification] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { fitView } = useReactFlow();

  // Track if graph has been modified
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
      setHasChanges(true);
    },
    [setEdges]
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      setHasChanges(true);
    },
    []
  );

  // Auto-fit on initial load
  useEffect(() => {
    fitView();
  }, [fitView]);

  const handleSave = async (justif?: string) => {
    if (!justif || !onSave) return;

    setIsSaving(true);
    try {
      const edgesToSave = edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      }));

      await onSave?.(edgesToSave as any);

      setHasChanges(false);
      setShowSaveModal(false);
      setJustification('');
    } catch (error) {
      console.error('Failed to save hierarchy:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      className="w-full h-[600px] border border-gray-200 rounded-xl overflow-hidden bg-gray-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      {/* Save Button (sticky) */}
      {hasChanges && (
        <motion.div
          className="absolute bottom-4 left-4 flex gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          <button
            onClick={() => {
              setNodes(initialNodes);
              setEdges(initialEdges);
              setHasChanges(false);
            }}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition-colors"
          >
            Discard Changes
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </motion.div>
      )}

      {/* Info Box */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 max-w-xs">
        <p className="font-medium mb-1">💡 Tip:</p>
        <p>Drag from one admin to another to create delegation. Click edge to delete it.</p>
        {hasChanges && (
          <p className="mt-2 text-blue-600 font-medium">
            ⚠️ You have unsaved changes
          </p>
        )}
      </div>

      {/* Save Modal */}
      <ConfirmationModal
        isOpen={showSaveModal}
        title="Save Admin Hierarchy Changes"
        message="This will update the admin delegation relationships. The system will validate for cycles before applying changes."
        confirmText="Save Hierarchy"
        cancelText="Cancel"
        icon="info"
        showJustification={true}
        isLoading={isSaving}
        onConfirm={handleSave}
        onCancel={() => {
          setShowSaveModal(false);
          setJustification('');
        }}
      />
    </motion.div>
  );
}

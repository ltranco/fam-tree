'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFamilyTree } from '@/context/FamilyTreeContext';
import { layoutTree } from '@/lib/layout';
import PersonNode from './PersonNode';

const nodeTypes = { person: PersonNode };

export interface FocusRequest {
  id: string;
  nonce: number;
}

interface Props {
  onSelectPerson: (id: string) => void;
  focusRequest: FocusRequest | null;
}

export default function FamilyTreeCanvas({ onSelectPerson, focusRequest }: Props) {
  const { people } = useFamilyTree();
  const layout = useMemo(() => layoutTree(people), [people]);
  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);
  const flowRef = useRef<ReactFlowInstance | null>(null);

  useEffect(() => {
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [layout, setNodes, setEdges]);

  // Runs after `nodes` has settled, so a just-added node is guaranteed present.
  useEffect(() => {
    if (!focusRequest || !flowRef.current) return;
    const node = nodes.find((n) => n.id === focusRequest.id);
    if (!node) return;
    flowRef.current.setCenter(
      node.position.x + (node.measured?.width ?? 200) / 2,
      node.position.y + (node.measured?.height ?? 90) / 2,
      { zoom: 1.25, duration: 600 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest, nodes]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          flowRef.current = instance;
        }}
        onNodeClick={(_, node) => onSelectPerson(node.id)}
        fitView
        minZoom={0.1}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}

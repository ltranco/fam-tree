'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Background, Controls, ReactFlow, ReactFlowInstance, useEdgesState, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFamilyTree } from '@/context/FamilyTreeContext';
import { layoutTree } from '@/lib/layout';
import PersonNode from './PersonNode';
import PartnerJunctionNode from './PartnerJunctionNode';

const nodeTypes = { person: PersonNode, junction: PartnerJunctionNode };

export interface FocusRequest {
  id: string;
  nonce: number;
}

interface Props {
  onEditPerson: (id: string) => void;
  focusRequest: FocusRequest | null;
}

export default function FamilyTreeCanvas({ onEditPerson, focusRequest }: Props) {
  const { people, partnerships } = useFamilyTree();
  const layout = useMemo(() => layoutTree(people, partnerships), [people, partnerships]);
  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const handledNonceRef = useRef<number | null>(null);

  useEffect(() => {
    setNodes(layout.nodes.map((node) => ({ ...node, data: { ...node.data, onEdit: onEditPerson } })));
    setEdges(layout.edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, setNodes, setEdges]);

  // Only ever pans in response to an explicit new focusRequest (e.g. search selection) —
  // never as a side effect of node selection or other unrelated nodes-array updates.
  useEffect(() => {
    if (!focusRequest || !flowRef.current) return;
    if (handledNonceRef.current === focusRequest.nonce) return;
    const node = nodes.find((n) => n.id === focusRequest.id);
    if (!node) return; // wait for the node to appear (e.g. just created), retry on next nodes update
    handledNonceRef.current = focusRequest.nonce;
    const zoom = flowRef.current.getZoom();
    flowRef.current.setCenter(
      node.position.x + (node.measured?.width ?? 200) / 2,
      node.position.y + (node.measured?.height ?? 90) / 2,
      { zoom, duration: 500 }
    );
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
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
        zoomOnDoubleClick={false}
        fitView
        minZoom={0.1}
        colorMode="system"
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

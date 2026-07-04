'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { JUNCTION_SIZE } from '@/lib/layout';

interface JunctionNodeData {
  hasChildren: boolean;
}

export default function PartnerJunctionNode({ data }: { data: JunctionNodeData }) {
  return (
    <div className="partner-junction" style={{ width: JUNCTION_SIZE, height: JUNCTION_SIZE }}>
      <Handle type="target" position={Position.Left} id="junction-left" />
      <Handle type="source" position={Position.Right} id="junction-right" />
      {data.hasChildren && <Handle type="source" position={Position.Bottom} id="junction-bottom" />}
    </div>
  );
}

import dagre from 'dagre';
import { Edge, Node } from '@xyflow/react';
import { Person } from './types';

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 90;

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

export function layoutTree(people: Record<string, Person>): LayoutResult {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 100 });

  const personList = Object.values(people);

  for (const person of personList) {
    graph.setNode(person.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  const edges: Edge[] = [];
  for (const person of personList) {
    for (const parentId of person.parentIds) {
      if (!people[parentId]) continue;
      graph.setEdge(parentId, person.id);
      edges.push({
        id: `${parentId}->${person.id}`,
        source: parentId,
        target: person.id,
        type: 'smoothstep',
      });
    }
  }

  dagre.layout(graph);

  const nodes: Node[] = personList.map((person) => {
    const { x, y } = graph.node(person.id);
    return {
      id: person.id,
      type: 'person',
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      data: { person },
    };
  });

  return { nodes, edges };
}

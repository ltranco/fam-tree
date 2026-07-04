import dagre from 'dagre';
import { Edge, Node } from '@xyflow/react';
import { Partnership, Person } from './types';

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 90;
export const JUNCTION_SIZE = 14;
const COUPLE_GAP = 40;
const STEP = NODE_WIDTH + COUPLE_GAP; // center-to-center spacing within a cluster
const SIBLING_SPACING = NODE_WIDTH + 60; // matches dagre's nodesep below

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

interface Cluster {
  id: string;
  memberIds: string[]; // left-to-right order
}

interface PartnershipPlacement {
  cluster: Cluster;
  leftIndex: number;
  rightIndex: number;
  stackOffset: number; // 0-based among partnerships sharing this exact pair (e.g. divorced + remarried)
}

/**
 * Collapses every partnership-connected component — a simple couple, a
 * remarriage chain with kids on both sides, someone with three or more
 * partners over time, even a closed loop — into a single wide dagre node.
 * Dagre has no native "same rank" grouping, and forcing it via
 * opposing-direction edges between two real nodes gets silently neutralized
 * by dagre's own cycle-breaking preprocessing (verified empirically).
 * Collapsing the whole component into one node sidesteps that entirely:
 * every member shares a rank by construction, for any shape, so there's no
 * "ungrouped fallback" case left that could land partners on different rows.
 *
 * Members are ordered via a BFS spanning tree rooted at the
 * highest-degree person in the component, with that root's branches split
 * left/right and each branch continuing outward in its own direction.
 * Partnerships that fall outside the spanning tree — the second marriage in
 * a "divorced and remarried" pair, or an edge that closes a cycle — don't
 * get their own slot; their junction is placed at the midpoint of wherever
 * their two partners ended up, which may not be adjacent. For anyone with
 * 3+ partners that means one connecting line visually passes near an
 * intervening person — unavoidable once a node's degree exceeds 2 in a 1D
 * row — but the rank/hierarchy guarantee itself never breaks.
 */
function buildClusters(validPartnerships: Partnership[]): {
  clusters: Cluster[];
  placementByPartnership: Map<string, PartnershipPlacement>;
} {
  const adjacency = new Map<string, { other: string; partnership: Partnership }[]>();
  for (const partnership of validPartnerships) {
    const [a, b] = partnership.partnerIds;
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a)!.push({ other: b, partnership });
    adjacency.get(b)!.push({ other: a, partnership });
  }
  for (const list of adjacency.values()) {
    list.sort((x, y) => x.other.localeCompare(y.other));
  }
  const degree = (id: string) => adjacency.get(id)?.length ?? 0;

  const clusters: Cluster[] = [];
  const placementByPartnership = new Map<string, PartnershipPlacement>();
  const globalVisited = new Set<string>();

  for (const startId of [...adjacency.keys()].sort()) {
    if (globalVisited.has(startId)) continue;

    // Phase 1: find this connected component and every partnership touching it.
    const componentIds: string[] = [];
    const componentPartnershipsMap = new Map<string, Partnership>();
    {
      const queue = [startId];
      globalVisited.add(startId);
      while (queue.length) {
        const current = queue.shift()!;
        componentIds.push(current);
        for (const { other, partnership } of adjacency.get(current) ?? []) {
          componentPartnershipsMap.set(partnership.id, partnership);
          if (!globalVisited.has(other)) {
            globalVisited.add(other);
            queue.push(other);
          }
        }
      }
    }

    // Phase 2: rebuild as a tree rooted at the most-connected member, so
    // branching happens at the person with the most partners.
    const root = [...componentIds].sort((a, b) => degree(b) - degree(a) || a.localeCompare(b))[0];
    const treeChildren = new Map<string, string[]>();
    const treeVisited = new Set([root]);
    const queue = [root];
    while (queue.length) {
      const current = queue.shift()!;
      treeChildren.set(current, []);
      for (const { other } of adjacency.get(current) ?? []) {
        if (!treeVisited.has(other)) {
          treeVisited.add(other);
          treeChildren.get(current)!.push(other);
          queue.push(other);
        }
      }
    }

    // Each branch continues straight outward in its committed direction;
    // only the root splits its immediate children between left and right.
    function orderSide(node: string, direction: 'left' | 'right'): string[] {
      const sub = (treeChildren.get(node) ?? []).flatMap((c) => orderSide(c, direction));
      return direction === 'right' ? [node, ...sub] : [...sub, node];
    }

    const rootChildren = treeChildren.get(root) ?? [];
    const mid = Math.floor(rootChildren.length / 2);
    const memberIds = [
      ...rootChildren.slice(0, mid).flatMap((c) => orderSide(c, 'left')),
      root,
      ...rootChildren.slice(mid).flatMap((c) => orderSide(c, 'right')),
    ];

    const cluster: Cluster = { id: `cluster:${memberIds.join(',')}`, memberIds };
    clusters.push(cluster);

    const indexOf = new Map(memberIds.map((id, i) => [id, i]));
    const stackOffsetByPairKey = new Map<string, number>();
    for (const partnership of componentPartnershipsMap.values()) {
      const [a, b] = partnership.partnerIds;
      const pairKey = [a, b].sort().join('|');
      const stackOffset = stackOffsetByPairKey.get(pairKey) ?? 0;
      stackOffsetByPairKey.set(pairKey, stackOffset + 1);
      placementByPartnership.set(partnership.id, {
        cluster,
        leftIndex: Math.min(indexOf.get(a)!, indexOf.get(b)!),
        rightIndex: Math.max(indexOf.get(a)!, indexOf.get(b)!),
        stackOffset,
      });
    }
  }

  return { clusters, placementByPartnership };
}

interface GroupBox {
  nodes: Node[];
  y: number;
  minX: number;
  maxX: number;
}

/**
 * Dagre's own left-to-right ordering within a rank is a heuristic (barycenter
 * method) and isn't directly controllable. To honor an explicit sibling
 * order, group full-sibling sets (identical parentIds) and re-space them
 * around an explicit anchor according to `person.order`.
 *
 * The anchor must be the parent's (or shared-partnership junction's) own
 * resolved position, not an average of the children's own dagre-assigned
 * positions: a parent who's merged into a wide multi-partner cluster gets
 * dagre child-positions influenced by the whole cluster's width, which would
 * otherwise drag a single-parent child sideways toward an unrelated partner.
 *
 * A child being recentered may itself be a member of a partner-cluster (they
 * have their own partner, one generation down from their own parents). If we
 * moved only that one node, the cluster's carefully computed internal
 * spacing (each partner exactly STEP apart) would be destroyed, dragging the
 * recentered person away from their own partner and leaving the two
 * overlapping. So every shift is applied to the whole cluster rigidly.
 *
 * Different parent-groups (and the clusters riding along with them) can
 * still land at the same generation and overlap — a blended family where
 * one group is "kids with the old partner" and another is "kids with the
 * new partner", both hanging off the same person. After every group is
 * centered on its own anchor, sweep each rank left-to-right using final
 * positions and push overlapping boxes apart, preserving internal spacing
 * and relative order.
 */
function applySiblingOrder(
  nodes: Node[],
  people: Record<string, Person>,
  anchorXByParentKey: Map<string, number>,
  clusterByPerson: Map<string, { cluster: Cluster; index: number }>,
  junctionIdsByClusterId: Map<string, string[]>
): void {
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const groups = new Map<string, string[]>();

  for (const person of Object.values(people)) {
    if (person.parentIds.length === 0) continue;
    const key = [...person.parentIds].sort().join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(person.id);
  }

  function shiftClusterRigidly(personId: string, delta: number) {
    const clusterId = clusterByPerson.get(personId)?.cluster.id;
    const memberIds = clusterByPerson.get(personId)?.cluster.memberIds ?? [personId];
    for (const memberId of memberIds) {
      const node = nodesById.get(memberId);
      if (node) node.position = { ...node.position, x: node.position.x + delta };
    }
    for (const junctionId of (clusterId && junctionIdsByClusterId.get(clusterId)) || []) {
      const junctionNode = nodesById.get(junctionId);
      if (junctionNode) junctionNode.position = { ...junctionNode.position, x: junctionNode.position.x + delta };
    }
  }

  for (const [key, ids] of groups) {
    const groupNodes = ids.map((id) => nodesById.get(id)).filter((n): n is Node => Boolean(n));
    if (groupNodes.length === 0) continue;

    const fallbackCenter = groupNodes.reduce((sum, n) => sum + n.position.x + NODE_WIDTH / 2, 0) / groupNodes.length;
    const trueCenter = anchorXByParentKey.get(key) ?? fallbackCenter;
    const sorted = [...groupNodes].sort((a, b) => people[a.id].order - people[b.id].order);
    const startX = trueCenter - NODE_WIDTH / 2 - ((sorted.length - 1) * SIBLING_SPACING) / 2;
    sorted.forEach((node, i) => {
      const targetX = startX + i * SIBLING_SPACING;
      const delta = targetX - node.position.x;
      if (delta !== 0) shiftClusterRigidly(node.id, delta);
    });
  }

  // Build final per-rank boxes fresh, after every group has been centered
  // (and every cluster shift has propagated), so the collision sweep below
  // sees each node's true final position rather than a stale one.
  const boxes: GroupBox[] = [];
  const seenClusterIds = new Set<string>();
  for (const person of Object.values(people)) {
    const clusterEntry = clusterByPerson.get(person.id);
    if (clusterEntry) {
      if (seenClusterIds.has(clusterEntry.cluster.id)) continue;
      seenClusterIds.add(clusterEntry.cluster.id);
      const memberNodes = clusterEntry.cluster.memberIds
        .map((id) => nodesById.get(id))
        .filter((n): n is Node => Boolean(n));
      if (memberNodes.length === 0) continue;
      boxes.push({
        nodes: memberNodes,
        y: memberNodes[0].position.y,
        minX: Math.min(...memberNodes.map((n) => n.position.x)),
        maxX: Math.max(...memberNodes.map((n) => n.position.x)) + NODE_WIDTH,
      });
    } else {
      const node = nodesById.get(person.id);
      if (!node) continue;
      boxes.push({ nodes: [node], y: node.position.y, minX: node.position.x, maxX: node.position.x + NODE_WIDTH });
    }
  }

  const boxesByRank = new Map<number, GroupBox[]>();
  for (const box of boxes) {
    if (!boxesByRank.has(box.y)) boxesByRank.set(box.y, []);
    boxesByRank.get(box.y)!.push(box);
  }

  const MARGIN = SIBLING_SPACING - NODE_WIDTH; // matches dagre's own nodesep
  for (const rankBoxes of boxesByRank.values()) {
    rankBoxes.sort((a, b) => a.minX - b.minX);
    let rightEdge = -Infinity;
    for (const box of rankBoxes) {
      if (box.minX < rightEdge + MARGIN) {
        const delta = rightEdge + MARGIN - box.minX;
        box.nodes.forEach((n) => {
          n.position = { ...n.position, x: n.position.x + delta };
        });
        box.minX += delta;
        box.maxX += delta;
      }
      rightEdge = box.maxX;
    }
  }
}

export function layoutTree(people: Record<string, Person>, partnerships: Partnership[]): LayoutResult {
  const personList = Object.values(people);
  const validPartnerships = partnerships.filter((p) => people[p.partnerIds[0]] && people[p.partnerIds[1]]);
  const { clusters, placementByPartnership } = buildClusters(validPartnerships);

  const clusterByPerson = new Map<string, { cluster: Cluster; index: number }>();
  for (const cluster of clusters) {
    cluster.memberIds.forEach((id, index) => clusterByPerson.set(id, { cluster, index }));
  }

  const partnershipByChildKey = new Map<string, Partnership>();
  for (const partnership of validPartnerships) {
    partnershipByChildKey.set([...partnership.partnerIds].sort().join('|'), partnership);
  }

  const dagreId = (personId: string) => clusterByPerson.get(personId)?.cluster.id ?? personId;

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 100 });

  const seenDagreNodes = new Set<string>();
  for (const person of personList) {
    const id = dagreId(person.id);
    if (seenDagreNodes.has(id)) continue;
    seenDagreNodes.add(id);
    const cluster = clusterByPerson.get(person.id)?.cluster;
    const width = cluster ? cluster.memberIds.length * NODE_WIDTH + (cluster.memberIds.length - 1) * COUPLE_GAP : NODE_WIDTH;
    graph.setNode(id, { width, height: NODE_HEIGHT });
  }

  const seenDagreEdges = new Set<string>();
  function addDagreEdge(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const key = `${sourceId}->${targetId}`;
    if (seenDagreEdges.has(key)) return;
    seenDagreEdges.add(key);
    graph.setEdge(sourceId, targetId);
  }

  const edges: Edge[] = [];
  const junctionsWithChildren = new Set<string>();
  // Only true for a parent whose child edge actually originates from their
  // own bottom handle — a child shared via a registered partnership instead
  // comes from the junction dot, so that parent's own bottom handle would
  // otherwise render with nothing connected to it.
  const needsChildSourceHandle = new Set<string>();

  for (const person of personList) {
    const sharedPartnership =
      person.parentIds.length === 2 ? partnershipByChildKey.get([...person.parentIds].sort().join('|')) : undefined;
    const placement = sharedPartnership && placementByPartnership.get(sharedPartnership.id);

    if (sharedPartnership && placement) {
      addDagreEdge(placement.cluster.id, dagreId(person.id));
      junctionsWithChildren.add(sharedPartnership.id);
      edges.push({
        id: `${sharedPartnership.id}->${person.id}`,
        source: `junction:${sharedPartnership.id}`,
        target: person.id,
        sourceHandle: 'junction-bottom',
        targetHandle: 'child-target',
        type: 'smoothstep',
      });
      continue;
    }

    for (const parentId of person.parentIds) {
      if (!people[parentId]) continue;
      addDagreEdge(dagreId(parentId), dagreId(person.id));
      needsChildSourceHandle.add(parentId);
      edges.push({
        id: `${parentId}->${person.id}`,
        source: parentId,
        target: person.id,
        sourceHandle: 'child-source',
        targetHandle: 'child-target',
        type: 'smoothstep',
      });
    }
  }

  const needsPartnerSourceHandle = new Set<string>();
  const needsPartnerTargetHandle = new Set<string>();

  for (const partnership of validPartnerships) {
    const jid = `junction:${partnership.id}`;
    // Wire handles from each partner's *actual* resolved left/right slot in
    // the cluster, not from partnerIds[0]/[1] order — buildClusters' BFS
    // ordering has no relationship to which partner is index 0 vs 1 in the
    // Partnership record, so assuming index 0 is always the left one sends
    // an edge out the wrong side of the node whenever that assumption
    // doesn't hold, producing a stub that has to loop back around.
    const placement = placementByPartnership.get(partnership.id)!;
    const leftPersonId = placement.cluster.memberIds[placement.leftIndex];
    const rightPersonId = placement.cluster.memberIds[placement.rightIndex];
    needsPartnerSourceHandle.add(leftPersonId);
    needsPartnerTargetHandle.add(rightPersonId);
    const dashed = partnership.status === 'divorced' ? { strokeDasharray: '6 4' } : undefined;
    edges.push({
      id: `${partnership.id}-a`,
      source: leftPersonId,
      target: jid,
      sourceHandle: 'partner-source',
      targetHandle: 'junction-left',
      type: 'smoothstep',
      style: dashed,
    });
    edges.push({
      id: `${partnership.id}-b`,
      source: jid,
      target: rightPersonId,
      sourceHandle: 'junction-right',
      targetHandle: 'partner-target',
      type: 'smoothstep',
      style: dashed,
    });
  }

  dagre.layout(graph);

  function clusterMemberPosition(cluster: Cluster, index: number): { x: number; y: number } {
    const { x: cx, y: cy } = graph.node(cluster.id);
    const n = cluster.memberIds.length;
    const startX = cx - ((n - 1) * STEP) / 2;
    return { x: startX + index * STEP, y: cy };
  }

  const personCenterX = new Map<string, number>();
  const nodes: Node[] = personList.map((person) => {
    const entry = clusterByPerson.get(person.id);
    const { x, y } = entry ? clusterMemberPosition(entry.cluster, entry.index) : graph.node(dagreId(person.id));
    personCenterX.set(person.id, x);
    return {
      id: person.id,
      type: 'person',
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      data: {
        person,
        hasPartnerSourceHandle: needsPartnerSourceHandle.has(person.id),
        hasPartnerTargetHandle: needsPartnerTargetHandle.has(person.id),
        hasChildSourceHandle: needsChildSourceHandle.has(person.id),
      },
    };
  });

  // Junction dots: one per valid partnership, sitting between its two
  // partners' final positions. Every valid partnership is guaranteed a
  // placement — buildClusters puts every partnered person in some cluster.
  const junctionCenterXByPartnership = new Map<string, number>();
  for (const partnership of validPartnerships) {
    const placement = placementByPartnership.get(partnership.id)!;
    const leftPos = clusterMemberPosition(placement.cluster, placement.leftIndex);
    const rightPos = clusterMemberPosition(placement.cluster, placement.rightIndex);
    const x = (leftPos.x + rightPos.x) / 2;
    const y = leftPos.y + placement.stackOffset * (JUNCTION_SIZE + 6); // stack parallel remarriage junctions
    junctionCenterXByPartnership.set(partnership.id, x);
    nodes.push({
      id: `junction:${partnership.id}`,
      type: 'junction',
      position: { x: x - JUNCTION_SIZE / 2, y: y - JUNCTION_SIZE / 2 },
      data: { hasChildren: junctionsWithChildren.has(partnership.id) },
      selectable: false,
    });
  }

  // A cluster's junction dots must move with it when a sibling-order shift
  // rigidly repositions the cluster — otherwise the dot is left behind at
  // its stale pre-shift position while its two partners move out from under it.
  const junctionIdsByClusterId = new Map<string, string[]>();
  for (const partnership of validPartnerships) {
    const placement = placementByPartnership.get(partnership.id)!;
    if (!junctionIdsByClusterId.has(placement.cluster.id)) junctionIdsByClusterId.set(placement.cluster.id, []);
    junctionIdsByClusterId.get(placement.cluster.id)!.push(`junction:${partnership.id}`);
  }

  // Anchor each sibling group on its actual parent(s), not on an average of
  // the children's own (potentially cluster-skewed) dagre positions.
  const anchorXByParentKey = new Map<string, number>();
  for (const person of personList) {
    if (person.parentIds.length === 0) continue;
    const key = [...person.parentIds].sort().join('|');
    if (anchorXByParentKey.has(key)) continue;

    if (person.parentIds.length === 2) {
      const sharedPartnership = partnershipByChildKey.get(key);
      const jx = sharedPartnership && junctionCenterXByPartnership.get(sharedPartnership.id);
      if (jx !== undefined) {
        anchorXByParentKey.set(key, jx);
        continue;
      }
      const [p1, p2] = person.parentIds;
      const c1 = personCenterX.get(p1);
      const c2 = personCenterX.get(p2);
      if (c1 !== undefined && c2 !== undefined) anchorXByParentKey.set(key, (c1 + c2) / 2);
    } else {
      const c = personCenterX.get(person.parentIds[0]);
      if (c !== undefined) anchorXByParentKey.set(key, c);
    }
  }

  applySiblingOrder(nodes, people, anchorXByParentKey, clusterByPerson, junctionIdsByClusterId);

  return { nodes, edges };
}

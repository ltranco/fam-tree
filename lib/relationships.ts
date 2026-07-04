import { Person } from './types';

export function getParents(people: Record<string, Person>, id: string): Person[] {
  const person = people[id];
  if (!person) return [];
  return person.parentIds.map((pid) => people[pid]).filter(Boolean);
}

export function getChildren(people: Record<string, Person>, id: string): Person[] {
  return Object.values(people).filter((person) => person.parentIds.includes(id));
}

/** Ancestors of `id`, including `id` itself. */
function ancestorSet(people: Record<string, Person>, id: string): Set<string> {
  const visited = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const person = people[current];
    if (person) stack.push(...person.parentIds);
  }
  return visited;
}

/** Would adding `parentId` as a parent of `childId` create a cycle? */
export function wouldCreateCycle(people: Record<string, Person>, childId: string, parentId: string): boolean {
  if (childId === parentId) return true;
  return ancestorSet(people, parentId).has(childId);
}

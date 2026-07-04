import { FamilyTreeData } from './types';

export async function loadTree(): Promise<FamilyTreeData> {
  const res = await fetch('/api/tree');
  if (!res.ok) throw new Error('Failed to load family tree data.');
  const data = (await res.json()) as FamilyTreeData;
  if (!Array.isArray(data.partnerships)) data.partnerships = [];
  return data;
}

export async function saveTree(data: FamilyTreeData): Promise<void> {
  const res = await fetch('/api/tree', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save family tree data.');
}

export function exportTreeAsFile(data: FamilyTreeData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `family-tree-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseImportedTree(text: string): FamilyTreeData {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || typeof parsed.people !== 'object') {
    throw new Error('File does not contain valid family tree data.');
  }
  if (!Array.isArray(parsed.partnerships)) {
    parsed.partnerships = [];
  }
  return parsed as FamilyTreeData;
}

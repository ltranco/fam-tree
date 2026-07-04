import { FamilyTreeData } from './types';
import { getSeedData } from './seed';

const STORAGE_KEY = 'fam-tree-data';

export function loadTree(): FamilyTreeData {
  if (typeof window === 'undefined') {
    return getSeedData();
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = getSeedData();
    saveTree(seed);
    return seed;
  }
  try {
    const parsed = JSON.parse(raw) as FamilyTreeData;
    if (!parsed || typeof parsed !== 'object' || !parsed.people) {
      throw new Error('Invalid tree data shape');
    }
    if (!Array.isArray(parsed.partnerships)) {
      parsed.partnerships = [];
    }
    return parsed;
  } catch {
    const seed = getSeedData();
    saveTree(seed);
    return seed;
  }
}

export function saveTree(data: FamilyTreeData): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

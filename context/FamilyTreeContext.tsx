'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FamilyTreeData, Person } from '@/lib/types';
import { loadTree, saveTree } from '@/lib/storage';
import { wouldCreateCycle } from '@/lib/relationships';

interface FamilyTreeContextValue {
  people: Record<string, Person>;
  ready: boolean;
  updatePerson: (id: string, updates: Partial<Omit<Person, 'id' | 'parentIds'>>) => void;
  addChild: (parentId: string) => string;
  addParent: (childId: string) => string | null;
  deletePerson: (id: string) => void;
  replaceAll: (data: FamilyTreeData) => void;
}

const FamilyTreeContext = createContext<FamilyTreeContextValue | null>(null);

function makeId(): string {
  return `person-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyPerson(id: string, parentIds: string[] = []): Person {
  return {
    id,
    firstName: 'New',
    lastName: 'Person',
    gender: 'male',
    birthDate: '',
    deathDate: '',
    photoUrl: '',
    notes: '',
    parentIds,
  };
}

export function FamilyTreeProvider({ children }: { children: React.ReactNode }) {
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const data = loadTree();
    setPeople(data.people);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveTree({ people });
  }, [people, ready]);

  const updatePerson = useCallback((id: string, updates: Partial<Omit<Person, 'id' | 'parentIds'>>) => {
    setPeople((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return { ...prev, [id]: { ...existing, ...updates } };
    });
  }, []);

  const addChild = useCallback((parentId: string) => {
    const id = makeId();
    setPeople((prev) => ({ ...prev, [id]: emptyPerson(id, [parentId]) }));
    return id;
  }, []);

  const addParent = useCallback(
    (childId: string): string | null => {
      let newId: string | null = null;
      setPeople((prev) => {
        const child = prev[childId];
        if (!child || child.parentIds.length >= 2) return prev;
        const id = makeId();
        if (wouldCreateCycle(prev, childId, id)) return prev;
        newId = id;
        return {
          ...prev,
          [id]: emptyPerson(id),
          [childId]: { ...child, parentIds: [...child.parentIds, id] },
        };
      });
      return newId;
    },
    []
  );

  const deletePerson = useCallback((id: string) => {
    setPeople((prev) => {
      const next: Record<string, Person> = {};
      for (const [personId, person] of Object.entries(prev)) {
        if (personId === id) continue;
        next[personId] = person.parentIds.includes(id)
          ? { ...person, parentIds: person.parentIds.filter((pid) => pid !== id) }
          : person;
      }
      return next;
    });
  }, []);

  const replaceAll = useCallback((data: FamilyTreeData) => {
    setPeople(data.people);
  }, []);

  const value = useMemo(
    () => ({ people, ready, updatePerson, addChild, addParent, deletePerson, replaceAll }),
    [people, ready, updatePerson, addChild, addParent, deletePerson, replaceAll]
  );

  return <FamilyTreeContext.Provider value={value}>{children}</FamilyTreeContext.Provider>;
}

export function useFamilyTree(): FamilyTreeContextValue {
  const ctx = useContext(FamilyTreeContext);
  if (!ctx) throw new Error('useFamilyTree must be used within a FamilyTreeProvider');
  return ctx;
}

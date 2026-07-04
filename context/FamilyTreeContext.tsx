'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FamilyTreeData, Partnership, PartnershipStatus, Person } from '@/lib/types';
import { loadTree, saveTree } from '@/lib/storage';
import { wouldCreateCycle } from '@/lib/relationships';

interface FamilyTreeContextValue {
  people: Record<string, Person>;
  partnerships: Partnership[];
  ready: boolean;
  updatePerson: (id: string, updates: Partial<Omit<Person, 'id' | 'parentIds'>>) => void;
  addChild: (parentId: string) => string;
  addParent: (childId: string) => string | null;
  addPartner: (personId: string) => string;
  setPartnershipStatus: (partnershipId: string, status: PartnershipStatus) => void;
  reorderChildren: (parentId: string, orderedChildIds: string[]) => void;
  deletePerson: (id: string) => void;
  replaceAll: (data: FamilyTreeData) => void;
}

const FamilyTreeContext = createContext<FamilyTreeContextValue | null>(null);

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyPerson(id: string, parentIds: string[] = [], order = 0): Person {
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
    order,
  };
}

function nextSiblingOrder(people: Record<string, Person>, parentId: string): number {
  const siblingOrders = Object.values(people)
    .filter((p) => p.parentIds.includes(parentId))
    .map((p) => p.order);
  return siblingOrders.length ? Math.max(...siblingOrders) + 1 : 0;
}

/** The one unambiguous current partner to attach a new child to, if any. */
function currentPartnerId(partnerships: Partnership[], personId: string): string | null {
  const together = partnerships.filter((p) => p.partnerIds.includes(personId) && p.status === 'together');
  if (together.length !== 1) return null;
  return together[0].partnerIds.find((id) => id !== personId) ?? null;
}

export function FamilyTreeProvider({ children }: { children: React.ReactNode }) {
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [ready, setReady] = useState(false);
  // Loading the tree sets `people`/`partnerships` too, which would otherwise
  // look like a real edit to the save effect below and fire a doomed write
  // for every viewer who doesn't hold the edit password.
  const skipNextSaveRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    loadTree()
      .then((data) => {
        if (cancelled) return;
        skipNextSaveRef.current = true;
        setPeople(data.people);
        setPartnerships(data.partnerships);
        setReady(true);
      })
      .catch((err) => console.error('Failed to load family tree data:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    saveTree({ people, partnerships }).catch((err) => console.error('Failed to save family tree data:', err));
  }, [people, partnerships, ready]);

  const updatePerson = useCallback((id: string, updates: Partial<Omit<Person, 'id' | 'parentIds'>>) => {
    setPeople((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return { ...prev, [id]: { ...existing, ...updates } };
    });
  }, []);

  // A descendant always has exactly two parents. If the clicked person has
  // no single unambiguous current partner on record, one is created on the
  // spot (with the matching partnership) so the child is never left with
  // just one parent.
  const addChild = useCallback(
    (parentId: string) => {
      const childId = makeId('person');
      const existingPartnerId = currentPartnerId(partnerships, parentId);
      const partnerId = existingPartnerId ?? makeId('person');
      const partnershipId = makeId('partner');

      setPeople((prev) => {
        const next = { ...prev };
        if (!existingPartnerId) next[partnerId] = emptyPerson(partnerId);
        next[childId] = emptyPerson(childId, [parentId, partnerId], nextSiblingOrder(prev, parentId));
        return next;
      });

      if (!existingPartnerId) {
        setPartnerships((prev) => [
          ...prev,
          { id: partnershipId, partnerIds: [parentId, partnerId], status: 'together' },
        ]);
      }

      return childId;
    },
    [partnerships]
  );

  // Bringing a child from 1 recorded parent up to 2 must also record the
  // partnership between them, otherwise the child would have two parents
  // with no joint connector to render from. Every id used below is
  // generated up front, outside the setState updaters: this repo runs with
  // reactStrictMode, which double-invokes updater functions in development
  // to surface impure ones — generating ids inside an updater (as this used
  // to) meant each invocation could mint a different random id, leaving the
  // committed person and the committed partnership pointing at two
  // different, non-matching ids.
  const addParent = useCallback(
    (childId: string): string | null => {
      const child = people[childId];
      if (!child || child.parentIds.length >= 2) return null;
      const id = makeId('person');
      if (wouldCreateCycle(people, childId, id)) return null;

      setPeople((prev) => {
        const current = prev[childId];
        if (!current || current.parentIds.length >= 2) return prev;
        return {
          ...prev,
          [id]: emptyPerson(id),
          [childId]: { ...current, parentIds: [...current.parentIds, id] },
        };
      });

      if (child.parentIds.length === 1) {
        const partnershipId = makeId('partner');
        setPartnerships((prev) => [
          ...prev,
          { id: partnershipId, partnerIds: [child.parentIds[0], id], status: 'together' },
        ]);
      }

      return id;
    },
    [people]
  );

  const addPartner = useCallback((personId: string): string => {
    const newId = makeId('person');
    const partnershipId = makeId('partner');
    setPeople((prev) => ({ ...prev, [newId]: emptyPerson(newId) }));
    setPartnerships((prev) => [...prev, { id: partnershipId, partnerIds: [personId, newId], status: 'together' }]);
    return newId;
  }, []);

  const setPartnershipStatus = useCallback((partnershipId: string, status: PartnershipStatus) => {
    setPartnerships((prev) => prev.map((p) => (p.id === partnershipId ? { ...p, status } : p)));
  }, []);

  const reorderChildren = useCallback((parentId: string, orderedChildIds: string[]) => {
    setPeople((prev) => {
      const next = { ...prev };
      orderedChildIds.forEach((childId, index) => {
        const child = next[childId];
        if (child) next[childId] = { ...child, order: index };
      });
      return next;
    });
  }, []);

  // Deleting someone who is a recorded parent must never drop their
  // children to a single parent. Replace them everywhere (as a parent and
  // as a partner) with a fresh placeholder, so every child keeps exactly
  // two parents and the joint connector to the remaining partner survives.
  const deletePerson = useCallback(
    (id: string) => {
      const isParentOfSomeone = Object.values(people).some((p) => p.parentIds.includes(id));
      const placeholderId = isParentOfSomeone ? makeId('person') : null;

      setPeople((prev) => {
        const next: Record<string, Person> = {};
        for (const [personId, person] of Object.entries(prev)) {
          if (personId === id) continue;
          next[personId] =
            placeholderId && person.parentIds.includes(id)
              ? { ...person, parentIds: person.parentIds.map((pid) => (pid === id ? placeholderId : pid)) }
              : person;
        }
        if (placeholderId) next[placeholderId] = emptyPerson(placeholderId);
        return next;
      });

      setPartnerships((prev) => {
        if (!placeholderId) return prev.filter((p) => !p.partnerIds.includes(id));
        return prev.map((p) =>
          p.partnerIds.includes(id)
            ? { ...p, partnerIds: p.partnerIds.map((pid) => (pid === id ? placeholderId : pid)) as [string, string] }
            : p
        );
      });
    },
    [people]
  );

  const replaceAll = useCallback((data: FamilyTreeData) => {
    setPeople(data.people);
    setPartnerships(data.partnerships);
  }, []);

  const value = useMemo(
    () => ({
      people,
      partnerships,
      ready,
      updatePerson,
      addChild,
      addParent,
      addPartner,
      setPartnershipStatus,
      reorderChildren,
      deletePerson,
      replaceAll,
    }),
    [
      people,
      partnerships,
      ready,
      updatePerson,
      addChild,
      addParent,
      addPartner,
      setPartnershipStatus,
      reorderChildren,
      deletePerson,
      replaceAll,
    ]
  );

  return <FamilyTreeContext.Provider value={value}>{children}</FamilyTreeContext.Provider>;
}

export function useFamilyTree(): FamilyTreeContextValue {
  const ctx = useContext(FamilyTreeContext);
  if (!ctx) throw new Error('useFamilyTree must be used within a FamilyTreeProvider');
  return ctx;
}

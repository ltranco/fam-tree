'use client';

import React, { useMemo, useState } from 'react';
import { useFamilyTree } from '@/context/FamilyTreeContext';
import { fullName } from '@/lib/types';

interface Props {
  onSelect: (id: string) => void;
}

export default function SearchBar({ onSelect }: Props) {
  const { people } = useFamilyTree();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return Object.values(people)
      .filter((person) => fullName(person).toLowerCase().includes(q))
      .slice(0, 8);
  }, [people, query]);

  function handleSelect(id: string) {
    onSelect(id);
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="search-bar">
      <input
        placeholder="Search by name…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <ul className="search-bar__results">
          {matches.map((person) => (
            <li key={person.id}>
              <button onMouseDown={() => handleSelect(person.id)}>{fullName(person)}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

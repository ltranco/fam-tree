'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Person, fullName } from '@/lib/types';
import { NODE_WIDTH, NODE_HEIGHT } from '@/lib/layout';

function initials(person: Person): string {
  const a = person.firstName.trim()[0] ?? '';
  const b = person.lastName.trim()[0] ?? '';
  return (a + b).toUpperCase() || '?';
}

function yearOf(dateStr: string): string {
  if (!dateStr) return '';
  const year = dateStr.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : '';
}

export default function PersonNode({ data, selected }: { data: { person: Person }; selected: boolean }) {
  const { person } = data;
  const birthYear = yearOf(person.birthDate);
  const deathYear = yearOf(person.deathDate);
  const dateRange = birthYear || deathYear ? `${birthYear || '?'} – ${deathYear || (birthYear ? 'present' : '?')}` : '';

  return (
    <div
      className={`person-node${selected ? ' person-node--selected' : ''}`}
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      data-testid="person-node"
    >
      <Handle type="target" position={Position.Top} />
      <div className="person-node__avatar">
        {person.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.photoUrl} alt={fullName(person)} />
        ) : (
          <span>{initials(person)}</span>
        )}
      </div>
      <div className="person-node__info">
        <div className="person-node__name">{fullName(person) || 'Unnamed'}</div>
        {dateRange && <div className="person-node__dates">{dateRange}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

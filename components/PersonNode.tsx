'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Person, fullName } from '@/lib/types';
import { NODE_WIDTH, NODE_HEIGHT } from '@/lib/layout';
import { useFamilyTree } from '@/context/FamilyTreeContext';

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

interface PersonNodeData {
  person: Person;
  onEdit: (id: string) => void;
  hasPartnerSourceHandle: boolean;
  hasPartnerTargetHandle: boolean;
  hasChildSourceHandle: boolean;
}

export default function PersonNode({ data, selected }: { data: PersonNodeData; selected: boolean }) {
  const { person, onEdit, hasPartnerSourceHandle, hasPartnerTargetHandle, hasChildSourceHandle } = data;
  const { people, addChild, addParent, addPartner, deletePerson } = useFamilyTree();
  const birthYear = yearOf(person.birthDate);
  const deathYear = yearOf(person.deathDate);
  const dateRange = birthYear || deathYear ? `${birthYear || '?'} – ${deathYear || (birthYear ? 'present' : '?')}` : '';
  const childCount = Object.values(people).filter((p) => p.parentIds.includes(person.id)).length;

  function handleDelete() {
    if (childCount > 0) {
      const ok = window.confirm(
        `${person.firstName} has ${childCount} child${childCount > 1 ? 'ren' : ''} on record. Deleting will replace them with a placeholder parent so the child${childCount > 1 ? 'ren keep' : ' keeps'} both parent slots. Continue?`
      );
      if (!ok) return;
    }
    deletePerson(person.id);
  }

  return (
    <div
      className={`person-node${selected ? ' person-node--selected' : ''}`}
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      data-testid="person-node"
    >
      {person.parentIds.length > 0 && <Handle type="target" position={Position.Top} id="child-target" />}
      {hasPartnerSourceHandle && <Handle type="source" position={Position.Right} id="partner-source" />}
      {hasPartnerTargetHandle && <Handle type="target" position={Position.Left} id="partner-target" />}
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
      {hasChildSourceHandle && <Handle type="source" position={Position.Bottom} id="child-source" />}

      {selected && (
        <div className="person-node__quickmenu nodrag nopan" onClick={(e) => e.stopPropagation()}>
          <button title="Edit details" onClick={() => onEdit(person.id)}>
            Edit
          </button>
          <button title="Add child" onClick={() => addChild(person.id)}>
            + Child
          </button>
          <button
            title="Add parent"
            disabled={person.parentIds.length >= 2}
            onClick={() => addParent(person.id)}
          >
            + Parent
          </button>
          <button title="Add partner" onClick={() => addPartner(person.id)}>
            + Partner
          </button>
          <button title="Delete" className="danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

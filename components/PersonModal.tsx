'use client';

import React, { useEffect, useState } from 'react';
import { Partnership, Person } from '@/lib/types';
import { useFamilyTree } from '@/context/FamilyTreeContext';
import { useAuth } from '@/context/AuthContext';
import ChildrenReorderList from './ChildrenReorderList';

interface Props {
  personId: string;
  onClose: () => void;
  onNavigateToPerson: (id: string) => void;
}

export default function PersonModal({ personId, onClose, onNavigateToPerson }: Props) {
  const { people, partnerships, updatePerson, addChild, addParent, addPartner, setPartnershipStatus, deletePerson } =
    useFamilyTree();
  const { canEdit } = useAuth();
  const person = people[personId];
  const [form, setForm] = useState<Person | null>(person ?? null);

  useEffect(() => {
    setForm(person ?? null);
  }, [person]);

  if (!form) return null;

  const parents = form.parentIds.map((id) => people[id]).filter(Boolean);
  const childCount = Object.values(people).filter((p) => p.parentIds.includes(personId)).length;
  const myPartnerships: { partnership: Partnership; otherPerson: Person }[] = partnerships
    .filter((partnership) => partnership.partnerIds.includes(personId))
    .map((partnership) => {
      const otherId = partnership.partnerIds.find((id) => id !== personId)!;
      return { partnership, otherPerson: people[otherId] };
    })
    .filter((entry) => Boolean(entry.otherPerson));

  function handleChange<K extends keyof Person>(key: K, value: Person[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function handleSave() {
    if (!form) return;
    updatePerson(personId, {
      firstName: form.firstName,
      lastName: form.lastName,
      photoUrl: form.photoUrl,
    });
    onClose();
  }

  function handleAddChild() {
    const newId = addChild(personId);
    onNavigateToPerson(newId);
  }

  function handleAddParent() {
    const newId = addParent(personId);
    if (newId) onNavigateToPerson(newId);
  }

  function handleAddPartner() {
    const newId = addPartner(personId);
    onNavigateToPerson(newId);
  }

  function handleDelete() {
    if (!form) return;
    if (childCount > 0) {
      const ok = window.confirm(
        `${form.firstName} has ${childCount} child${childCount > 1 ? 'ren' : ''} on record. Deleting will replace them with a placeholder parent so the child${childCount > 1 ? 'ren keep' : ' keeps'} both parent slots. Continue?`
      );
      if (!ok) return;
    }
    deletePerson(personId);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{canEdit ? 'Edit Person' : 'Person'}</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal__body">
          <div className="form-row">
            <label>
              First name
              <input
                value={form.firstName}
                disabled={!canEdit}
                onChange={(e) => handleChange('firstName', e.target.value)}
              />
            </label>
            <label>
              Last name
              <input
                value={form.lastName}
                disabled={!canEdit}
                onChange={(e) => handleChange('lastName', e.target.value)}
              />
            </label>
          </div>

          <label className="form-full">
            Photo URL
            <input
              value={form.photoUrl}
              placeholder="https://..."
              disabled={!canEdit}
              onChange={(e) => handleChange('photoUrl', e.target.value)}
            />
          </label>

          {parents.length > 0 && (
            <div className="modal__parents">
              Parents:{' '}
              {parents.map((parent, i) => (
                <span key={parent.id}>
                  <button className="link-button" onClick={() => onNavigateToPerson(parent.id)}>
                    {parent.firstName} {parent.lastName}
                  </button>
                  {i < parents.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          )}

          {myPartnerships.length > 0 && (
            <div className="modal__partners">
              Partners:
              {myPartnerships.map(({ partnership, otherPerson }) => (
                <div key={partnership.id} className="modal__partner-row">
                  <button className="link-button" onClick={() => onNavigateToPerson(otherPerson.id)}>
                    {otherPerson.firstName} {otherPerson.lastName}
                  </button>
                  <span className={`partner-status${partnership.status === 'divorced' ? ' partner-status--divorced' : ''}`}>
                    {partnership.status === 'divorced' ? 'Divorced' : 'Together'}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() =>
                        setPartnershipStatus(
                          partnership.id,
                          partnership.status === 'divorced' ? 'together' : 'divorced'
                        )
                      }
                    >
                      {partnership.status === 'divorced' ? 'Mark together' : 'Mark divorced'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <ChildrenReorderList parentId={personId} onNavigateToPerson={onNavigateToPerson} />
        </div>

        {canEdit && (
          <div className="modal__actions">
            <button onClick={handleAddChild}>+ Child</button>
            <button onClick={handleAddParent} disabled={form.parentIds.length >= 2}>
              + Parent
            </button>
            <button onClick={handleAddPartner}>+ Partner</button>
            <button className="danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        )}

        <div className="modal__footer">
          <button onClick={onClose}>{canEdit ? 'Cancel' : 'Close'}</button>
          {canEdit && (
            <button className="primary" onClick={handleSave}>
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

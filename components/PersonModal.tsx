'use client';

import React, { useEffect, useState } from 'react';
import { Person } from '@/lib/types';
import { useFamilyTree } from '@/context/FamilyTreeContext';

interface Props {
  personId: string;
  onClose: () => void;
  onNavigateToPerson: (id: string) => void;
}

export default function PersonModal({ personId, onClose, onNavigateToPerson }: Props) {
  const { people, updatePerson, addChild, addParent, deletePerson } = useFamilyTree();
  const person = people[personId];
  const [form, setForm] = useState<Person | null>(person ?? null);

  useEffect(() => {
    setForm(person ?? null);
  }, [person]);

  if (!form) return null;

  const parents = form.parentIds.map((id) => people[id]).filter(Boolean);
  const childCount = Object.values(people).filter((p) => p.parentIds.includes(personId)).length;

  function handleChange<K extends keyof Person>(key: K, value: Person[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function handleSave() {
    if (!form) return;
    updatePerson(personId, {
      firstName: form.firstName,
      lastName: form.lastName,
      gender: form.gender,
      birthDate: form.birthDate,
      deathDate: form.deathDate,
      photoUrl: form.photoUrl,
      notes: form.notes,
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

  function handleDelete() {
    if (!form) return;
    if (childCount > 0) {
      const ok = window.confirm(
        `${form.firstName} has ${childCount} child${childCount > 1 ? 'ren' : ''} on record. Deleting will remove this person as their parent, but the children stay. Continue?`
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
          <h2>Edit Person</h2>
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
                onChange={(e) => handleChange('firstName', e.target.value)}
              />
            </label>
            <label>
              Last name
              <input
                value={form.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Gender
              <select value={form.gender} onChange={(e) => handleChange('gender', e.target.value as Person['gender'])}>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              Birth date
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => handleChange('birthDate', e.target.value)}
              />
            </label>
            <label>
              Passing date
              <input
                type="date"
                value={form.deathDate}
                onChange={(e) => handleChange('deathDate', e.target.value)}
              />
            </label>
          </div>

          <label className="form-full">
            Photo URL
            <input
              value={form.photoUrl}
              placeholder="https://..."
              onChange={(e) => handleChange('photoUrl', e.target.value)}
            />
          </label>

          <label className="form-full">
            Notes
            <textarea
              value={form.notes}
              rows={3}
              onChange={(e) => handleChange('notes', e.target.value)}
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
        </div>

        <div className="modal__actions">
          <button onClick={handleAddChild}>+ Add child</button>
          <button onClick={handleAddParent} disabled={form.parentIds.length >= 2}>
            + Add parent
          </button>
          <button className="danger" onClick={handleDelete}>
            Delete
          </button>
        </div>

        <div className="modal__footer">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

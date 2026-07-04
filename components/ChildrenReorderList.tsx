'use client';

import React from 'react';
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFamilyTree } from '@/context/FamilyTreeContext';
import { Person } from '@/lib/types';

interface RowProps {
  person: Person;
  onNavigateToPerson: (id: string) => void;
}

function SortableChildRow({ person, onNavigateToPerson }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: person.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="children-reorder__row">
      <button
        className="children-reorder__handle"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <button className="link-button" onClick={() => onNavigateToPerson(person.id)}>
        {person.firstName} {person.lastName}
      </button>
    </div>
  );
}

interface Props {
  parentId: string;
  onNavigateToPerson: (id: string) => void;
}

export default function ChildrenReorderList({ parentId, onNavigateToPerson }: Props) {
  const { people, reorderChildren } = useFamilyTree();
  const children = Object.values(people)
    .filter((p) => p.parentIds.includes(parentId))
    .sort((a, b) => a.order - b.order);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (children.length === 0) return null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = children.map((c) => c.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    reorderChildren(parentId, arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <div className="modal__children">
      <div className="modal__children-label">Children (drag to reorder)</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {children.map((child) => (
            <SortableChildRow key={child.id} person={child} onNavigateToPerson={onNavigateToPerson} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

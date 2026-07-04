'use client';

import React, { useRef, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { FamilyTreeProvider, useFamilyTree } from '@/context/FamilyTreeContext';
import { exportTreeAsFile, parseImportedTree } from '@/lib/storage';
import FamilyTreeCanvas, { FocusRequest } from './FamilyTreeCanvas';
import PersonModal from './PersonModal';
import SearchBar from './SearchBar';

function Toolbar() {
  const { people, replaceAll } = useFamilyTree();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    exportTreeAsFile({ people });
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const data = parseImportedTree(text);
      replaceAll(data);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to import file.');
    }
  }

  return (
    <div className="toolbar">
      <h1 className="toolbar__title">Family Tree</h1>
      <div className="toolbar__actions">
        <button onClick={handleExport}>Export JSON</button>
        <button onClick={handleImportClick}>Import JSON</button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

function FamilyTreeAppInner() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const { ready } = useFamilyTree();

  function focusPerson(id: string) {
    setSelectedId(id);
    setFocusRequest({ id, nonce: Date.now() });
  }

  if (!ready) {
    return <div className="loading">Loading family tree…</div>;
  }

  return (
    <div className="app-shell">
      <Toolbar />
      <div className="app-search">
        <SearchBar onSelect={focusPerson} />
      </div>
      <div className="app-canvas">
        <FamilyTreeCanvas onSelectPerson={focusPerson} focusRequest={focusRequest} />
      </div>
      {selectedId && (
        <PersonModal
          personId={selectedId}
          onClose={() => setSelectedId(null)}
          onFocusPerson={focusPerson}
        />
      )}
    </div>
  );
}

export default function FamilyTreeApp() {
  return (
    <FamilyTreeProvider>
      <ReactFlowProvider>
        <FamilyTreeAppInner />
      </ReactFlowProvider>
    </FamilyTreeProvider>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { FamilyTreeProvider, useFamilyTree } from '@/context/FamilyTreeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import FamilyTreeCanvas, { FocusRequest } from './FamilyTreeCanvas';
import PersonModal from './PersonModal';
import SearchBar from './SearchBar';
import DataModal from './DataModal';
import UnlockModal from './UnlockModal';

function FamilyTreeAppInner() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const { ready } = useFamilyTree();
  const { canEdit } = useAuth();

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  function panToPerson(id: string) {
    setFocusRequest({ id, nonce: Date.now() });
  }

  if (!ready) {
    return <div className="loading">Loading family tree…</div>;
  }

  return (
    <div className="app-shell">
      <div className="floating-actions">
        <button
          className={searchOpen ? 'active' : ''}
          onClick={() => setSearchOpen((v) => !v)}
          title="Search (Ctrl/Cmd+F)"
        >
          Search
        </button>
        <button onClick={() => setDataModalOpen(true)}>JSON</button>
        {!canEdit && <button onClick={() => setUnlockOpen(true)}>🔒 Edit</button>}
      </div>

      {searchOpen && (
        <div className="app-search">
          <SearchBar
            onSelect={(id) => {
              panToPerson(id);
              setSearchOpen(false);
            }}
            onClose={() => setSearchOpen(false)}
          />
        </div>
      )}

      <div className="app-canvas">
        <FamilyTreeCanvas onEditPerson={setSelectedId} focusRequest={focusRequest} />
      </div>

      {selectedId && (
        <PersonModal personId={selectedId} onClose={() => setSelectedId(null)} onNavigateToPerson={setSelectedId} />
      )}

      {dataModalOpen && <DataModal onClose={() => setDataModalOpen(false)} />}

      {unlockOpen && <UnlockModal onClose={() => setUnlockOpen(false)} />}
    </div>
  );
}

export default function FamilyTreeApp() {
  return (
    <AuthProvider>
      <FamilyTreeProvider>
        <ReactFlowProvider>
          <FamilyTreeAppInner />
        </ReactFlowProvider>
      </FamilyTreeProvider>
    </AuthProvider>
  );
}

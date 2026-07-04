'use client';

import React, { useRef, useState } from 'react';
import { useFamilyTree } from '@/context/FamilyTreeContext';
import { exportTreeAsFile, parseImportedTree } from '@/lib/storage';

interface Props {
  onClose: () => void;
}

export default function DataModal({ onClose }: Props) {
  const { people, partnerships, replaceAll } = useFamilyTree();
  const [text, setText] = useState(() => JSON.stringify({ people, partnerships }, null, 2));
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleApply() {
    try {
      const data = parseImportedTree(text);
      replaceAll(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON.');
    }
  }

  function handleDownload() {
    exportTreeAsFile({ people, partnerships });
  }

  function handleLoadFileClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const fileText = await file.text();
    setText(fileText);
    setError('');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Family Tree Data (JSON)</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal__body">
          <textarea
            className="json-editor"
            value={text}
            spellCheck={false}
            onChange={(e) => {
              setText(e.target.value);
              setError('');
            }}
          />
          {error && <div className="json-editor__error">{error}</div>}
        </div>

        <div className="modal__actions">
          <button onClick={handleDownload}>Download</button>
          <button onClick={handleLoadFileClick}>Load file…</button>
          <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleFileChange} />
        </div>

        <div className="modal__footer">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

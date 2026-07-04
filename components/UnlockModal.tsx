'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Props {
  onClose: () => void;
}

export default function UnlockModal({ onClose }: Props) {
  const { unlock } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const ok = await unlock(password);
    setSubmitting(false);
    if (ok) {
      onClose();
    } else {
      setError('Incorrect password.');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Unlock editing</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form className="modal__body" onSubmit={handleSubmit}>
          <label className="form-full">
            Password
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
            />
          </label>
          {error && <div className="json-editor__error">{error}</div>}
          <div className="modal__footer">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary" type="submit" disabled={submitting || !password}>
              {submitting ? 'Checking…' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

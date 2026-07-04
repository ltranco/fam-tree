'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface AuthContextValue {
  canEdit: boolean;
  unlock: (password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    fetch('/api/session')
      .then((res) => res.json())
      .then((data) => setCanEdit(Boolean(data.canEdit)))
      .catch(() => setCanEdit(false));
  }, []);

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    const res = await fetch('/api/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const ok = res.ok;
    if (ok) setCanEdit(true);
    return ok;
  }, []);

  return <AuthContext.Provider value={{ canEdit, unlock }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Dialect = 'Lovari' | 'Kelderash' | 'Arli';
export type Style = 'Neutral' | 'Formal' | 'Informal';

type SettingsContextType = {
  dialect: Dialect | null;
  setDialect: (d: Dialect) => void;
  style: Style;
  setStyle: (s: Style) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [dialect, setDialectState] = useState<Dialect | null>(null);
  const [style, setStyleState] = useState<Style>('Neutral');

  useEffect(() => {
    const d = localStorage.getItem('dialect') as Dialect | null;
    const s = (localStorage.getItem('style') as Style | null) || 'Neutral';
    if (d) setDialectState(d);
    setStyleState(s || 'Neutral');
  }, []);

  const setDialect = (d: Dialect) => {
    setDialectState(d);
    localStorage.setItem('dialect', d);
  };

  const setStyle = (s: Style) => {
    setStyleState(s);
    localStorage.setItem('style', s);
  };

  const value = useMemo(() => ({ dialect, setDialect, style, setStyle }), [dialect, style]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

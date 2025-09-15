'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Toast = { id: number; title: string; description?: string; variant?: 'default' | 'destructive' };

const ToastContext = createContext<{ toast: (t: Omit<Toast, 'id'>) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (t: Omit<Toast, 'id'>) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3000);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-md border p-3 shadow bg-white ${t.variant === 'destructive' ? 'border-red-300' : 'border-gray-200'}`}>
            <div className="font-medium">{t.title}</div>
            {t.description && <div className="text-sm text-gray-600">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

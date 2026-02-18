import { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface ToastItem {
  id: string;
  message: string;
  tone: 'info' | 'error' | 'success';
}

interface ToastContextValue {
  toasts: ToastItem[];
  pushToast: (message: string, tone?: ToastItem['tone']) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const uid = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    const id = uid();
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => removeToast(id), 3500);
  }, [removeToast]);

  const value = useMemo(
    () => ({ toasts, pushToast, removeToast }),
    [removeToast, toasts, pushToast]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

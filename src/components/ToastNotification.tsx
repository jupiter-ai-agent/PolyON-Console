import { createContext, useCallback, useContext, useState, useRef } from 'react';
import { ActionableNotification } from '@carbon/react';

// ── 타입 ──────────────────────────────────────────────────────────────────

type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  subtitle?: string;
}

interface ToastContextValue {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  warning: (msg: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────

const AUTO_CLOSE_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const add = useCallback((kind: ToastKind, msg: string) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, kind, title: msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_CLOSE_MS);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    success: (msg) => add('success', msg),
    error: (msg) => add('error', msg),
    info: (msg) => add('info', msg),
    warning: (msg) => add('warning', msg),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            zIndex: 9999,
            maxWidth: 380,
          }}
        >
          {toasts.map((t) => (
            <ActionableNotification
              key={t.id}
              kind={t.kind}
              title={t.title}
              inline={false}
              lowContrast={false}
              onClose={() => { remove(t.id); return false; }}
              onCloseButtonClick={() => remove(t.id)}
              style={{ minWidth: 320 }}
            />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

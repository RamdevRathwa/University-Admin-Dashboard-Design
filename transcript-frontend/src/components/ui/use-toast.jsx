import * as React from "react";

const ToastContext = React.createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  const toast = React.useCallback((t) => {
    const id = t.id || `toast_${Math.random().toString(36).slice(2, 10)}`;
    const next = { id, title: t.title, description: t.description, variant: t.variant || "default", duration: t.duration ?? 3500 };
    setToasts((prev) => [next, ...prev]);
    if (next.duration > 0) {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, next.duration);
    }
    return { id };
  }, []);

  const dismiss = React.useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const value = React.useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}


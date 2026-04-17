"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ToastKind = "success" | "error" | "warning" | "info";
interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  show: (kind: ToastKind, message: string) => void;
  success: (m: string) => void;
  error: (m: string) => void;
  warning: (m: string) => void;
  info: (m: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((kind: ToastKind, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  }, []);

  const api = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (m) => show("success", m),
      error: (m) => show("error", m),
      warning: (m) => show("warning", m),
      info: (m) => show("info", m),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 safe-top">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const Icon =
    toast.kind === "success"
      ? CheckCircle2
      : toast.kind === "error"
        ? XCircle
        : toast.kind === "warning"
          ? AlertTriangle
          : Info;
  const color =
    toast.kind === "success"
      ? "text-[var(--color-success)]"
      : toast.kind === "error"
        ? "text-[var(--color-accent)]"
        : toast.kind === "warning"
          ? "text-[var(--color-warning)]"
          : "text-[var(--color-info)]";
  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm shadow-lg shadow-black/40 transition-all duration-200",
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
      )}
    >
      <Icon className={cn("size-5 shrink-0", color)} />
      <span className="flex-1 text-[var(--color-text)]">{toast.message}</span>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

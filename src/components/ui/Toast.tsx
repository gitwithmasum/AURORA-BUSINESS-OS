"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const iconMap: Record<ToastTone, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-[var(--aurora-info)]" />,
  success: <CheckCircle2 className="h-4 w-4 text-[var(--aurora-success)]" />,
  warning: <AlertTriangle className="h-4 w-4 text-[var(--aurora-warning)]" />,
  error: <XCircle className="h-4 w-4 text-[var(--aurora-danger)]" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback(
    (item: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev.slice(-3), { ...item, id }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
      >
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "aurora-glass-elevated pointer-events-auto flex items-start gap-3 rounded-[18px] p-3.5"
              )}
            >
              <div className="mt-0.5 shrink-0">
                {iconMap[item.tone ?? "info"]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--aurora-text-strong)]">
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-0.5 text-[11px] text-[var(--aurora-text-muted)]">
                    {item.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="cursor-pointer rounded-full p-1 text-[var(--aurora-text-muted)] transition-colors hover:text-[var(--aurora-text-strong)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContextCompat();
  return ctx;
}

function useContextCompat() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

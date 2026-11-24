"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { GlassButton } from "./GlassButton";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  side?: "left" | "right";
  widthClass?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  side = "right",
  widthClass = "w-full max-w-md",
  children,
  footer,
}: DrawerProps) {
  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  const initialX = side === "right" ? 360 : -360;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ x: initialX, opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: initialX, opacity: 0.8 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className={cn(
              "aurora-glass-elevated fixed bottom-3 top-3 z-10 flex flex-col overflow-hidden rounded-[26px]",
              side === "right" ? "right-3" : "left-3",
              widthClass
            )}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--aurora-glass-border)] px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--aurora-text-strong)]">
                  {title}
                </h2>
                {description && (
                  <p className="mt-0.5 text-xs text-[var(--aurora-text-muted)]">
                    {description}
                  </p>
                )}
              </div>
              <GlassButton
                variant="ghost"
                size="icon"
                aria-label="Close drawer"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </GlassButton>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-2.5 border-t border-[var(--aurora-glass-border)] px-5 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

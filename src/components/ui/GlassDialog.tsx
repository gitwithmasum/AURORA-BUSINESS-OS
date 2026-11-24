"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { GlassButton } from "./GlassButton";

export interface GlassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const maxWidthClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function GlassDialog({
  open,
  onOpenChange,
  title,
  description,
  maxWidth = "md",
  children,
  footer,
}: GlassDialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "aurora-glass-elevated relative z-10 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-[26px]",
              maxWidthClasses[maxWidth]
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--aurora-glass-border)] px-6 py-4">
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
                aria-label="Close dialog"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </GlassButton>
            </div>

            <div className="overflow-y-auto px-6 py-5">{children}</div>

            {footer && (
              <div className="flex items-center justify-end gap-2.5 border-t border-[var(--aurora-glass-border)] px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export { GlassDialog as Modal };

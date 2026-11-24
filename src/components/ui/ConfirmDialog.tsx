"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { GlassButton } from "./GlassButton";
import { GlassDialog } from "./GlassDialog";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <GlassDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      maxWidth="sm"
      footer={
        <>
          <GlassButton
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </GlassButton>
          <GlassButton
            variant={tone === "danger" ? "danger" : "primary"}
            size="sm"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </GlassButton>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--aurora-warning)_18%,transparent)] text-[var(--aurora-warning)]">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm leading-relaxed text-[var(--aurora-text)]">
          {description}
        </p>
      </div>
    </GlassDialog>
  );
}

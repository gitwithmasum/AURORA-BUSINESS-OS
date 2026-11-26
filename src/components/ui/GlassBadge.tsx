"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "accent";

export interface GlassBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral:
    "bg-[var(--aurora-glass-bg-subtle)] text-[var(--aurora-text)] border-[var(--aurora-glass-border)]",
  info:
    "bg-[color-mix(in_srgb,var(--aurora-info)_16%,transparent)] text-[var(--aurora-info)] border-[color-mix(in_srgb,var(--aurora-info)_35%,transparent)]",
  success:
    "bg-[color-mix(in_srgb,var(--aurora-success)_16%,transparent)] text-[var(--aurora-success)] border-[color-mix(in_srgb,var(--aurora-success)_35%,transparent)]",
  warning:
    "bg-[color-mix(in_srgb,var(--aurora-warning)_16%,transparent)] text-[var(--aurora-warning)] border-[color-mix(in_srgb,var(--aurora-warning)_35%,transparent)]",
  danger:
    "bg-[color-mix(in_srgb,var(--aurora-danger)_16%,transparent)] text-[var(--aurora-danger)] border-[color-mix(in_srgb,var(--aurora-danger)_35%,transparent)]",
  accent:
    "bg-[color-mix(in_srgb,var(--aurora-accent)_18%,transparent)] text-[var(--aurora-accent)] border-[color-mix(in_srgb,var(--aurora-accent)_38%,transparent)]",
};

const dotClasses: Record<BadgeTone, string> = {
  neutral: "bg-[var(--aurora-text-muted)]",
  info: "bg-[var(--aurora-info)]",
  success: "bg-[var(--aurora-success)]",
  warning: "bg-[var(--aurora-warning)]",
  danger: "bg-[var(--aurora-danger)]",
  accent: "bg-[var(--aurora-accent)]",
};

export function GlassBadge({
  tone = "neutral",
  dot = false,
  className,
  children,
  ...props
}: GlassBadgeProps) {
  return (
    <span
      className={cn(
        "system-code inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

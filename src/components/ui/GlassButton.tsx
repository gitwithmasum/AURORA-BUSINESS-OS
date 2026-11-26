"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "capsule";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

const variantClasses: Record<NonNullable<GlassButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--aurora-accent)] text-[var(--aurora-accent-contrast)] font-semibold shadow-[0_8px_24px_-6px_var(--aurora-glow)] hover:brightness-110 active:scale-[0.98]",
  secondary:
    "aurora-glass text-[var(--aurora-text-strong)] hover:bg-[var(--aurora-glass-bg-elevated)] hover:border-[var(--aurora-glass-border-strong)] active:scale-[0.98]",
  ghost:
    "bg-transparent text-[var(--aurora-text)] hover:bg-[var(--aurora-glass-bg-subtle)] hover:text-[var(--aurora-text-strong)] active:scale-[0.98]",
  danger:
    "bg-[color-mix(in_srgb,var(--aurora-danger)_18%,transparent)] text-[var(--aurora-danger)] border border-[color-mix(in_srgb,var(--aurora-danger)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--aurora-danger)_28%,transparent)] active:scale-[0.98]",
  capsule:
    "aurora-capsule text-[var(--aurora-text-strong)] hover:border-[var(--aurora-glass-border-strong)] hover:bg-[var(--aurora-glass-bg-elevated)] active:scale-[0.98]",
};

const sizeClasses: Record<NonNullable<GlassButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-xs rounded-[14px] gap-1.5",
  md: "h-10 px-4 text-sm rounded-[16px] gap-2",
  lg: "h-11 px-5 text-sm rounded-[18px] gap-2",
  icon: "h-9 w-9 rounded-full justify-center",
};

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      loading = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          "inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aurora-accent)] disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          variant === "capsule" && size !== "icon" ? "rounded-full" : "",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {children}
      </button>
    );
  }
);

GlassButton.displayName = "GlassButton";

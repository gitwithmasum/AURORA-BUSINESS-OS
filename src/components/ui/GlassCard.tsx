"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "subtle";
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  overflow?: "hidden" | "visible";
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-7",
};

const variantMap = {
  default: "aurora-glass",
  elevated: "aurora-glass-elevated",
  subtle: "aurora-glass-subtle",
};

export function GlassCard({
  className,
  variant = "default",
  interactive = false,
  padding = "md",
  overflow,
  children,
  ...props
}: GlassCardProps) {
  const isOverflowVisible =
    overflow === "visible" ||
    (typeof className === "string" && className.includes("overflow-visible"));

  return (
    <div
      className={cn(
        "relative rounded-[22px] transition-all duration-200",
        isOverflowVisible ? "overflow-visible" : "overflow-hidden",
        variantMap[variant],
        paddingMap[padding],
        interactive &&
          "hover:-translate-y-0.5 hover:border-[var(--aurora-glass-border-strong)] hover:shadow-[0_24px_55px_-18px_var(--aurora-glow)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function GlassCardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-wrap items-start justify-between gap-3", className)}
      {...props}
    />
  );
}

export function GlassCardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-[16px] sm:text-[17px] font-semibold tracking-tight text-[var(--aurora-text-strong)]",
        className
      )}
      {...props}
    />
  );
}

export function GlassCardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-[var(--aurora-text-muted)]", className)}
      {...props}
    />
  );
}

export function GlassCardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4", className)} {...props} />;
}

export function GlassCardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-4 flex items-center justify-between gap-3 border-t border-[var(--aurora-glass-border)] pt-3.5",
        className
      )}
      {...props}
    />
  );
}

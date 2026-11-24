"use client";

import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[14px] bg-[var(--aurora-glass-bg-elevated)] opacity-60",
        className
      )}
      {...props}
    />
  );
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="aurora-glass-subtle mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-[var(--aurora-text-muted)]">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <h4 className="text-sm font-semibold text-[var(--aurora-text-strong)]">
        {title}
      </h4>
      <p className="mt-1 max-w-sm text-xs text-[var(--aurora-text-muted)]">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

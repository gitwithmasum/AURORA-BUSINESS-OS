"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { GlassCard } from "./GlassCard";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  leading?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  badges,
  actions,
  leading,
  className,
}: PageHeaderProps) {
  return (
    <GlassCard variant="elevated" padding="sm" className={cn("px-5 py-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {leading && <div className="shrink-0">{leading}</div>}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-[var(--aurora-text-strong)] sm:text-lg">
                {title}
              </h1>
              {badges}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-xs text-[var(--aurora-text-muted)]">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </GlassCard>
  );
}

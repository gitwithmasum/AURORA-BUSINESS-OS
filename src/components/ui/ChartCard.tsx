"use client";

import * as React from "react";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "./GlassCard";
import { Skeleton } from "./Skeleton";

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  loading?: boolean;
  heightClass?: string;
  className?: string;
  children: React.ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  action,
  loading = false,
  heightClass = "h-[270px]",
  className,
  children,
}: ChartCardProps) {
  return (
    <GlassCard className={className}>
      <GlassCardHeader>
        <div>
          <GlassCardTitle>{title}</GlassCardTitle>
          {subtitle && <GlassCardDescription>{subtitle}</GlassCardDescription>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </GlassCardHeader>
      <GlassCardContent>
        {loading ? (
          <Skeleton className={`w-full rounded-[16px] ${heightClass}`} />
        ) : (
          <div className={`w-full ${heightClass}`}>{children}</div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}

interface TooltipPayloadEntry {
  name?: string;
  value?: number | string;
  color?: string;
}

export interface GlassChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  valueFormatter?: (value: number, name?: string) => string;
}

export function GlassChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: GlassChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="aurora-glass-elevated min-w-[165px] rounded-[16px] px-3.5 py-2.5 text-xs">
      {label && (
        <div className="mb-1.5 font-semibold text-[var(--aurora-text-strong)]">
          {label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => {
          const numVal =
            typeof entry.value === "number"
              ? entry.value
              : Number(entry.value ?? 0);
          const formatted = valueFormatter
            ? valueFormatter(numVal, entry.name)
            : numVal.toLocaleString();
          return (
            <div
              key={`${entry.name}-${idx}`}
              className="flex items-center justify-between gap-4"
            >
              <span className="flex items-center gap-1.5 text-[var(--aurora-text-muted)]">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: entry.color ?? "var(--aurora-accent)",
                  }}
                />
                {entry.name}
              </span>
              <span className="font-semibold text-[var(--aurora-text-strong)]">
                {formatted}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

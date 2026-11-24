"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { GlassBadge } from "./GlassBadge";
import { GlassCard } from "./GlassCard";

export interface KpiCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  hint?: string;
  icon?: React.ReactNode;
  compact?: boolean;
  delay?: number;
  className?: string;
}

export function KpiCard({
  label,
  value,
  delta,
  trend = "neutral",
  hint,
  icon,
  compact = false,
  delay = 0,
  className,
}: KpiCardProps) {
  const tone =
    trend === "up" ? "success" : trend === "down" ? "warning" : "neutral";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay }}
      className="h-full"
    >
      <GlassCard
        interactive
        padding={compact ? "sm" : "md"}
        className={cn("h-full", className)}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--aurora-text-muted)]">
            {icon && <span className="text-[var(--aurora-accent)]">{icon}</span>}
            {label}
          </span>
          {delta && (
            <GlassBadge tone={tone} className="shrink-0">
              {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
              {trend === "down" && <ArrowDownRight className="h-3 w-3" />}
              {trend === "neutral" && <Minus className="h-3 w-3" />}
              {delta}
            </GlassBadge>
          )}
        </div>

        <div
          className={cn(
            "font-bold tracking-tight text-[var(--aurora-text-strong)]",
            compact ? "mt-2 text-lg" : "mt-3 text-2xl"
          )}
        >
          {value}
        </div>

        {!compact && hint && (
          <p className="mt-1.5 text-[11px] text-[var(--aurora-text-muted)]">
            {hint}
          </p>
        )}
      </GlassCard>
    </motion.div>
  );
}

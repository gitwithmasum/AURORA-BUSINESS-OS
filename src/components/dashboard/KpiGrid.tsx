"use client";

import * as React from "react";
import type { DensityMode, KpiMetric } from "@/types/dashboard";
import { cn } from "@/lib/utils/cn";
import { KpiCard } from "@/components/ui";

export interface KpiGridProps {
  kpis: KpiMetric[];
  density: DensityMode;
}

export function KpiGrid({ kpis, density }: KpiGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3.5",
        density === "compact"
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      )}
    >
      {kpis.map((kpi, idx) => (
        <KpiCard
          key={kpi.id}
          label={kpi.label}
          value={kpi.value}
          delta={kpi.delta}
          trend={kpi.trend}
          hint={kpi.hint}
          compact={density === "compact"}
          delay={Math.min(idx * 0.025, 0.25)}
        />
      ))}
    </div>
  );
}

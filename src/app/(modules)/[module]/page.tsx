"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Layers, Palette, ShieldCheck } from "lucide-react";
import { ALL_NAV_ITEMS } from "@/config/navigation";
import { THEME_LIST } from "@/lib/theme/themes";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils/cn";
import { DynamicCategoryManager } from "@/components/settings/DynamicCategoryManager";
import { OrganizationSettingsPanel } from "@/components/settings/OrganizationSettingsPanel";
import {
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
  useToast,
} from "@/components/ui";

export default function ModuleRoadmapPage() {
  const params = useParams<{ module: string }>();
  const slug = params?.module ?? "";
  const { themeId, setThemeId } = useTheme();
  const { toast } = useToast();

  const navItem = ALL_NAV_ITEMS.find((item) => item.href === `/${slug}`);
  const isSettings = slug === "settings";
  const isCategories = slug === "categories-brands";

  return (
    <div className="space-y-5">
      <GlassCard variant="elevated">
        <GlassCardHeader>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <GlassBadge tone="info">
                {navItem?.phase ?? "Scheduled Phase"}
              </GlassBadge>
              <GlassBadge tone={isSettings || isCategories ? "success" : "warning"}>
                {isSettings || isCategories
                  ? "Part 02 Backend Wired"
                  : "Module Shell · Awaiting Part 03+"}
              </GlassBadge>
            </div>
            <GlassCardTitle className="text-xl">
              {navItem?.label ?? "Module Preview"}
            </GlassCardTitle>
            <GlassCardDescription className="max-w-2xl text-sm">
              {navItem?.description ??
                "This module route is wired into the AURORA BUSINESS OS shell and ready for full domain & database implementation in its designated phase."}
            </GlassCardDescription>
          </div>
          <Link href="/">
            <GlassButton variant="secondary" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Overview
            </GlassButton>
          </Link>
        </GlassCardHeader>

        <GlassCardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="aurora-glass-subtle rounded-[18px] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--aurora-text-strong)]">
                <Layers className="h-4 w-4 text-[var(--aurora-accent)]" />
                Design System Ready
              </div>
              <p className="mt-1.5 text-xs text-[var(--aurora-text-muted)]">
                Uses shared GlassCard, DataTable, GlassDialog, Drawer, and theme tokens.
              </p>
            </div>
            <div className="aurora-glass-subtle rounded-[18px] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--aurora-text-strong)]">
                <ShieldCheck className="h-4 w-4 text-[var(--aurora-success)]" />
                PostgreSQL &amp; RLS Ready
              </div>
              <p className="mt-1.5 text-xs text-[var(--aurora-text-muted)]">
                Migrations and organization-scoped RLS policies created in{" "}
                <code>supabase/migrations/</code>.
              </p>
            </div>
            <div className="aurora-glass-subtle rounded-[18px] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--aurora-text-strong)]">
                <Palette className="h-4 w-4 text-[var(--aurora-accent)]" />
                Zero Fake Persistence
              </div>
              <p className="mt-1.5 text-xs text-[var(--aurora-text-muted)]">
                No operational data is fabricated before Part 03+ module integration.
              </p>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {isCategories && <DynamicCategoryManager />}

      {isSettings && (
        <div className="grid gap-5 lg:grid-cols-2">
          <GlassCard>
            <GlassCardHeader>
              <div>
                <GlassCardTitle>Theme System Configuration</GlassCardTitle>
                <GlassCardDescription>
                  Switch between Midnight Blue, Emerald Aurora, and Light Glass using centralized tokens
                </GlassCardDescription>
              </div>
            </GlassCardHeader>
            <GlassCardContent className="space-y-2.5">
              {THEME_LIST.map((t) => {
                const active = t.id === themeId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setThemeId(t.id);
                      toast({
                        title: `Applied ${t.name} theme`,
                        tone: "success",
                      });
                    }}
                    className={cn(
                      "aurora-glass-subtle flex w-full cursor-pointer items-center justify-between rounded-[18px] p-3.5 text-left transition-all",
                      active &&
                        "aurora-active-glow border-[var(--aurora-glass-border-strong)]"
                    )}
                  >
                    <div>
                      <div className="text-sm font-semibold text-[var(--aurora-text-strong)]">
                        {t.name}
                      </div>
                      <div className="text-xs text-[var(--aurora-text-muted)]">
                        {t.subtitle} · BG {t.colors.background}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {t.swatches.map((hex) => (
                        <span
                          key={hex}
                          className="h-4 w-4 rounded-full border border-white/25"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                      {active && (
                        <Check className="ml-1 h-4 w-4 text-[var(--aurora-accent)]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </GlassCardContent>
          </GlassCard>

          <OrganizationSettingsPanel />
        </div>
      )}
    </div>
  );
}

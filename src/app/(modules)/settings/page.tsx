"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck, Sliders } from "lucide-react";
import { THEME_LIST } from "@/lib/theme/themes";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils/cn";
import { OrganizationSettingsPanel } from "@/components/settings/OrganizationSettingsPanel";
import { BackupAndAuditPanel } from "@/components/settings/BackupAndAuditPanel";
import {
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
  PageHeader,
  useToast,
} from "@/components/ui";

export default function SettingsPage() {
  const { themeId, setThemeId } = useTheme();
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings & Administration"
        subtitle="Manage glassmorphism themes, organization profile, RBAC team permissions, audit logs, and backups."
        leading={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--aurora-accent)_18%,transparent)] text-[var(--aurora-accent)]">
            <Sliders className="h-4 w-4" />
          </div>
        }
        badges={
          <>
            <GlassBadge tone={activeOrg ? "success" : "info"} dot>
              {activeOrg ? activeOrg.organizationName : "Theme & Preferences"}
            </GlassBadge>
            <GlassBadge tone="accent">
              <ShieldCheck className="mr-1 h-3 w-3" />
              RBAC + RLS Protected
            </GlassBadge>
          </>
        }
        actions={
          <Link href="/">
            <GlassButton variant="secondary" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Overview
            </GlassButton>
          </Link>
        }
      />

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

      <BackupAndAuditPanel />
    </div>
  );
}

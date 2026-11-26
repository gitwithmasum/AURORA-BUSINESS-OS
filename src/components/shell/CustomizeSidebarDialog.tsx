"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  RotateCcw,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useTheme } from "@/context/ThemeContext";
import { LOCKED_NAV_IDS } from "@/lib/navigation/preferences";
import { cn } from "@/lib/utils/cn";
import { GlassBadge, GlassButton, GlassDialog } from "@/components/ui";

export function CustomizeSidebarDialog({
  open,
  onOpenChange,
  iconMap,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  iconMap: Record<string, React.ComponentType<{ className?: string }>>;
}) {
  const { language } = useTheme();
  const {
    sidebarPrefs,
    orderedNavItems,
    setSidebarLayoutMode,
    setSidebarFontWeight,
    moveSidebarNavItem,
    toggleSidebarNavVisibility,
    resetSidebarPreferences,
  } = useWorkspace();

  const hiddenSet = new Set(sidebarPrefs.hiddenIds);

  return (
    <GlassDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Customize Sidebar Navigation"
      description="Switch between Vision Pods & Bento Grid, tune boldness, and arrange or pin your modules."
      maxWidth="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <GlassButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetSidebarPreferences}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Default
          </GlassButton>
          <GlassButton
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <Check className="h-3.5 w-3.5" />
            Done
          </GlassButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Mode & Boldness Bar */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="aurora-glass-subtle rounded-2xl p-3">
            <div className="system-code mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--aurora-text-muted)]">
              Sidebar Template Mode
            </div>
            <div className="flex gap-2">
              <GlassButton
                type="button"
                size="sm"
                variant={sidebarPrefs.layoutMode === "pods" ? "primary" : "ghost"}
                className="flex-1"
                onClick={() => setSidebarLayoutMode("pods")}
              >
                <List className="h-3.5 w-3.5" />
                Pods List
              </GlassButton>
              <GlassButton
                type="button"
                size="sm"
                variant={sidebarPrefs.layoutMode === "bento" ? "primary" : "ghost"}
                className="flex-1"
                onClick={() => setSidebarLayoutMode("bento")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Bento Grid
              </GlassButton>
            </div>
          </div>

          <div className="aurora-glass-subtle rounded-2xl p-3">
            <div className="system-code mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--aurora-text-muted)]">
              Navigation Font Weight
            </div>
            <div className="flex gap-2">
              <GlassButton
                type="button"
                size="sm"
                variant={sidebarPrefs.fontWeight === "700" ? "primary" : "ghost"}
                className="flex-1 font-bold"
                onClick={() => setSidebarFontWeight("700")}
              >
                700 Bold
              </GlassButton>
              <GlassButton
                type="button"
                size="sm"
                variant={sidebarPrefs.fontWeight === "800" ? "primary" : "ghost"}
                className="flex-1 font-extrabold"
                onClick={() => setSidebarFontWeight("800")}
              >
                800 ExtraBold
              </GlassButton>
            </div>
          </div>
        </div>

        {/* Module Order & Visibility Grid */}
        <div>
          <div className="system-code mb-2 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-[var(--aurora-text-muted)]">
            <span>Arrange &amp; Show/Hide Modules</span>
            <span>{orderedNavItems.length - sidebarPrefs.hiddenIds.length} Visible</span>
          </div>
          <div className="grid max-h-[45vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {orderedNavItems.map((item, idx) => {
              const Icon = iconMap[item.iconName];
              const isLocked = LOCKED_NAV_IDS.has(item.id);
              const isVisible = isLocked || !hiddenSet.has(item.id);

              return (
                <div
                  key={item.id}
                  className={cn(
                    "aurora-glass-subtle flex items-center justify-between gap-2 rounded-2xl px-3 py-2 transition-opacity",
                    !isVisible && "opacity-55"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-[var(--aurora-glass-border)] bg-[var(--aurora-glass-bg)] text-[var(--aurora-accent)]">
                      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                    </span>
                    <span className="truncate text-[13px] font-bold text-[var(--aurora-text-strong)]">
                      {language === "bn" ? item.labelBn : item.label}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSidebarNavItem(item.id, -1)}
                      aria-label={`Move ${item.label} up`}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-[var(--aurora-glass-border)] text-[var(--aurora-text-muted)] hover:text-[var(--aurora-text-strong)] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === orderedNavItems.length - 1}
                      onClick={() => moveSidebarNavItem(item.id, 1)}
                      aria-label={`Move ${item.label} down`}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-[var(--aurora-glass-border)] text-[var(--aurora-text-muted)] hover:text-[var(--aurora-text-strong)] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>

                    {isLocked ? (
                      <GlassBadge tone="info">Pinned</GlassBadge>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleSidebarNavVisibility(item.id)}
                        aria-label={`Toggle visibility for ${item.label}`}
                        className={cn(
                          "system-code flex h-7 cursor-pointer items-center gap-1 rounded-lg border px-2 text-[10.5px] font-semibold",
                          isVisible
                            ? "border-[color-mix(in_srgb,var(--aurora-success)_40%,transparent)] bg-[color-mix(in_srgb,var(--aurora-success)_14%,transparent)] text-[var(--aurora-success)]"
                            : "border-[var(--aurora-glass-border)] text-[var(--aurora-text-muted)]"
                        )}
                      >
                        {isVisible ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                        {isVisible ? "ON" : "OFF"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </GlassDialog>
  );
}

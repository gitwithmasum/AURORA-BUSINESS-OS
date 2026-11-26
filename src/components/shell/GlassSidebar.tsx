"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeDollarSign,
  Bell,
  Bot,
  Boxes,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  List,
  Megaphone,
  PlaneLanding,
  Receipt,
  Settings,
  Ship,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { cn } from "@/lib/utils/cn";
import { AuroraBrandTitle, AuroraLogoMark } from "@/components/brand/AuroraLogo";
import { CustomizeSidebarDialog } from "./CustomizeSidebarDialog";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  LineChart,
  Boxes,
  Sparkles,
  Tags,
  BadgeDollarSign,
  ShoppingBag,
  Users,
  Building2,
  ClipboardCheck,
  PlaneLanding,
  Ship,
  Landmark,
  Receipt,
  Megaphone,
  FileSpreadsheet,
  Bot,
  Settings,
};

function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { language } = useTheme();
  const { user, profile, activeOrg } = useAuth();
  const {
    toggleSidebar,
    sidebarPrefs,
    visibleNavItems,
    setSidebarLayoutMode,
  } = useWorkspace();
  const [customizeOpen, setCustomizeOpen] = React.useState(false);

  const displayName = user ? profile?.fullName || user.email || "User" : "Masum Billah";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "AU";
  const roleLabel = activeOrg
    ? ROLE_LABELS[activeOrg.roleKey]
    : user
      ? "No Organization"
      : "Owner · Preview Mode";

  const isBento = !collapsed && sidebarPrefs.layoutMode === "bento";
  const weightClass =
    sidebarPrefs.fontWeight === "800" ? "font-extrabold" : "font-bold";

  return (
    <div className="flex h-full flex-col">
      {/* Brand Header */}
      <div className="flex items-center justify-between gap-2 px-3.5 pt-4 pb-2.5">
        <Link
          href="/"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 overflow-hidden",
            collapsed && "justify-center"
          )}
        >
          <AuroraLogoMark />
          {!collapsed && <AuroraBrandTitle compact />}
        </Link>

        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--aurora-glass-border)] bg-[var(--aurora-glass-bg-subtle)] text-[var(--aurora-text-muted)] transition-colors hover:border-[var(--aurora-glass-border-strong)] hover:text-[var(--aurora-text-strong)] lg:flex"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Futuristic Segmented Toggle Pill + Customize Trigger (Sidebar Only) */}
      {!collapsed && (
        <div className="px-3 pb-2.5">
          <div className="aurora-glass-subtle flex items-center gap-1.5 rounded-2xl p-1.5">
            <div
              role="group"
              aria-label="Sidebar layout mode"
              className="flex flex-1 items-center rounded-full border border-[var(--aurora-glass-border-strong)] bg-[color-mix(in_srgb,var(--aurora-bg)_75%,transparent)] p-0.5 shadow-inner"
            >
              <button
                type="button"
                onClick={() => setSidebarLayoutMode("pods")}
                className={cn(
                  "flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[11.5px] font-bold transition-all",
                  !isBento
                    ? "bg-[var(--aurora-accent)] text-[var(--aurora-accent-contrast)] shadow-[0_0_16px_-3px_var(--aurora-glow)]"
                    : "text-[var(--aurora-text-muted)] hover:text-[var(--aurora-text-strong)]"
                )}
              >
                {!isBento && <Check className="h-3 w-3" />}
                <List className="h-3.5 w-3.5" />
                <span>Pods</span>
              </button>
              <span className="h-4 w-px bg-[var(--aurora-glass-border)]" />
              <button
                type="button"
                onClick={() => setSidebarLayoutMode("bento")}
                className={cn(
                  "flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[11.5px] font-bold transition-all",
                  isBento
                    ? "bg-[var(--aurora-accent)] text-[var(--aurora-accent-contrast)] shadow-[0_0_16px_-3px_var(--aurora-glow)]"
                    : "text-[var(--aurora-text-muted)] hover:text-[var(--aurora-text-strong)]"
                )}
              >
                {isBento && <Check className="h-3 w-3" />}
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Grid</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCustomizeOpen(true)}
              aria-label="Customize sidebar layout"
              title="Arrange & customize sidebar modules"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--aurora-warning)_38%,transparent)] bg-[color-mix(in_srgb,var(--aurora-warning)_12%,transparent)] text-[var(--aurora-warning)] transition-all hover:bg-[color-mix(in_srgb,var(--aurora-warning)_22%,transparent)] hover:shadow-[0_0_14px_rgba(251,191,36,0.35)]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Workspace Switcher */}
      <div className="px-3 pb-2.5">
        <WorkspaceSwitcher
          variant="sidebar"
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      </div>

      {/* Scrollable Navigation (Template 03 Pods / Template 04 Bento Grid) */}
      <nav
        aria-label="Primary sidebar navigation"
        className="flex-1 overflow-y-auto px-2.5 py-1"
      >
        {!collapsed && (
          <div className="system-code mb-1.5 flex items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aurora-accent)]">
            <span>{isBento ? "MODULES // BENTO GRID" : "NAVIGATION // PODS"}</span>
            <span className="text-[var(--aurora-text-muted)]">
              {visibleNavItems.length}
            </span>
          </div>
        )}

        <div
          className={cn(
            isBento ? "grid grid-cols-2 gap-1.5" : "space-y-1.5"
          )}
        >
          {visibleNavItems.map((item) => {
            const Icon = ICON_MAP[item.iconName] ?? LayoutDashboard;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <div key={item.id} className="group relative">
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "relative flex border transition-all duration-150",
                    weightClass,
                    collapsed
                      ? "items-center justify-center rounded-[16px] border-transparent px-0 py-2.5"
                      : isBento
                        ? "h-full flex-col items-start gap-2 rounded-[16px] p-2.5 text-[12.5px] leading-tight"
                        : "items-center gap-2.5 rounded-[16px] px-2.5 py-1.5 text-[13.5px]",
                    isActive
                      ? "border-[color-mix(in_srgb,var(--aurora-accent)_50%,transparent)] bg-[color-mix(in_srgb,var(--aurora-accent)_16%,transparent)] text-[var(--aurora-text-strong)] shadow-[0_0_20px_-6px_var(--aurora-glow)]"
                      : collapsed
                        ? "text-[var(--aurora-text-muted)] hover:bg-[var(--aurora-glass-bg-subtle)] hover:text-[var(--aurora-text-strong)]"
                        : "border-[var(--aurora-glass-border)] bg-[var(--aurora-glass-bg-subtle)] text-[var(--aurora-text)] hover:border-[var(--aurora-glass-border-strong)] hover:bg-[var(--aurora-glass-bg)] hover:text-[var(--aurora-text-strong)]"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="aurora-sidebar-active"
                      transition={{
                        type: "spring",
                        stiffness: 360,
                        damping: 30,
                      }}
                      className="aurora-active-glow pointer-events-none absolute inset-0 rounded-[16px]"
                    />
                  )}

                  <span
                    className={cn(
                      "relative z-10 flex shrink-0 items-center justify-center transition-all duration-150",
                      collapsed
                        ? "h-7 w-7"
                        : "h-7 w-7 rounded-[10px] border",
                      !collapsed &&
                        (isActive
                          ? "border-white/40 bg-[var(--aurora-accent)] text-[var(--aurora-accent-contrast)] shadow-[0_0_14px_var(--aurora-glow)]"
                          : "border-[var(--aurora-glass-border)] bg-[var(--aurora-glass-bg)] text-[var(--aurora-accent)] group-hover:scale-105")
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>

                  {!collapsed && (
                    <span
                      className={cn(
                        "relative z-10 min-w-0 flex-1",
                        isBento ? "line-clamp-2" : "truncate"
                      )}
                    >
                      {language === "bn" ? item.labelBn : item.label}
                    </span>
                  )}

                  {!collapsed && !isBento && item.badge && (
                    <span className="system-code relative z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--aurora-accent)] px-1.5 text-[10px] font-bold text-[var(--aurora-accent-contrast)]">
                      {item.badge}
                    </span>
                  )}
                </Link>

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div className="pointer-events-none invisible absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl border border-[var(--aurora-glass-border-strong)] bg-[var(--aurora-surface)] px-2.5 py-1.5 text-xs font-bold text-[var(--aurora-text-strong)] opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
                    {language === "bn" ? item.labelBn : item.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <CustomizeSidebarDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        iconMap={ICON_MAP}
      />

      {/* Bottom Profile & Notification Indicator */}
      <div className="border-t border-[var(--aurora-glass-border)] p-3">
        <div
          className={cn(
            "aurora-glass-subtle flex items-center gap-2.5 rounded-[18px] p-2.5",
            collapsed && "justify-center p-2"
          )}
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--aurora-surface-2)] text-xs font-bold text-[var(--aurora-text-strong)]">
            {initials}
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--aurora-surface)] bg-[var(--aurora-success)]" />
          </div>
          {!collapsed && (
            <>
              <Link
                href={user ? "/profile" : "/auth/login"}
                onClick={onNavigate}
                className="min-w-0 flex-1"
              >
                <div className="truncate text-xs font-semibold text-[var(--aurora-text-strong)] hover:underline">
                  {displayName}
                </div>
                <div className="truncate text-[10px] text-[var(--aurora-text-muted)]">
                  {roleLabel}
                </div>
              </Link>
              <Link
                href="/settings"
                onClick={onNavigate}
                aria-label="Alerts and settings"
                className="relative rounded-full p-1.5 text-[var(--aurora-text-muted)] transition-colors hover:bg-[var(--aurora-glass-bg)] hover:text-[var(--aurora-text-strong)]"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--aurora-warning)]" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function GlassSidebar() {
  const { sidebarCollapsed, mobileDrawerOpen, setMobileDrawerOpen } =
    useWorkspace();

  return (
    <>
      {/* Desktop / Laptop Sticky Floating Glass Sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 transition-all duration-300 ease-out lg:block",
          sidebarCollapsed ? "w-[88px]" : "w-[272px]"
        )}
      >
        <div className="aurora-glass sticky top-4 h-[calc(100vh-2rem)] rounded-[26px]">
          <SidebarContent collapsed={sidebarCollapsed} />
        </div>
      </aside>

      {/* Mobile & Tablet Slide-over Glass Drawer */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/55 backdrop-blur-sm"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: -300, opacity: 0.7 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0.7 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="aurora-glass-elevated fixed bottom-3 left-3 top-3 z-10 w-[280px] rounded-[26px]"
            >
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileDrawerOpen(false)}
                className="absolute right-3 top-3 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--aurora-glass-border)] bg-[var(--aurora-glass-bg)] text-[var(--aurora-text-strong)]"
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarContent
                collapsed={false}
                onNavigate={() => setMobileDrawerOpen(false)}
              />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

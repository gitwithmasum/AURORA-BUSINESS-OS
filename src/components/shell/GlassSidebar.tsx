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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  LineChart,
  Megaphone,
  PlaneLanding,
  Receipt,
  Settings,
  Ship,
  ShoppingBag,
  Sparkles,
  Tags,
  Users,
  X,
} from "lucide-react";
import { NAVIGATION_GROUPS } from "@/config/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { cn } from "@/lib/utils/cn";
import { GlassBadge } from "@/components/ui";

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
    workspaces,
    activeWorkspace,
    setActiveWorkspaceId,
    toggleSidebar,
  } = useWorkspace();

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

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    command: true,
    catalog: true,
    commerce: true,
    supply: true,
    finance: true,
    intelligence: true,
  });

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-full flex-col">
      {/* Brand Header */}
      <div className="flex items-center justify-between gap-2 px-3.5 pt-4 pb-3">
        <Link
          href="/"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 overflow-hidden",
            collapsed && "justify-center"
          )}
        >
          <div className="aurora-active-glow flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--aurora-accent)] text-[var(--aurora-accent-contrast)] font-bold tracking-tight">
            A
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-bold tracking-wide text-[var(--aurora-text-strong)]">
                AURORA OS
              </div>
              <div className="truncate text-[10px] font-medium uppercase tracking-widest text-[var(--aurora-text-muted)]">
                Universal ERP
              </div>
            </div>
          )}
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

      {/* Workspace Switcher */}
      <div className="px-3 pb-3">
        {collapsed ? (
          <div
            title={`${activeWorkspace.name} (${activeWorkspace.category})`}
            className="aurora-glass-subtle mx-auto flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-bold text-[var(--aurora-text-strong)]"
          >
            {activeWorkspace.currency}
          </div>
        ) : (
          <div className="aurora-glass-subtle rounded-[18px] p-2.5">
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--aurora-text-muted)]">
                Workspace
              </span>
              <GlassBadge tone="warning">DEMO</GlassBadge>
            </div>
            <select
              aria-label="Select workspace"
              value={activeWorkspace.id}
              onChange={(e) => setActiveWorkspaceId(e.target.value)}
              className="w-full cursor-pointer rounded-xl bg-transparent px-1 py-1 text-xs font-semibold text-[var(--aurora-text-strong)] focus:outline-none"
            >
              {workspaces.map((ws) => (
                <option
                  key={ws.id}
                  value={ws.id}
                  className="bg-[var(--aurora-surface)] text-[var(--aurora-text-strong)]"
                >
                  {ws.name}
                </option>
              ))}
            </select>
            <div className="px-1 text-[10px] text-[var(--aurora-text-muted)]">
              {activeWorkspace.category} · {activeWorkspace.currency}
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Navigation Groups */}
      <nav
        aria-label="Primary sidebar navigation"
        className="flex-1 space-y-3 overflow-y-auto px-2.5 py-1"
      >
        {NAVIGATION_GROUPS.map((group) => {
          const isOpen = openGroups[group.id] ?? true;
          return (
            <div key={group.id} className="space-y-1">
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full cursor-pointer items-center justify-between px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--aurora-text-muted)] transition-colors hover:text-[var(--aurora-text-strong)]"
                >
                  <span>{language === "bn" ? group.labelBn : group.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      !isOpen && "-rotate-90"
                    )}
                  />
                </button>
              )}

              {(collapsed || isOpen) && (
                <div className="space-y-1">
                  {group.items.map((item) => {
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
                            "relative flex items-center gap-3 rounded-[16px] px-3 py-2.5 text-xs font-medium transition-all duration-150",
                            collapsed && "justify-center px-0",
                            isActive
                              ? "text-[var(--aurora-text-strong)]"
                              : "text-[var(--aurora-text-muted)] hover:bg-[var(--aurora-glass-bg-subtle)] hover:text-[var(--aurora-text-strong)] hover:shadow-[0_0_18px_-6px_var(--aurora-glow)]"
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
                              className="aurora-active-glow absolute inset-0 rounded-[16px] bg-[var(--aurora-glass-bg-elevated)]"
                            />
                          )}

                          <span className="relative z-10 flex shrink-0 items-center justify-center">
                            <Icon
                              className={cn(
                                "h-4 w-4 transition-transform duration-150 group-hover:scale-105",
                                isActive && "text-[var(--aurora-accent)]"
                              )}
                            />
                          </span>

                          {!collapsed && (
                            <span className="relative z-10 flex-1 truncate">
                              {language === "bn" ? item.labelBn : item.label}
                            </span>
                          )}

                          {!collapsed && item.badge && (
                            <span className="relative z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--aurora-accent)] px-1.5 text-[10px] font-bold text-[var(--aurora-accent-contrast)]">
                              {item.badge}
                            </span>
                          )}
                        </Link>

                        {/* Tooltip when collapsed */}
                        {collapsed && (
                          <div className="pointer-events-none invisible absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl border border-[var(--aurora-glass-border-strong)] bg-[var(--aurora-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--aurora-text-strong)] opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
                            {language === "bn" ? item.labelBn : item.label}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

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

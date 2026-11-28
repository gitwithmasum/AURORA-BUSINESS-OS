"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
  ChevronDown,
  ChevronLeft,
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

interface ModuleLiveBloom {
  tag: string;
  metric: string;
  metricBn: string;
}

const MODULE_LIVE_BLOOM: Record<string, ModuleLiveBloom> = {
  overview: {
    tag: "01 // CORE",
    metric: "৳1,42,500 Today · Healthy",
    metricBn: "৳১,৪২,৫০০ আজকের বিক্রয়",
  },
  analytics: {
    tag: "01 // METRICS",
    metric: "+18.4% MoM · Real-time AI",
    metricBn: "+১৮.৪% মাসিক বৃদ্ধি",
  },
  inventory: {
    tag: "02 // STOCK",
    metric: "48 Fragrances · 94% In-Stock",
    metricBn: "৪৮ সুগন্ধি · ৯৪% মজুদ",
  },
  products: {
    tag: "02 // CATALOG",
    metric: "Luxury EDP, Oud & Attar",
    metricBn: "লাক্সারি EDP, উদ ও আতর",
  },
  "categories-brands": {
    tag: "02 // BRANDS",
    metric: "12 Niche Houses Active",
    metricBn: "১২টি নিশ পারফিউম ব্র্যান্ড",
  },
  sales: {
    tag: "03 // COMMERCE",
    metric: "24 Sales Today · Verified",
    metricBn: "২৪টি বিক্রয় সম্পন্ন",
  },
  orders: {
    tag: "03 // ORDERS",
    metric: "8 In Transit · 3 Pending",
    metricBn: "৮টি ডেলিভারিতে · ৩টি প্রস্তুত",
  },
  customers: {
    tag: "03 // CRM",
    metric: "1,420 Verified Profiles",
    metricBn: "১,৪২০ জন রেজিস্টার্ড ভিআইপি",
  },
  suppliers: {
    tag: "04 // SUPPLY",
    metric: "Riyadh & Jeddah Tier-1",
    metricBn: "রিয়াদ ও জেদ্দা পার্টনার",
  },
  purchases: {
    tag: "04 // PO",
    metric: "PO #108 Approved",
    metricBn: "PO #১০৮ অনুমোদিত",
  },
  "import-management": {
    tag: "04 // KSA→BD",
    metric: "SAR ⇄ BDT Duty Engine",
    metricBn: "রিয়াল ⇄ টাকা ডিউটি ক্যালকুলেশন",
  },
  "shipping-logistics": {
    tag: "04 // FREIGHT",
    metric: "Air Cargo Hub Dhaka",
    metricBn: "এয়ার কার্গো ট্র্যাকিং সক্রিয়",
  },
  finance: {
    tag: "05 // TREASURY",
    metric: "Cash / Bank / MFS Synced",
    metricBn: "ক্যাশ ও ব্যাংক লেজার প্রস্তুত",
  },
  expenses: {
    tag: "05 // LEDGER",
    metric: "Daily Operating & Freight",
    metricBn: "দৈনিক অপারেশন ও ফ্রেইট হিসাব",
  },
  "marketing-ads": {
    tag: "05 // ADS",
    metric: "4.8x ROAS Campaign",
    metricBn: "৪.৮ গুণ বিজ্ঞাপন রিটার্ন",
  },
  reports: {
    tag: "05 // AUDIT",
    metric: "12 Statements Audit-Ready",
    metricBn: "১২টি ব্যবসায়িক স্টেটমেন্ট রেডি",
  },
  "ai-assistant": {
    tag: "06 // INTELLIGENCE",
    metric: "Grounded Fragrance LLM",
    metricBn: "বিজনেস অ্যানালিটিক্স সহকারী",
  },
  settings: {
    tag: "06 // SYSTEM",
    metric: "RBAC Security & RLS Live",
    metricBn: "মাল্টি-টেন্যান্ট সিকিউরিটি অন",
  },
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
    visibleNavGroups,
    setSidebarLayoutMode,
  } = useWorkspace();
  const [mounted, setMounted] = React.useState(false);
  const [activeHoverBloom, setActiveHoverBloom] = React.useState<{
    id: string;
    label: string;
    labelBn: string;
    href: string;
    top: number;
    left: number;
    telemetry: ModuleLiveBloom;
  } | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);
  const [customizeOpen, setCustomizeOpen] = React.useState(false);
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    command: true,
    catalog: true,
    commerce: true,
    supply: true,
    finance: true,
    intelligence: true,
  });

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

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

  const handleBrandClick = () => {
    if (onNavigate) {
      onNavigate();
    } else {
      toggleSidebar();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Brand Header */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-3.5",
          collapsed ? "pb-2 pt-3" : "pb-3.5 pt-4"
        )}
      >
        <button
          type="button"
          onClick={handleBrandClick}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "group flex cursor-pointer items-center gap-2.5 overflow-hidden text-left transition-all focus:outline-none",
            collapsed ? "w-full justify-center" : "min-w-0 flex-1"
          )}
        >
          <AuroraLogoMark />
          {!collapsed && <AuroraBrandTitle compact />}
        </button>

        {!collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="hidden h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--aurora-glass-border)] bg-[var(--aurora-glass-bg-subtle)] text-[var(--aurora-text-muted)] transition-all hover:border-amber-300/40 hover:text-[var(--aurora-accent)] hover:shadow-[0_0_10px_rgba(245,186,75,0.2)] lg:flex"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Futuristic Segmented Toggle Pill + Customize Trigger (Sidebar Only) */}
      {!collapsed && (
        <div className="px-3 pt-2 pb-3">
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

      {/* Scrollable Navigation (Template 03 Pods / Template 04 Bento Grid + Numbered Groups) */}
      <nav
        aria-label="Primary sidebar navigation"
        className={cn(
          "flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-2.5 py-1",
          collapsed
            ? "space-y-0.5 px-1.5 pb-2 no-scrollbar"
            : "aurora-scrollbar-thin pb-4"
        )}
      >
        {visibleNavGroups.map((group) => {
          const isOpen = openGroups[group.id] ?? true;

          return (
            <div key={group.id} className={collapsed ? "space-y-0.5" : "space-y-1.5"}>
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="system-code flex w-full cursor-pointer items-center justify-between border-b border-[var(--aurora-glass-border)] px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aurora-accent)] transition-colors hover:text-[var(--aurora-text-strong)]"
                >
                  <span>
                    {group.indexCode} {"//"} {language === "bn" ? group.labelBn : group.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 text-[var(--aurora-text-muted)] transition-transform duration-200",
                      !isOpen && "-rotate-90"
                    )}
                  />
                </button>
              )}

              {(collapsed || isOpen) && (
                <div
                  className={cn(
                    isBento ? "grid grid-cols-2 gap-1.5" : collapsed ? "space-y-0.5" : "space-y-1.5"
                  )}
                >
                  {group.items.map((item) => {
                    const Icon = ICON_MAP[item.iconName] ?? LayoutDashboard;
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    const telemetry =
                      MODULE_LIVE_BLOOM[item.id] ?? {
                        tag: group.indexCode ? `${group.indexCode} // MODULE` : "01 // MODULE",
                        metric: "Active Subsystem",
                        metricBn: "সক্রিয় সাবসিস্টেম",
                      };

                    return (
                      <div key={item.id} className="group relative">
                        <Link
                          href={item.href}
                          onClick={() => {
                            setActiveHoverBloom(null);
                            onNavigate?.();
                          }}
                          onMouseEnter={(e) => {
                            if (!collapsed) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            setActiveHoverBloom({
                              id: item.id,
                              label: item.label,
                              labelBn: item.labelBn,
                              href: item.href,
                              top: rect.top + rect.height / 2,
                              left: rect.right + 12,
                              telemetry,
                            });
                          }}
                          onMouseLeave={() => {
                            setActiveHoverBloom(null);
                          }}
                          className={cn(
                            "relative flex border transition-all duration-150",
                            weightClass,
                            collapsed
                              ? "h-8.5 w-8.5 mx-auto items-center justify-center rounded-[10px] border-transparent p-0"
                              : isBento
                                ? "h-full flex-col items-start gap-2 rounded-[16px] p-2.5 text-[12.5px] leading-tight"
                                : "items-center gap-2.5 rounded-[16px] px-2.5 py-1.5 text-[13.5px]",
                            isActive
                              ? "border-[color-mix(in_srgb,var(--aurora-accent)_50%,transparent)] bg-[color-mix(in_srgb,var(--aurora-accent)_16%,transparent)] text-[var(--aurora-text-strong)] shadow-[0_0_20px_-6px_var(--aurora-glow)]"
                              : collapsed
                                ? "text-[var(--aurora-text-muted)] hover:border-[var(--aurora-glass-border-strong)] hover:bg-[var(--aurora-glass-bg)] hover:text-[var(--aurora-text-strong)] hover:shadow-[0_0_12px_rgba(245,186,75,0.14)]"
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
                                ? "h-5 w-5"
                                : "h-7 w-7 rounded-[10px] border",
                              !collapsed &&
                                (isActive
                                  ? "border-white/40 bg-[var(--aurora-accent)] text-[var(--aurora-accent-contrast)] shadow-[0_0_14px_var(--aurora-glow)]"
                                  : "border-[var(--aurora-glass-border)] bg-[var(--aurora-glass-bg)] text-[var(--aurora-accent)] group-hover:scale-105")
                            )}
                          >
                            <Icon className={collapsed ? "h-3.5 w-3.5" : "h-3.5 w-3.5"} />
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <CustomizeSidebarDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        iconMap={ICON_MAP}
      />

      {/* Bottom Profile & Notification Indicator */}
      <div className={cn("border-t border-[var(--aurora-glass-border)]", collapsed ? "p-2" : "p-3")}>
        <div
          className={cn(
            "aurora-glass-subtle flex items-center gap-2.5 rounded-[18px] p-2.5",
            collapsed && "justify-center p-1.5"
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

      {/* Holographic Live Bloom Capsule with Real-time Telemetry (Rendered via Portal to eliminate clipping & scrollbars) */}
      {collapsed && activeHoverBloom && mounted && typeof document !== "undefined" && (() => {
        const capsuleHalfHeight = 65;
        const minCenterY = 78 + capsuleHalfHeight; // ~143px (ensures capsule top stays comfortably below TopGlassNavbar)
        const maxCenterY = typeof window !== "undefined" ? window.innerHeight - capsuleHalfHeight - 16 : 800;
        const clampedCenterY = Math.max(minCenterY, Math.min(maxCenterY, activeHoverBloom.top));
        const needleOffsetY = Math.max(-capsuleHalfHeight + 14, Math.min(capsuleHalfHeight - 14, activeHoverBloom.top - clampedCenterY));

        return createPortal(
          <div
            style={{
              top: `${clampedCenterY}px`,
              left: `${activeHoverBloom.left}px`,
              transform: "translateY(-50%)",
            }}
            className="pointer-events-none fixed z-[9999] w-64 rounded-2xl border border-[color-mix(in_srgb,var(--aurora-accent)_45%,transparent)] bg-[#081022]/95 p-3 text-left shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(245,186,75,0.2)] backdrop-blur-2xl transition-all duration-150 animate-in fade-in zoom-in-95"
          >
            {/* Triangular pointer needle pointing dynamically to the hovered icon */}
            <div
              style={{
                top: `calc(50% + ${needleOffsetY}px)`,
              }}
              className="absolute -left-1.5 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-[color-mix(in_srgb,var(--aurora-accent)_45%,transparent)] bg-[#081022]"
            />

            {/* System code + Live Pulse Badge */}
            <div className="relative z-10 flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10">
              <span className="system-code text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--aurora-accent)]">
                {activeHoverBloom.telemetry.tag}
              </span>
              <span className="inline-flex items-center gap-1 text-[8.5px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE TELEMETRY
              </span>
            </div>

            {/* Module Title */}
            <div className="relative z-10 text-[13px] font-bold text-white tracking-wide">
              {language === "bn" ? activeHoverBloom.labelBn : activeHoverBloom.label}
            </div>

            {/* Live Data Metric */}
            <div className="relative z-10 mt-1.5 flex items-center gap-1.5 text-[10.5px] font-mono text-slate-300">
              <span className="text-[var(--aurora-accent)] font-bold">↳</span>
              <span className="truncate">
                {language === "bn" ? activeHoverBloom.telemetry.metricBn : activeHoverBloom.telemetry.metric}
              </span>
            </div>

            {/* Route Hint Footer */}
            <div className="relative z-10 mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[8.5px] font-mono text-slate-500">
              <span>ROUTE: {activeHoverBloom.href}</span>
              <span className="text-[var(--aurora-accent)] font-semibold">CLICK TO OPEN →</span>
            </div>
          </div>,
          document.body
        );
      })()}
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
          "sticky top-4 self-start h-[calc(100dvh-2rem)] z-30 hidden shrink-0 transition-all duration-300 ease-out lg:block",
          sidebarCollapsed ? "w-[88px]" : "w-[272px]"
        )}
      >
        <div className="aurora-glass h-full rounded-[26px]">
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

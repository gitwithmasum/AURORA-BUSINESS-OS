"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarClock,
  Check,
  Globe,
  Menu,
  Palette,
  Plus,
  Search,
} from "lucide-react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { ALL_NAV_ITEMS } from "@/config/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { THEME_LIST } from "@/lib/theme/themes";
import { DEMO_NOTIFICATIONS } from "@/data/demo/executive-dashboard";
import { cn } from "@/lib/utils/cn";
import {
  GlassBadge,
  GlassButton,
  GlassDialog,
  SearchInput,
  useToast,
} from "@/components/ui";

export function TopGlassNavbar() {
  const router = useRouter();
  const { user, profile, activeOrg } = useAuth();
  const { themeId, setThemeId, language, setLanguage } = useTheme();
  const { setMobileDrawerOpen } = useWorkspace();
  const { toast } = useToast();

  const [now, setNow] = React.useState<string>("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchScope, setSearchScope] = React.useState("all");
  const [liveResults, setLiveResults] = React.useState<
    { type: string; id: string; title: string; subtitle: string; href: string }[]
  >([]);
  const [liveNotifs, setLiveNotifs] = React.useState<
    { id: string; title: string; message: string; is_read: boolean; action_url: string | null; created_at: string }[]
  >([]);
  const [themeMenuOpen, setThemeMenuOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = React.useState(false);
  const controlsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!activeOrg) {
      setLiveNotifs([]);
      return;
    }
    fetch(`/api/notifications?organizationId=${activeOrg.organizationId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.notifications) setLiveNotifs(json.notifications);
      })
      .catch(() => {});
  }, [activeOrg]);

  React.useEffect(() => {
    if (!searchOpen || !activeOrg || searchQuery.trim().length < 2) {
      setLiveResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(
        `/api/search?organizationId=${activeOrg.organizationId}&q=${encodeURIComponent(
          searchQuery.trim()
        )}&scope=${searchScope}`
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => setLiveResults(json?.results ?? []))
        .catch(() => setLiveResults([]));
    }, 180);
    return () => clearTimeout(t);
  }, [searchOpen, activeOrg, searchQuery, searchScope]);

  React.useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
        setNotifOpen(false);
        setQuickCreateOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setThemeMenuOpen(false);
        setNotifOpen(false);
        setQuickCreateOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  React.useEffect(() => {
    const updateClock = () => {
      setNow(
        new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date())
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredNav = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ALL_NAV_ITEMS.slice(0, 8);
    return ALL_NAV_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleQuickAction = (label: string, href: string) => {
    setQuickCreateOpen(false);
    router.push(href);
  };

  return (
    <>
      <header className="sticky top-4 z-30 mb-5">
        <div className="aurora-glass flex flex-wrap items-center justify-between gap-2.5 rounded-[24px] px-3 py-2.5 sm:px-4">
          {/* Left: Mobile Menu + Global Search Capsule */}
          <div className="flex flex-1 items-center gap-2.5 min-w-[200px]">
            <GlassButton
              variant="capsule"
              size="icon"
              aria-label="Open navigation menu"
              className="lg:hidden"
              onClick={() => setMobileDrawerOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </GlassButton>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="aurora-capsule flex h-10 w-full max-w-md cursor-pointer items-center justify-between gap-3 px-4 text-left text-xs text-[var(--aurora-text-muted)] transition-all hover:border-[var(--aurora-glass-border-strong)] hover:text-[var(--aurora-text-strong)]"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 shrink-0 text-[var(--aurora-accent)]" />
                <span className="truncate">
                  {language === "bn"
                    ? "পণ্য, কাস্টমার, সাপ্লায়ার বা মডিউল খুঁজুন..."
                    : "Search products, customers, suppliers, modules..."}
                </span>
              </span>
              <kbd className="hidden rounded-md border border-[var(--aurora-glass-border)] px-1.5 py-0.5 text-[10px] font-semibold sm:inline-block">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right: Capsule Controls */}
          <div ref={controlsRef} className="flex flex-wrap items-center gap-2">
            {/* Workspace Selector Capsule (Desktop) */}
            <WorkspaceSwitcher variant="navbar" />

            {/* Live Date & Time Capsule */}
            <div className="aurora-capsule hidden h-9 items-center gap-1.5 px-3 text-xs text-[var(--aurora-text-muted)] md:flex">
              <CalendarClock className="h-3.5 w-3.5 text-[var(--aurora-accent)]" />
              <span className="font-medium text-[var(--aurora-text)]">
                {now || "Loading..."}
              </span>
            </div>

            {/* Quick-Create Capsule */}
            <div className="relative">
              <GlassButton
                variant="primary"
                size="sm"
                className="h-9 rounded-full px-3.5"
                onClick={() => {
                  setQuickCreateOpen((v) => !v);
                  setThemeMenuOpen(false);
                  setNotifOpen(false);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Quick Create</span>
              </GlassButton>

              {quickCreateOpen && (
                <div className="aurora-glass-elevated absolute right-0 mt-2 w-60 rounded-[20px] p-2 z-40">
                  <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--aurora-text-muted)]">
                    Quick Actions (Roadmap Preview)
                  </div>
                  {[
                    { label: "New Daily Sale", href: "/sales" },
                    { label: "Add Perfume / Product", href: "/products" },
                    { label: "Create Purchase Order", href: "/purchases" },
                    { label: "KSA→BD Import Estimate", href: "/import-management" },
                  ].map((act) => (
                    <button
                      key={act.label}
                      type="button"
                      onClick={() => handleQuickAction(act.label, act.href)}
                      className="flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-medium text-[var(--aurora-text-strong)] transition-colors hover:bg-[var(--aurora-glass-bg-subtle)]"
                    >
                      <span>{act.label}</span>
                      <Plus className="h-3.5 w-3.5 text-[var(--aurora-accent)]" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Language Switcher Capsule */}
            <GlassButton
              variant="capsule"
              size="sm"
              className="h-9 px-3"
              aria-label="Toggle language"
              onClick={() => {
                const next = language === "en" ? "bn" : "en";
                setLanguage(next);
                toast({
                  title:
                    next === "bn"
                      ? "Language: বাংলা (Partial Shell Preview)"
                      : "Language: English",
                  tone: "info",
                });
              }}
            >
              <Globe className="h-3.5 w-3.5 text-[var(--aurora-accent)]" />
              <span className="uppercase">{language}</span>
            </GlassButton>

            {/* Theme Switcher Capsule */}
            <div className="relative">
              <GlassButton
                variant="capsule"
                size="icon"
                aria-label="Switch color theme"
                onClick={() => {
                  setThemeMenuOpen((v) => !v);
                  setNotifOpen(false);
                  setQuickCreateOpen(false);
                }}
              >
                <Palette className="h-4 w-4 text-[var(--aurora-accent)]" />
              </GlassButton>

              {themeMenuOpen && (
                <div className="aurora-glass-elevated absolute right-0 mt-2 w-64 rounded-[22px] p-2.5 z-40">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--aurora-text-muted)]">
                    Aurora Theme System
                  </div>
                  <div className="mt-1 space-y-1">
                    {THEME_LIST.map((t) => {
                      const active = t.id === themeId;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setThemeId(t.id);
                            setThemeMenuOpen(false);
                            toast({
                              title: `Theme: ${t.name}`,
                              description: t.subtitle,
                              tone: "success",
                            });
                          }}
                          className={cn(
                            "flex w-full cursor-pointer items-center justify-between rounded-2xl px-2.5 py-2 text-left transition-colors",
                            active
                              ? "bg-[var(--aurora-glass-bg)] border border-[var(--aurora-glass-border-strong)]"
                              : "hover:bg-[var(--aurora-glass-bg-subtle)]"
                          )}
                        >
                          <div>
                            <div className="text-xs font-semibold text-[var(--aurora-text-strong)]">
                              {t.name}
                            </div>
                            <div className="text-[10px] text-[var(--aurora-text-muted)]">
                              {t.subtitle}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {t.swatches.map((hex) => (
                              <span
                                key={hex}
                                className="h-3.5 w-3.5 rounded-full border border-white/25"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                            {active && (
                              <Check className="ml-1 h-3.5 w-3.5 text-[var(--aurora-accent)]" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Notification Center Capsule */}
            <div className="relative">
              <GlassButton
                variant="capsule"
                size="icon"
                aria-label="Open notifications"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setThemeMenuOpen(false);
                  setQuickCreateOpen(false);
                }}
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--aurora-warning)]" />
              </GlassButton>

              {notifOpen && (
                <div className="aurora-glass-elevated absolute right-0 mt-2 w-80 rounded-[22px] p-3 z-40">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--aurora-text-strong)]">
                      Notification Center
                    </span>
                    {activeOrg ? (
                      <button
                        type="button"
                        onClick={() => {
                          fetch("/api/notifications", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              organizationId: activeOrg.organizationId,
                              markAllRead: true,
                            }),
                          });
                          setLiveNotifs((prev) =>
                            prev.map((n) => ({ ...n, is_read: true }))
                          );
                        }}
                        className="cursor-pointer text-[10px] font-medium text-[var(--aurora-accent)] hover:underline"
                      >
                        Mark all read
                      </button>
                    ) : (
                      <GlassBadge tone="warning">Demo Alerts</GlassBadge>
                    )}
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {activeOrg ? (
                      liveNotifs.length === 0 ? (
                        <div className="p-3 text-center text-xs text-[var(--aurora-text-muted)]">
                          No active notifications for {activeOrg.organizationName}.
                        </div>
                      ) : (
                        liveNotifs.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              setNotifOpen(false);
                              if (n.action_url) router.push(n.action_url);
                            }}
                            className="aurora-glass-subtle w-full cursor-pointer rounded-2xl p-2.5 text-left text-xs transition-colors hover:bg-[var(--aurora-glass-bg)]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-[var(--aurora-text-strong)]">
                                {n.title}
                              </span>
                              {!n.is_read && <GlassBadge tone="info">New</GlassBadge>}
                            </div>
                            <p className="mt-1 text-[11px] text-[var(--aurora-text-muted)]">
                              {n.message}
                            </p>
                          </button>
                        ))
                      )
                    ) : (
                      DEMO_NOTIFICATIONS.map((n) => (
                        <div
                          key={n.id}
                          className="aurora-glass-subtle rounded-2xl p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[var(--aurora-text-strong)]">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-[var(--aurora-text-muted)]">
                              {n.time}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--aurora-text-muted)]">
                            {n.detail}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar Capsule */}
            <Link
              href={user ? "/profile" : "/auth/login"}
              className="aurora-capsule flex h-9 items-center gap-2 pl-1.5 pr-3 transition-all hover:border-[var(--aurora-glass-border-strong)]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--aurora-accent)] text-[10px] font-bold text-[var(--aurora-accent-contrast)]">
                {(user ? profile?.fullName || user.email || "U" : "MB")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <span className="hidden text-xs font-medium text-[var(--aurora-text-strong)] sm:inline">
                {user ? "Profile" : "Sign In"}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlassDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Unified Global Search"
        description={
          activeOrg
            ? `Searching modules & live records in ${activeOrg.organizationName}`
            : "Search across modules now; live records index once signed into an organization."
        }
        maxWidth="md"
      >
        <div className="space-y-4">
          <SearchInput
            autoFocus
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search products, customers, suppliers, invoices, POs, or modules..."
          />
          {activeOrg && (
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "all", label: "All" },
                { key: "products", label: "Products" },
                { key: "customers", label: "Customers" },
                { key: "suppliers", label: "Suppliers" },
                { key: "orders", label: "Orders" },
                { key: "invoices", label: "Invoices" },
                { key: "purchase_orders", label: "POs" },
                { key: "transactions", label: "Transactions" },
              ].map((s) => (
                <GlassButton
                  key={s.key}
                  size="sm"
                  variant={searchScope === s.key ? "primary" : "ghost"}
                  className="h-7 rounded-full px-2.5 text-[11px]"
                  onClick={() => setSearchScope(s.key)}
                >
                  {s.label}
                </GlassButton>
              ))}
            </div>
          )}

          {liveResults.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--aurora-text-muted)]">
                Database Records ({liveResults.length})
              </div>
              {liveResults.map((res) => (
                <button
                  key={`${res.type}-${res.id}`}
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    router.push(res.href);
                  }}
                  className="aurora-glass-subtle flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-3.5 py-2 text-left transition-colors hover:bg-[var(--aurora-glass-bg)]"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--aurora-text-strong)]">
                      {res.title}
                    </div>
                    <div className="truncate text-[11px] text-[var(--aurora-text-muted)]">
                      {res.subtitle}
                    </div>
                  </div>
                  <GlassBadge tone="accent">{res.type}</GlassBadge>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            {filteredNav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  router.push(item.href);
                }}
                className="aurora-glass-subtle flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:border-[var(--aurora-glass-border-strong)] hover:bg-[var(--aurora-glass-bg)]"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--aurora-text-strong)]">
                    {item.label}
                  </div>
                  <div className="truncate text-[11px] text-[var(--aurora-text-muted)]">
                    {item.description}
                  </div>
                </div>
                <GlassBadge tone={item.href === "/" ? "success" : "info"}>
                  {item.phase}
                </GlassBadge>
              </button>
            ))}
          </div>
        </div>
      </GlassDialog>
    </>
  );
}

export { TopGlassNavbar as GlassNavbar };

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ALL_NAV_ITEMS, NAVIGATION_GROUPS } from "@/config/navigation";
import {
  createDefaultSidebarPreferences,
  LOCKED_NAV_IDS,
  moveNavItemWithinGroup,
  normalizeSidebarPreferences,
  resolveGroupedNavItems,
  resolveOrderedNavItems,
  type OrderedNavGroup,
  type SidebarFontWeight,
  type SidebarLayoutMode,
  type SidebarPreferences,
} from "@/lib/navigation/preferences";
import type { NavItem } from "@/types/navigation";

export interface WorkspaceOption {
  id: string;
  name: string;
  category: string;
  currency: "BDT" | "SAR" | "USD";
  badge: string;
}

export const DEMO_WORKSPACES: WorkspaceOption[] = [
  {
    id: "ws-perfume-dhaka",
    name: "Aurora Scents BD (Demo)",
    category: "Perfume & Fragrance",
    currency: "BDT",
    badge: "Flagship Retail + KSA Import",
  },
  {
    id: "ws-wholesale-ksa",
    name: "Riyadh Sourcing Hub (Demo)",
    category: "Import & Export",
    currency: "SAR",
    badge: "Procurement",
  },
  {
    id: "ws-universal-retail",
    name: "Aurora Lifestyle Studio (Demo)",
    category: "Fashion & Clothing",
    currency: "BDT",
    badge: "Universal Mode",
  },
];

interface WorkspaceContextValue {
  workspaces: WorkspaceOption[];
  activeWorkspace: WorkspaceOption;
  setActiveWorkspaceId: (id: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  mobileDrawerOpen: boolean;
  setMobileDrawerOpen: (open: boolean) => void;
  sidebarPrefs: SidebarPreferences;
  orderedNavItems: NavItem[];
  visibleNavItems: NavItem[];
  allNavGroups: OrderedNavGroup[];
  visibleNavGroups: OrderedNavGroup[];
  setSidebarLayoutMode: (mode: SidebarLayoutMode) => void;
  setSidebarFontWeight: (weight: SidebarFontWeight) => void;
  moveSidebarNavItem: (id: string, direction: -1 | 1) => void;
  toggleSidebarNavVisibility: (id: string) => void;
  resetSidebarPreferences: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const WORKSPACE_STORAGE_KEY = "aurora_os_workspace";
const SIDEBAR_STORAGE_KEY = "aurora_os_sidebar_collapsed";
const SIDEBAR_PREFS_STORAGE_KEY = "aurora_os_sidebar_prefs_v1";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string>(DEMO_WORKSPACES[0].id);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [sidebarPrefs, setSidebarPrefs] = useState<SidebarPreferences>(() =>
    createDefaultSidebarPreferences(ALL_NAV_ITEMS)
  );

  useEffect(() => {
    try {
      const savedWs = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (savedWs && DEMO_WORKSPACES.some((w) => w.id === savedWs)) {
        setActiveId(savedWs);
      }
      const savedCollapsed = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (savedCollapsed === "true") {
        setSidebarCollapsedState(true);
      }
      const savedPrefs = localStorage.getItem(SIDEBAR_PREFS_STORAGE_KEY);
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs) as Partial<SidebarPreferences>;
        setSidebarPrefs(normalizeSidebarPreferences(parsed, ALL_NAV_ITEMS));
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  const persistSidebarPrefs = (
    updater: (prev: SidebarPreferences) => SidebarPreferences
  ) => {
    setSidebarPrefs((prev) => {
      const next = normalizeSidebarPreferences(updater(prev), ALL_NAV_ITEMS);
      try {
        localStorage.setItem(SIDEBAR_PREFS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  };

  const setActiveWorkspaceId = (id: string) => {
    setActiveId(id);
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
    } catch {
      // Ignore storage write errors
    }
  };

  const setSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {
      // Ignore storage write errors
    }
  };

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  const setSidebarLayoutMode = (layoutMode: SidebarLayoutMode) =>
    persistSidebarPrefs((prev) => ({ ...prev, layoutMode }));

  const setSidebarFontWeight = (fontWeight: SidebarFontWeight) =>
    persistSidebarPrefs((prev) => ({ ...prev, fontWeight }));

  const moveSidebarNavItem = (id: string, direction: -1 | 1) =>
    persistSidebarPrefs((prev) => ({
      ...prev,
      itemOrder: moveNavItemWithinGroup(
        prev.itemOrder,
        NAVIGATION_GROUPS,
        id,
        direction
      ),
    }));

  const toggleSidebarNavVisibility = (id: string) => {
    if (LOCKED_NAV_IDS.has(id)) return;
    persistSidebarPrefs((prev) => {
      const hidden = new Set(prev.hiddenIds);
      if (hidden.has(id)) hidden.delete(id);
      else hidden.add(id);
      return { ...prev, hiddenIds: Array.from(hidden) };
    });
  };

  const resetSidebarPreferences = () =>
    persistSidebarPrefs(() => createDefaultSidebarPreferences(ALL_NAV_ITEMS));

  const { allOrdered: orderedNavItems, visibleOrdered: visibleNavItems } =
    useMemo(
      () => resolveOrderedNavItems(ALL_NAV_ITEMS, sidebarPrefs),
      [sidebarPrefs]
    );

  const { allGrouped: allNavGroups, visibleGrouped: visibleNavGroups } =
    useMemo(
      () => resolveGroupedNavItems(NAVIGATION_GROUPS, sidebarPrefs),
      [sidebarPrefs]
    );

  const activeWorkspace =
    DEMO_WORKSPACES.find((w) => w.id === activeId) ?? DEMO_WORKSPACES[0];

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces: DEMO_WORKSPACES,
        activeWorkspace,
        setActiveWorkspaceId,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        mobileDrawerOpen,
        setMobileDrawerOpen,
        sidebarPrefs,
        orderedNavItems,
        visibleNavItems,
        allNavGroups,
        visibleNavGroups,
        setSidebarLayoutMode,
        setSidebarFontWeight,
        moveSidebarNavItem,
        toggleSidebarNavVisibility,
        resetSidebarPreferences,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}

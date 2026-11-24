"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

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
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const WORKSPACE_STORAGE_KEY = "aurora_os_workspace";
const SIDEBAR_STORAGE_KEY = "aurora_os_sidebar_collapsed";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string>(DEMO_WORKSPACES[0].id);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

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
    } catch {
      // Ignore storage read errors
    }
  }, []);

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

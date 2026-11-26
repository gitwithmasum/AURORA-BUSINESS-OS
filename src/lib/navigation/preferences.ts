import type { NavItem } from "@/types/navigation";

export type SidebarLayoutMode = "pods" | "bento";
export type SidebarFontWeight = "700" | "800";

export interface SidebarPreferences {
  layoutMode: SidebarLayoutMode;
  fontWeight: SidebarFontWeight;
  itemOrder: string[];
  hiddenIds: string[];
}

export const LOCKED_NAV_IDS = new Set(["overview", "settings"]);

export function createDefaultSidebarPreferences(
  allItems: NavItem[]
): SidebarPreferences {
  return {
    layoutMode: "pods",
    fontWeight: "700",
    itemOrder: allItems.map((item) => item.id),
    hiddenIds: [],
  };
}

/** Merge persisted sidebar preferences against current navigation items safely. */
export function normalizeSidebarPreferences(
  raw: Partial<SidebarPreferences> | null | undefined,
  allItems: NavItem[]
): SidebarPreferences {
  const validIds = new Set(allItems.map((i) => i.id));
  const rawOrder = Array.isArray(raw?.itemOrder) ? raw.itemOrder : [];
  const seen = new Set<string>();
  const itemOrder: string[] = [];

  for (const id of rawOrder) {
    if (typeof id === "string" && validIds.has(id) && !seen.has(id)) {
      seen.add(id);
      itemOrder.push(id);
    }
  }
  for (const item of allItems) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      itemOrder.push(item.id);
    }
  }

  const rawHidden = Array.isArray(raw?.hiddenIds) ? raw.hiddenIds : [];
  const hiddenIds = rawHidden.filter(
    (id): id is string =>
      typeof id === "string" && validIds.has(id) && !LOCKED_NAV_IDS.has(id)
  );

  return {
    layoutMode: raw?.layoutMode === "bento" ? "bento" : "pods",
    fontWeight: raw?.fontWeight === "800" ? "800" : "700",
    itemOrder,
    hiddenIds: Array.from(new Set(hiddenIds)),
  };
}

export function moveNavOrder(
  order: string[],
  id: string,
  direction: -1 | 1
): string[] {
  const idx = order.indexOf(id);
  const target = idx + direction;
  if (idx === -1 || target < 0 || target >= order.length) return order;
  const copy = [...order];
  const [moved] = copy.splice(idx, 1);
  copy.splice(target, 0, moved);
  return copy;
}

export function resolveOrderedNavItems(
  allItems: NavItem[],
  prefs: SidebarPreferences
): { allOrdered: NavItem[]; visibleOrdered: NavItem[] } {
  const byId = new Map(allItems.map((i) => [i.id, i]));
  const hiddenSet = new Set(prefs.hiddenIds);

  const allOrdered = prefs.itemOrder
    .map((id) => byId.get(id))
    .filter((item): item is NavItem => Boolean(item));

  const visibleOrdered = allOrdered.filter(
    (item) => LOCKED_NAV_IDS.has(item.id) || !hiddenSet.has(item.id)
  );

  return { allOrdered, visibleOrdered };
}

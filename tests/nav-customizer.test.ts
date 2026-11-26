import { describe, expect, it } from "vitest";
import { ALL_NAV_ITEMS } from "../src/config/navigation";
import {
  createDefaultSidebarPreferences,
  moveNavOrder,
  normalizeSidebarPreferences,
  resolveOrderedNavItems,
} from "../src/lib/navigation/preferences";

describe("Sidebar Navigation Customizer Preferences", () => {
  it("normalizes unknown IDs, preserves pinned modules, and orders items cleanly", () => {
    const prefs = normalizeSidebarPreferences(
      {
        layoutMode: "bento",
        fontWeight: "800",
        itemOrder: ["purchases", "overview", "unknown-id"],
        hiddenIds: ["overview", "settings", "analytics"],
      },
      ALL_NAV_ITEMS
    );

    expect(prefs.layoutMode).toBe("bento");
    expect(prefs.fontWeight).toBe("800");
    // Locked modules cannot stay hidden
    expect(prefs.hiddenIds).toEqual(["analytics"]);
    // Reordered items appear first, followed by remaining items
    expect(prefs.itemOrder[0]).toBe("purchases");
    expect(prefs.itemOrder[1]).toBe("overview");
    expect(prefs.itemOrder.length).toBe(ALL_NAV_ITEMS.length);

    const { visibleOrdered } = resolveOrderedNavItems(ALL_NAV_ITEMS, prefs);
    expect(visibleOrdered.some((i) => i.id === "overview")).toBe(true);
    expect(visibleOrdered.some((i) => i.id === "settings")).toBe(true);
    expect(visibleOrdered.some((i) => i.id === "analytics")).toBe(false);
  });

  it("moves navigation items up and down within bounds", () => {
    const def = createDefaultSidebarPreferences(ALL_NAV_ITEMS);
    const moved = moveNavOrder(def.itemOrder, def.itemOrder[2], -1);
    expect(moved[1]).toBe(def.itemOrder[2]);
    expect(moved[2]).toBe(def.itemOrder[1]);
  });
});

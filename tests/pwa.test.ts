import { describe, expect, it } from "vitest";
import manifest from "../src/app/manifest";
import { config as middlewareConfig } from "../src/middleware";
import { formatCategoryLabel } from "../src/lib/utils/format";

describe("PWA Manifest & Middleware Configuration", () => {
  it("provides a valid standalone manifest with required icon sizes", () => {
    const data = manifest();
    expect(data.name).toBe("Aurora BusinessHub");
    expect(data.short_name).toBe("BusinessHub");
    expect(data.display).toBe("standalone");
    expect(data.start_url).toBe("/");

    const sizes = (data.icons ?? []).map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect((data.icons ?? []).some((icon) => icon.purpose === "maskable")).toBe(
      true
    );
    expect((data.shortcuts ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it("excludes PWA manifest, service worker, and icons from auth middleware matcher", () => {
    const matcher = middlewareConfig.matcher[0];
    expect(matcher).toContain("manifest");
    expect(matcher).toContain("sw");
    expect(matcher).toContain("icons/");
  });

  it("formats known and custom business category slugs cleanly", () => {
    expect(formatCategoryLabel("perfume-fragrance")).toBe("Perfume & Fragrance");
    expect(formatCategoryLabel("luxury_home_decor")).toBe("Luxury Home Decor");
    expect(formatCategoryLabel("")).toBe("General Business");
  });
});

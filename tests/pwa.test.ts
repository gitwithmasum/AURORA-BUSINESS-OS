import { describe, expect, it } from "vitest";
import manifest from "../src/app/manifest";
import { config as middlewareConfig } from "../src/middleware";

describe("PWA Manifest & Middleware Configuration", () => {
  it("provides a valid standalone manifest with required icon sizes", () => {
    const data = manifest();
    expect(data.name).toBe("AURORA BUSINESS OS");
    expect(data.short_name).toBe("AURORA");
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
});

import { describe, expect, it } from "vitest";
import { canAccessRoute, hasPermission } from "@/lib/auth/rbac";
import {
  businessSettingsUpdateSchema,
  customAttributeCreateSchema,
  onboardingOrgSchema,
  registerSchema,
} from "@/lib/validators/part2";
import { buildOrgStoragePath, validateStorageUpload } from "@/lib/storage/buckets";
import { BUSINESS_CATEGORY_SCHEMAS } from "@/config/business-categories";
import { getSupabaseServiceRoleKey } from "@/lib/env";

describe("RBAC Roles & Permission Boundaries", () => {
  it("grants owner unrestricted permissions", () => {
    expect(hasPermission("owner", "members.manage")).toBe(true);
    expect(hasPermission("owner", "settings.manage")).toBe(true);
    expect(hasPermission("owner", "finance.write")).toBe(true);
  });

  it("restricts viewer to read-only routes and blocks write permissions", () => {
    expect(hasPermission("viewer", "dashboard.read")).toBe(true);
    expect(hasPermission("viewer", "products.read")).toBe(true);
    expect(hasPermission("viewer", "products.write")).toBe(false);
    expect(hasPermission("viewer", "settings.manage")).toBe(false);
    expect(canAccessRoute("viewer", "/settings")).toBe(false);
    expect(canAccessRoute("viewer", "/")).toBe(true);
  });

  it("scopes accountant to finance & audit without product or member mutation", () => {
    expect(hasPermission("accountant", "finance.write")).toBe(true);
    expect(hasPermission("accountant", "audit.read")).toBe(true);
    expect(hasPermission("accountant", "products.write")).toBe(false);
    expect(hasPermission("accountant", "members.manage")).toBe(false);
  });

  it("scopes salesperson to sales and customers only", () => {
    expect(hasPermission("salesperson", "sales.write")).toBe(true);
    expect(hasPermission("salesperson", "customers.write")).toBe(true);
    expect(hasPermission("salesperson", "inventory.write")).toBe(false);
    expect(canAccessRoute("salesperson", "/finance")).toBe(false);
  });
});

describe("Input Validation Schemas", () => {
  it("rejects weak registration passwords and mismatched confirmation", () => {
    const res = registerSchema.safeParse({
      fullName: "Test User",
      email: "user@example.com",
      password: "weak",
      confirmPassword: "other",
    });
    expect(res.success).toBe(false);
  });

  it("accepts valid onboarding organization payload", () => {
    const res = onboardingOrgSchema.safeParse({
      businessName: "Aurora Scents BD",
      categorySlug: "perfume-fragrance",
      country: "Bangladesh",
      currency: "BDT",
      timezone: "Asia/Dhaka",
    });
    expect(res.success).toBe(true);
  });

  it("rejects malformed custom product attribute keys", () => {
    const res = customAttributeCreateSchema.safeParse({
      organizationId: "11111111-1111-4111-8111-111111111111",
      categoryId: "22222222-2222-4222-8222-222222222222",
      key: "Invalid Key!",
      label: "Invalid Key",
      dataType: "text",
    });
    expect(res.success).toBe(false);
  });

  it("validates business settings update payload", () => {
    const res = businessSettingsUpdateSchema.safeParse({
      organizationId: "11111111-1111-4111-8111-111111111111",
      businessName: "Aurora Scents",
      businessType: "Retail & Import",
      primaryCategorySlug: "perfume-fragrance",
      country: "Bangladesh",
      currency: "BDT",
      timezone: "Asia/Dhaka",
      inventoryModel: "weighted_average",
      financialYearStartMonth: 7,
      allowNegativeStock: false,
      vatRegistered: true,
      defaultSalesTaxPct: 15,
    });
    expect(res.success).toBe(true);
  });
});

describe("Storage Constraints & Org Path Isolation", () => {
  it("validates allowed MIME types and file size bounds", () => {
    expect(
      validateStorageUpload("product-images", {
        name: "bottle.webp",
        size: 250_000,
        type: "image/webp",
      }).valid
    ).toBe(true);

    expect(
      validateStorageUpload("product-images", {
        name: "script.exe",
        size: 1024,
        type: "application/x-msdownload",
      }).valid
    ).toBe(false);

    expect(
      validateStorageUpload("invoices", {
        name: "huge.pdf",
        size: 25 * 1024 * 1024,
        type: "application/pdf",
      }).valid
    ).toBe(false);
  });

  it("prefixes storage paths with organization UUID for RLS isolation", () => {
    const orgId = "11111111-1111-4111-8111-111111111111";
    const p = buildOrgStoragePath(orgId, "Khamrah Logo!.png");
    expect(p.startsWith(`${orgId}/`)).toBe(true);
    expect(p).toContain("khamrah-logo-.png");
  });
});

describe("Dynamic Business Categories & Env Guard", () => {
  it("includes all 10 initial business categories and perfume attributes", () => {
    expect(BUSINESS_CATEGORY_SCHEMAS.length).toBe(10);
    const perfume = BUSINESS_CATEGORY_SCHEMAS.find(
      (c) => c.slug === "perfume-fragrance"
    );
    expect(perfume).toBeDefined();
    expect(perfume?.attributes.map((a) => a.key)).toEqual(
      expect.arrayContaining([
        "perfume_name",
        "volume_ml",
        "concentration",
        "fragrance_family",
        "top_notes",
        "middle_notes",
        "base_notes",
        "gender_audience",
        "country_of_origin",
        "batch_number",
        "authenticity_status",
      ])
    );
  });

  it("refuses unconfigured service role key", () => {
    expect(() => getSupabaseServiceRoleKey()).toThrow();
  });
});

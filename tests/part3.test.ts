import { describe, expect, it } from "vitest";
import {
  calculatePurchaseOrderTotal,
  calculateSaleTotals,
  DEMO_SUPPLIER_SEEDS,
  evaluateStockGuard,
  generateDocumentNumber,
} from "@/lib/operations/calculations";
import {
  completeSaleSchema,
  createInvoiceSchema,
  productSchema,
  receivePoSchema,
  supplierSchema,
} from "@/lib/validators/part3";

describe("Part 03 Financial & Inventory Math", () => {
  it("computes multi-line sale subtotal, discounts, tax, and grand total accurately", () => {
    const res = calculateSaleTotals([
      { quantity: 2, unitPrice: 3200, discount: 200, tax: 150 },
      { quantity: 1, unitPrice: 4500, discount: 0, tax: 225 },
    ]);
    expect(res.subtotal).toBe(10900);
    expect(res.discountTotal).toBe(200);
    expect(res.taxTotal).toBe(375);
    expect(res.grandTotal).toBe(11075);
  });

  it("blocks unauthorized negative stock and permits only explicitly authorized overrides", () => {
    const blocked = evaluateStockGuard({
      availableQty: 3,
      requestedDelta: -5,
      allowNegativeSetting: false,
      overrideRequested: true,
      isAuthorizedRole: true,
    });
    expect(blocked.allowed).toBe(false);

    const blockedRole = evaluateStockGuard({
      availableQty: 3,
      requestedDelta: -5,
      allowNegativeSetting: true,
      overrideRequested: true,
      isAuthorizedRole: false,
    });
    expect(blockedRole.allowed).toBe(false);

    const allowed = evaluateStockGuard({
      availableQty: 3,
      requestedDelta: -5,
      allowNegativeSetting: true,
      overrideRequested: true,
      isAuthorizedRole: true,
    });
    expect(allowed.allowed).toBe(true);
    expect(allowed.resultingQty).toBe(-2);
  });

  it("computes Purchase Order totals with shipping and additional costs", () => {
    const total = calculatePurchaseOrderTotal({
      items: [
        { quantity: 24, unitPrice: 55 },
        { quantity: 12, unitPrice: 80 },
      ],
      shippingCost: 340,
      additionalCosts: 120,
    });
    expect(total).toBe(2740);
  });

  it("generates prefixed document numbers for INV, PRO, PO, CN", () => {
    expect(generateDocumentNumber("INV", 12)).toMatch(/^INV-\d{8}-0012$/);
    expect(generateDocumentNumber("PO", 5)).toMatch(/^PO-\d{8}-0005$/);
    expect(generateDocumentNumber("PRO", 9)).toMatch(/^PRO-\d{8}-0009$/);
    expect(generateDocumentNumber("CN", 1)).toMatch(/^CN-\d{8}-0001$/);
  });

  it("labels all demo suppliers explicitly as sample/demo", () => {
    expect(DEMO_SUPPLIER_SEEDS.length).toBeGreaterThanOrEqual(3);
    for (const s of DEMO_SUPPLIER_SEEDS) {
      expect(s.supplierCode.startsWith("DEMO-")).toBe(true);
      expect(s.name.toLowerCase()).toContain("demo");
    }
  });
});

describe("Part 03 Zod Validation Contracts", () => {
  it("validates product creation with perfume attributes", () => {
    const res = productSchema.safeParse({
      organizationId: "11111111-1111-4111-8111-111111111111",
      sku: "ARB-LAT-100",
      name: "Lattafa Khamrah 100ml",
      categoryId: "22222222-2222-4222-8222-222222222222",
      purchaseCost: 2100,
      sellingPrice: 3200,
      minStock: 10,
      attributes: {
        perfume_name: "Khamrah",
        volume_ml: 100,
        concentration: "EDP",
      },
    });
    expect(res.success).toBe(true);
  });

  it("requires at least one line item on completeSaleSchema and receivePoSchema", () => {
    expect(
      completeSaleSchema.safeParse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        items: [],
      }).success
    ).toBe(false);

    expect(
      receivePoSchema.safeParse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        poId: "22222222-2222-4222-8222-222222222222",
        warehouseId: "33333333-3333-4333-8333-333333333333",
        items: [],
      }).success
    ).toBe(false);
  });

  it("validates supplier and invoice schemas", () => {
    expect(
      supplierSchema.safeParse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        supplierCode: "SUP-01",
        name: "Riyadh Trading",
        moq: 12,
        currency: "SAR",
      }).success
    ).toBe(true);

    expect(
      createInvoiceSchema.safeParse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        invoiceType: "proforma",
        counterpartyName: "Tanvir Rahman",
        issueDate: "2026-11-25",
        items: [{ description: "Khamrah 100ml", quantity: 2, unitPrice: 3200 }],
      }).success
    ).toBe(true);
  });
});

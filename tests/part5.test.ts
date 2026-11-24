import { describe, expect, it } from "vitest";
import {
  buildGroundedAiBrief,
  computeBusinessAnalytics,
  computeMonthlyBusinessSummary,
  computePerfumeIntelligence,
  computeStockAlerts,
  DEFAULT_STOCK_ALERT_CONFIG,
  type AnalyticsDataset,
} from "@/lib/analytics/engine";
import { getAiProviderStatus } from "@/lib/env";

const SAMPLE_DATASET: AnalyticsDataset = {
  products: [
    {
      id: "p1",
      sku: "ARB-LAT-100",
      name: "Khamrah EDP",
      category_id: "cat-perf",
      brand_id: "b1",
      default_supplier_id: "sup1",
      purchase_cost: 2000,
      selling_price: 3200,
      min_stock: 10,
    },
    {
      id: "p2",
      sku: "DES-DIO-100",
      name: "Sauvage Elixir",
      category_id: "cat-perf",
      brand_id: "b2",
      default_supplier_id: "sup1",
      purchase_cost: 12000,
      selling_price: 17500,
      min_stock: 4,
    },
    {
      id: "p3",
      sku: "OUD-AJM-050",
      name: "Ajmal Attar",
      category_id: "cat-perf",
      brand_id: "b1",
      default_supplier_id: "sup1",
      purchase_cost: 1500,
      selling_price: 2500,
      min_stock: 5,
    },
  ],
  brands: [
    { id: "b1", name: "Lattafa" },
    { id: "b2", name: "Dior" },
  ],
  categories: [{ id: "cat-perf", slug: "perfume-fragrance", name: "Perfume & Fragrance" }],
  attributes: [
    { id: "a1", key: "volume_ml" },
    { id: "a2", key: "fragrance_family" },
    { id: "a3", key: "concentration" },
  ],
  attrValues: [
    { product_id: "p1", attribute_id: "a1", value_text: null, value_number: 100 },
    { product_id: "p1", attribute_id: "a2", value_text: "Amber / Oriental", value_number: null },
    { product_id: "p1", attribute_id: "a3", value_text: "EDP", value_number: null },
    { product_id: "p2", attribute_id: "a1", value_text: null, value_number: 100 },
    { product_id: "p2", attribute_id: "a2", value_text: "Woody", value_number: null },
    { product_id: "p2", attribute_id: "a3", value_text: "Extrait", value_number: null },
  ],
  inventory: [
    { product_id: "p1", batch_number: "B1", expiry_date: "2026-12-10", quantity_on_hand: 4, unit_landed_cost: 2000 },
    { product_id: "p2", batch_number: "B2", expiry_date: null, quantity_on_hand: 30, unit_landed_cost: 12000 },
    { product_id: "p3", batch_number: "B3", expiry_date: null, quantity_on_hand: 0, unit_landed_cost: 1500 },
  ],
  sales: [
    { id: "s1", customer_id: "c1", sale_date: "2026-10-15", channel: "Showroom", grand_total: 64000, cogs_total: 40000, order_status: "completed" },
    { id: "s2", customer_id: "c2", sale_date: "2026-11-10", channel: "Facebook Shop", grand_total: 48000, cogs_total: 30000, order_status: "completed" },
    { id: "s3", customer_id: "c1", sale_date: "2026-11-12", channel: "Showroom", grand_total: 35000, cogs_total: 24000, order_status: "completed" },
    { id: "s4", customer_id: "c2", sale_date: "2026-11-14", channel: "Website", grand_total: 99999, cogs_total: 50000, order_status: "cancelled" },
  ],
  saleItems: [
    { sale_id: "s1", product_id: "p1", product_name_snapshot: "Khamrah EDP", sku_snapshot: "ARB-LAT-100", quantity: 20, unit_cost_at_sale: 2000, line_total: 64000 },
    { sale_id: "s2", product_id: "p1", product_name_snapshot: "Khamrah EDP", sku_snapshot: "ARB-LAT-100", quantity: 15, unit_cost_at_sale: 2000, line_total: 48000 },
    { sale_id: "s3", product_id: "p2", product_name_snapshot: "Sauvage Elixir", sku_snapshot: "DES-DIO-100", quantity: 2, unit_cost_at_sale: 12000, line_total: 35000 },
    { sale_id: "s4", product_id: "p3", product_name_snapshot: "Ajmal Attar", sku_snapshot: "OUD-AJM-050", quantity: 40, unit_cost_at_sale: 1250, line_total: 99999 },
  ],
  expenses: [
    { category: "Marketing", expense_date: "2026-10-20", amount_base: 8000, approval_status: "approved" },
    { category: "Rent", expense_date: "2026-11-05", amount_base: 15000, approval_status: "approved" },
  ],
  purchases: [
    { supplier_id: "sup1", received_date: "2026-11-01", total_cost: 90000 },
  ],
  suppliers: [
    { id: "sup1", name: "Al-Noor Fragrance (Demo)", lead_time_days: 10, rating: 4.8, verification_status: "verified" },
  ],
  customers: [
    { id: "c1", full_name: "Tanvir Rahman", total_orders: 2, total_purchase_value: 99000, created_at: "2026-10-10T00:00:00Z" },
    { id: "c2", full_name: "Nusrat Jahan", total_orders: 1, total_purchase_value: 48000, created_at: "2026-11-05T00:00:00Z" },
  ],
  transactions: [
    { direction: "inflow", tx_date: "2026-10-15", amount: 64000 },
    { direction: "inflow", tx_date: "2026-11-10", amount: 83000 },
    { direction: "outflow", tx_date: "2026-11-05", amount: 15000 },
  ],
  marketingMetrics: [
    { metric_date: "2026-11-08", actual_spend: 12000, revenue: 48000, orders: 15, product_costs: 30000, other_variable_costs: 8000 },
  ],
};

describe("Part 05 Analytics, Stock Alerts, Perfume Intelligence & Grounded AI", () => {
  it("excludes cancelled sales from analytics and filters accurately by brand & channel", () => {
    const all = computeBusinessAnalytics(SAMPLE_DATASET, {});
    expect(all.summary.totalRevenue).toBe(147000); // 64000 + 48000 + 35000 (s4 cancelled excluded!)
    expect(all.summary.totalCogs).toBe(94000);
    expect(all.summary.grossProfit).toBe(53000);
    expect(all.summary.netProfit).toBe(30000); // 53000 - (8000 + 15000)
    expect(all.summary.adContribution).toBe(-2000);

    const showroom = computeBusinessAnalytics(SAMPLE_DATASET, { channel: "Showroom" });
    expect(showroom.summary.totalRevenue).toBe(99000);

    const diorOnly = computeBusinessAnalytics(SAMPLE_DATASET, { brandId: "b2" });
    expect(diorOnly.summary.totalRevenue).toBe(35000);
  });

  it("computes Monthly Business Dashboard and MoM deltas accurately", () => {
    const res = computeMonthlyBusinessSummary(SAMPLE_DATASET, "2026-11");
    expect(res.current.revenue).toBe(83000); // 48000 + 35000
    expect(res.previous.revenue).toBe(64000);
    expect(res.momDeltas.revenuePct).toBe(29.69);
    expect(res.current.bestSellingBrand).toBe("Lattafa");
    expect(res.current.bestSellingProduct).toBe("Khamrah EDP");
  });

  it("detects low stock, out of stock, overstock, fast-moving, slow-moving, and expiry alerts", () => {
    const alerts = computeStockAlerts(
      SAMPLE_DATASET.products,
      SAMPLE_DATASET.inventory,
      SAMPLE_DATASET.sales,
      SAMPLE_DATASET.saleItems,
      { ...DEFAULT_STOCK_ALERT_CONFIG, fastMovingMinUnits: 10 },
      "2026-11-25"
    );

    const p1 = alerts.find((a) => a.productId === "p1");
    const p2 = alerts.find((a) => a.productId === "p2");
    const p3 = alerts.find((a) => a.productId === "p3");

    expect(p1?.conditions).toEqual(
      expect.arrayContaining(["low_stock", "fast_moving", "reorder_required", "expiry_warning"])
    );
    expect(p1?.suggestedReorderQty).toBeGreaterThan(0);
    expect(p2?.conditions).toContain("overstock"); // 30 >= 4 * 5
    expect(p3?.conditions).toContain("out_of_stock");
  });

  it("computes Perfume Intelligence strictly from actual completed sales", () => {
    const perf = computePerfumeIntelligence(SAMPLE_DATASET);
    expect(perf.bestSellingPerfumes[0].name).toBe("Khamrah EDP");
    expect(perf.bestSellingPerfumes[0].unitsSold).toBe(35);
    expect(perf.bestSellingBrands[0].name).toBe("Lattafa");
    expect(perf.fragranceFamilies[0].name).toBe("Amber / Oriental");
    expect(perf.slowMovingPerfumes.map((s) => s.sku)).toContain("OUD-AJM-050");
    expect(perf.repeatPurchaseProducts.map((r) => r.sku)).toContain("ARB-LAT-100");
  });

  it("produces 5-part grounded AI briefs with honest unconfigured LLM status and human approval proposals", () => {
    const aiStatus = getAiProviderStatus();
    expect(aiStatus.configured).toBe(false);

    const brief = buildGroundedAiBrief(
      "Which perfumes should I reorder?",
      SAMPLE_DATASET,
      aiStatus
    );

    expect(brief.externalAiConnected).toBe(false);
    expect(brief.recordedFacts.length).toBeGreaterThan(0);
    expect(brief.calculatedMetrics.length).toBeGreaterThan(0);
    expect(brief.forecasts.length).toBeGreaterThan(0);
    expect(brief.recommendations.length).toBeGreaterThan(0);
    expect(brief.missingData.some((m) => m.includes("GEMINI_API_KEY"))).toBe(true);
    expect(brief.suggestedProposals.length).toBeGreaterThan(0);
  });
});

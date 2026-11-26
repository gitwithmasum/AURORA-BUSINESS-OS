import { describe, expect, it } from "vitest";
import {
  buildLiveExecutiveSnapshot,
  resolveDateWindow,
} from "../src/lib/dashboard/live-adapter";

describe("Live Executive Dashboard Adapter", () => {
  it("resolves preset date windows cleanly", () => {
    const ref = new Date("2026-11-27T10:00:00Z");
    expect(resolveDateWindow("today", 7, ref)).toEqual({
      startDate: "2026-11-27",
      endDate: "2026-11-27",
    });
    expect(resolveDateWindow("this_month", 7, ref)).toEqual({
      startDate: "2026-11-01",
      endDate: "2026-11-27",
    });
    expect(resolveDateWindow("previous_month", 7, ref)).toEqual({
      startDate: "2026-10-01",
      endDate: "2026-10-31",
    });
  });

  it("maps live analytics and sales payloads without fabricated metrics", () => {
    const snap = buildLiveExecutiveSnapshot({
      currency: "BDT",
      analyticsData: {
        analytics: {
          summary: {
            totalRevenue: 120000,
            totalCogs: 70000,
            grossProfit: 50000,
            totalExpenses: 15000,
            netProfit: 35000,
            salesGrowthPct: 20,
            stockValuation: 250000,
            inventoryTurnover: 1.4,
            totalOrders: 10,
            totalCustomers: 8,
          },
          trends: [
            {
              month: "2026-11",
              revenue: 120000,
              grossProfit: 50000,
              netProfit: 35000,
              expenses: 15000,
              cashInflow: 110000,
              cashOutflow: 45000,
            },
          ],
          expenseAnalysis: [{ name: "ads", value: 15000 }],
          customerGrowth: [{ month: "2026-11", newCustomers: 8 }],
        },
        stockAlerts: [
          {
            productId: "p-1",
            sku: "LAT-01",
            name: "Khamrah EDP",
            onHand: 2,
            minStock: 10,
            suggestedReorderQty: 18,
            conditions: ["low_stock"],
          },
        ],
        perfume: {
          bestSellingPerfumes: [
            {
              productId: "p-1",
              sku: "LAT-01",
              name: "Khamrah EDP",
              brand: "Lattafa",
              volumeMl: "100ml",
              unitsSold: 25,
              revenue: 120000,
              profit: 50000,
            },
          ],
          bestSellingBrands: [{ name: "Lattafa", revenue: 120000 }],
          fragranceFamilies: [{ name: "Arabian", revenue: 120000 }],
        },
        dimensions: {
          categories: [{ id: "cat-1", slug: "arabian", name: "Arabian" }],
          brands: [{ id: "b-1", name: "Lattafa" }],
        },
      },
      salesData: {
        sales: [
          {
            id: "sale-1",
            invoice_number: "INV-1001",
            customer_id: "cust-1",
            sale_date: "2026-11-26",
            channel: "Showroom",
            payment_method: "Cash",
            order_status: "completed",
            grand_total: 12000,
            paid_amount: 10000,
          },
        ],
        saleItems: [
          {
            sale_id: "sale-1",
            product_id: "p-1",
            product_name_snapshot: "Khamrah EDP",
            sku_snapshot: "LAT-01",
          },
        ],
        customers: [{ id: "cust-1", full_name: "Arif Hasan" }],
      },
    });

    expect(snap.kpis).toHaveLength(12);
    expect(snap.kpis[0].value).toBe("৳120,000");
    expect(snap.recentOrders[0].invoiceNo).toBe("INV-1001");
    expect(snap.recentOrders[0].customer).toBe("Arif Hasan");
    expect(snap.stockAlerts[0].severity).toBe("Low Stock");
    expect(snap.topProducts[0].stockQty).toBe(2);
  });
});

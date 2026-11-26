import type {
  BreakdownPoint,
  CashFlowPoint,
  CustomerGrowthPoint,
  DateRangeKey,
  DemoPerfumeOrder,
  DemoStockAlert,
  DemoTopProduct,
  KpiMetric,
  RevenueTrendPoint,
} from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils/format";

export interface LiveAnalyticsPayload {
  analytics: {
    summary: {
      totalRevenue: number;
      totalCogs: number;
      grossProfit: number;
      totalExpenses: number;
      netProfit: number;
      salesGrowthPct: number;
      stockValuation: number;
      inventoryTurnover: number;
      totalOrders: number;
      totalCustomers: number;
    };
    trends: {
      month: string;
      revenue: number;
      grossProfit: number;
      netProfit: number;
      expenses: number;
      cashInflow: number;
      cashOutflow: number;
    }[];
    expenseAnalysis: { name: string; value: number }[];
    customerGrowth: { month: string; newCustomers: number }[];
  };
  stockAlerts: {
    productId: string;
    sku: string;
    name: string;
    onHand: number;
    minStock: number;
    suggestedReorderQty: number;
    conditions: string[];
  }[];
  perfume: {
    bestSellingPerfumes: {
      productId: string;
      sku: string;
      name: string;
      brand: string;
      volumeMl: string;
      unitsSold: number;
      revenue: number;
      profit: number;
    }[];
    bestSellingBrands: { name: string; revenue: number }[];
    fragranceFamilies: { name: string; revenue: number }[];
  };
  dimensions: {
    categories: { id: string; slug: string; name: string }[];
    brands: { id: string; name: string }[];
  };
}

export interface LiveSalesPayload {
  sales: {
    id: string;
    invoice_number?: string;
    customer_id: string | null;
    sale_date: string;
    channel: string;
    payment_method: string;
    payment_status?: string;
    order_status: string;
    grand_total: number;
    paid_amount?: number;
  }[];
  saleItems: {
    sale_id: string;
    product_id: string;
    product_name_snapshot: string;
    sku_snapshot: string;
  }[];
  customers: {
    id: string;
    full_name: string;
  }[];
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Resolve dashboard period presets into inclusive YYYY-MM-DD date bounds. */
export function resolveDateWindow(
  rangeKey: DateRangeKey,
  customDays: number,
  referenceDate = new Date()
): { startDate: string; endDate: string } {
  const end = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate()
    )
  );
  const start = new Date(end);

  switch (rangeKey) {
    case "today":
      return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
    case "yesterday":
      start.setUTCDate(start.getUTCDate() - 1);
      return { startDate: toIsoDate(start), endDate: toIsoDate(start) };
    case "last_7_days":
      start.setUTCDate(start.getUTCDate() - 6);
      return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
    case "last_30_days":
      start.setUTCDate(start.getUTCDate() - 29);
      return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
    case "this_month":
      start.setUTCDate(1);
      return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
    case "previous_month": {
      const prevStart = new Date(
        Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1)
      );
      const prevEnd = new Date(
        Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0)
      );
      return { startDate: toIsoDate(prevStart), endDate: toIsoDate(prevEnd) };
    }
    case "this_year":
      start.setUTCMonth(0, 1);
      return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
    case "custom":
      start.setUTCDate(start.getUTCDate() - Math.max(0, customDays - 1));
      return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
  }
}

function toBreakdown(rows: { name: string; value: number }[]): BreakdownPoint[] {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return rows.slice(0, 6).map((r) => ({
    name: r.name || "Other",
    value: Math.round(r.value),
    share: total > 0 ? Math.round((r.value / total) * 100) : 0,
  }));
}

function normalizeChannel(
  ch: string
): DemoPerfumeOrder["channel"] {
  const lower = ch.toLowerCase();
  if (lower.includes("facebook")) return "Facebook Shop";
  if (lower.includes("whatsapp")) return "WhatsApp";
  if (lower.includes("showroom") || lower.includes("pos")) return "Showroom";
  return "Website";
}

function normalizePayment(
  pm: string
): DemoPerfumeOrder["paymentMethod"] {
  const lower = pm.toLowerCase();
  if (lower.includes("bkash") || lower.includes("nagad") || lower.includes("mfs")) {
    return "bKash";
  }
  if (lower.includes("card")) return "Card";
  if (lower.includes("bank")) return "Bank Transfer";
  return "Cash";
}

function normalizeStatus(st: string): DemoPerfumeOrder["status"] {
  const lower = st.toLowerCase();
  if (lower === "completed" || lower === "delivered") return "Completed";
  if (lower === "processing") return "Processing";
  return "Pending";
}

/** Adapt live `/api/analytics` + `/api/sales` payloads into the executive dashboard view model. */
export function buildLiveExecutiveSnapshot(params: {
  analyticsData: LiveAnalyticsPayload;
  salesData: LiveSalesPayload | null;
  currency: "BDT" | "SAR" | "USD";
}) {
  const { analyticsData, salesData, currency } = params;
  const { analytics, stockAlerts, perfume } = analyticsData;
  const sum = analytics.summary;

  const sales = salesData?.sales ?? [];
  const saleItems = salesData?.saleItems ?? [];
  const customerMap = new Map(
    (salesData?.customers ?? []).map((c) => [c.id, c.full_name])
  );

  const pendingOrdersCount = sales.filter(
    (s) => s.order_status !== "completed" && s.order_status !== "cancelled"
  ).length;
  const outstandingTotal = sales.reduce((acc, s) => {
    const due = Math.max(0, Number(s.grand_total) - Number(s.paid_amount ?? s.grand_total));
    return acc + due;
  }, 0);

  const lowOrOutAlerts = stockAlerts.filter(
    (a) =>
      a.conditions.includes("low_stock") ||
      a.conditions.includes("out_of_stock") ||
      a.conditions.includes("reorder_required")
  );

  const grossMarginPct =
    sum.totalRevenue > 0 ? ((sum.grossProfit / sum.totalRevenue) * 100).toFixed(1) : "0.0";
  const netMarginPct =
    sum.totalRevenue > 0 ? ((sum.netProfit / sum.totalRevenue) * 100).toFixed(1) : "0.0";
  const aov = sum.totalOrders > 0 ? Math.round(sum.totalRevenue / sum.totalOrders) : 0;

  const kpis: KpiMetric[] = [
    {
      id: "total-revenue",
      label: "Total Revenue",
      value: formatCurrency(sum.totalRevenue, currency),
      delta: `${sum.salesGrowthPct >= 0 ? "+" : ""}${sum.salesGrowthPct.toFixed(1)}%`,
      trend: sum.salesGrowthPct > 0 ? "up" : sum.salesGrowthPct < 0 ? "down" : "neutral",
      hint: "Completed sales revenue (live)",
    },
    {
      id: "total-expenses",
      label: "Total Expenses",
      value: formatCurrency(sum.totalExpenses, currency),
      delta: "Approved",
      trend: "neutral",
      hint: "Approved operating, ads & freight",
    },
    {
      id: "net-profit",
      label: "Net Profit",
      value: formatCurrency(sum.netProfit, currency),
      delta: `${netMarginPct}% margin`,
      trend: sum.netProfit > 0 ? "up" : sum.netProfit < 0 ? "down" : "neutral",
      hint: "Gross profit minus approved expenses",
    },
    {
      id: "gross-profit",
      label: "Gross Profit",
      value: formatCurrency(sum.grossProfit, currency),
      delta: `${grossMarginPct}% margin`,
      trend: sum.grossProfit > 0 ? "up" : "neutral",
      hint: "Revenue minus recorded COGS",
    },
    {
      id: "total-orders",
      label: "Total Orders",
      value: sum.totalOrders.toLocaleString(),
      delta: `AOV ${formatCurrency(aov, currency)}`,
      trend: sum.totalOrders > 0 ? "up" : "neutral",
      hint: "Completed orders in period",
    },
    {
      id: "total-customers",
      label: "Total Customers",
      value: sum.totalCustomers.toLocaleString(),
      delta: "CRM",
      trend: sum.totalCustomers > 0 ? "up" : "neutral",
      hint: "Active organization customers",
    },
    {
      id: "total-products",
      label: "Total Products",
      value: String(stockAlerts.length > 0 ? Math.max(perfume.bestSellingPerfumes.length, stockAlerts.length) : perfume.bestSellingPerfumes.length),
      delta: "Catalog",
      trend: "neutral",
      hint: "Tracked active SKUs",
    },
    {
      id: "inventory-value",
      label: "Total Inventory Value",
      value: formatCurrency(sum.stockValuation, currency),
      delta: `${sum.inventoryTurnover.toFixed(2)}x turn`,
      trend: sum.stockValuation > 0 ? "up" : "neutral",
      hint: "Current stock valuation",
    },
    {
      id: "low-stock",
      label: "Low Stock Products",
      value: String(lowOrOutAlerts.length),
      delta: lowOrOutAlerts.length > 0 ? "Needs review" : "Healthy",
      trend: lowOrOutAlerts.length > 0 ? "down" : "up",
      hint: "At or below reorder threshold",
    },
    {
      id: "pending-orders",
      label: "Pending Orders",
      value: String(pendingOrdersCount),
      delta: "Dispatch queue",
      trend: "neutral",
      hint: "Open non-completed orders",
    },
    {
      id: "outstanding-payments",
      label: "Outstanding Payments",
      value: formatCurrency(outstandingTotal, currency),
      delta: outstandingTotal > 0 ? "Due" : "Settled",
      trend: outstandingTotal > 0 ? "down" : "up",
      hint: "Uncollected sales balance",
    },
    {
      id: "monthly-growth",
      label: "Monthly Growth",
      value: `${sum.salesGrowthPct >= 0 ? "+" : ""}${sum.salesGrowthPct.toFixed(1)}%`,
      delta: "MoM pace",
      trend: sum.salesGrowthPct > 0 ? "up" : sum.salesGrowthPct < 0 ? "down" : "neutral",
      hint: "Latest vs preceding recorded month",
    },
  ];

  const revenueTrend: RevenueTrendPoint[] = analytics.trends.map((t) => ({
    period: t.month,
    revenue: t.revenue,
    grossProfit: t.grossProfit,
    netProfit: t.netProfit,
    expenses: t.expenses,
  }));

  const cashFlow: CashFlowPoint[] = analytics.trends.map((t) => ({
    month: t.month,
    inflow: t.cashInflow,
    outflow: t.cashOutflow,
  }));

  let runningCustomers = 0;
  const customerGrowth: CustomerGrowthPoint[] = analytics.customerGrowth.map((c) => {
    runningCustomers += c.newCustomers;
    return {
      month: c.month,
      totalCustomers: runningCustomers,
      repeatCustomers: c.newCustomers,
    };
  });

  const expenseBreakdown = toBreakdown(analytics.expenseAnalysis);
  const salesByCategory = toBreakdown(
    perfume.fragranceFamilies.map((f) => ({ name: f.name, value: f.revenue }))
  );
  const salesByBrand = toBreakdown(
    perfume.bestSellingBrands.map((b) => ({ name: b.name, value: b.revenue }))
  );

  const channelMap = new Map<string, { sales: number; orders: number }>();
  for (const s of sales) {
    const ch = normalizeChannel(s.channel || "Website");
    const cur = channelMap.get(ch) ?? { sales: 0, orders: 0 };
    cur.sales += Number(s.grand_total);
    cur.orders += 1;
    channelMap.set(ch, cur);
  }
  const salesPerformance = Array.from(channelMap.entries()).map(([channel, v]) => ({
    channel,
    sales: Math.round(v.sales),
    orders: v.orders,
  }));

  const stockMap = new Map(stockAlerts.map((a) => [a.productId, a.onHand]));
  const topProducts: DemoTopProduct[] = perfume.bestSellingPerfumes
    .slice(0, 6)
    .map((p) => {
      const volNum = Number.parseInt(String(p.volumeMl).replace(/\D+/g, ""), 10) || 100;
      return {
        id: p.productId,
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        category: "arabian",
        volumeMl: volNum,
        unitsSold: p.unitsSold,
        revenueBdt: p.revenue,
        grossMarginPct: p.revenue > 0 ? Math.round((p.profit / p.revenue) * 100) : 0,
        stockQty: stockMap.get(p.productId) ?? 0,
      };
    });

  const firstItemBySale = new Map<string, string>();
  for (const it of saleItems) {
    if (!firstItemBySale.has(it.sale_id)) {
      firstItemBySale.set(it.sale_id, it.product_name_snapshot);
    }
  }

  const recentOrders: DemoPerfumeOrder[] = sales.slice(0, 15).map((s) => ({
    id: s.id,
    invoiceNo: s.invoice_number || s.id.slice(0, 8).toUpperCase(),
    customer: (s.customer_id && customerMap.get(s.customer_id)) || "Walk-in Customer",
    product: firstItemBySale.get(s.id) || "Sale Order",
    brand: "Recorded",
    category: "arabian",
    channel: normalizeChannel(s.channel || "Website"),
    paymentMethod: normalizePayment(s.payment_method || "Cash"),
    status: normalizeStatus(s.order_status || "completed"),
    amountBdt: Number(s.grand_total),
    date: s.sale_date,
  }));

  const mappedAlerts: DemoStockAlert[] = lowOrOutAlerts.slice(0, 8).map((a) => ({
    id: a.productId,
    sku: a.sku,
    productName: a.name,
    brand: "Inventory",
    stockQty: a.onHand,
    minStock: a.minStock,
    severity: a.conditions.includes("out_of_stock")
      ? "Out of Stock"
      : a.conditions.includes("low_stock")
        ? "Low Stock"
        : "Reorder Soon",
    suggestedReorder: Math.max(1, a.suggestedReorderQty),
  }));

  return {
    kpis,
    revenueTrend,
    cashFlow,
    customerGrowth,
    expenseBreakdown,
    salesByCategory,
    salesByBrand,
    salesPerformance,
    topProducts,
    recentOrders,
    stockAlerts: mappedAlerts,
  };
}

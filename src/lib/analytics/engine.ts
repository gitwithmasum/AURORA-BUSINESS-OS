// ============================================================================
// AURORA BUSINESS OS — Part 05 Analytics, Stock Alerts, Perfume & AI Engine
// All rankings & metrics are derived strictly from recorded database rows.
// ============================================================================

const round2 = (n: number) => Number(n.toFixed(2));

export interface AnalyticsFilter {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  brandId?: string;
  productId?: string;
  supplierId?: string;
  channel?: string;
}

export interface AnalyticsDataset {
  products: {
    id: string;
    sku: string;
    name: string;
    category_id: string;
    brand_id: string | null;
    default_supplier_id: string | null;
    purchase_cost: number;
    selling_price: number;
    min_stock: number;
  }[];
  brands: { id: string; name: string }[];
  categories: { id: string; slug: string; name: string }[];
  attributes: { id: string; key: string }[];
  attrValues: {
    product_id: string;
    attribute_id: string;
    value_text: string | null;
    value_number: number | null;
  }[];
  inventory: {
    product_id: string;
    batch_number: string;
    expiry_date: string | null;
    quantity_on_hand: number;
    unit_landed_cost: number;
  }[];
  sales: {
    id: string;
    customer_id: string | null;
    sale_date: string;
    channel: string;
    grand_total: number;
    cogs_total: number;
    order_status: string;
  }[];
  saleItems: {
    sale_id: string;
    product_id: string;
    product_name_snapshot: string;
    sku_snapshot: string;
    quantity: number;
    unit_cost_at_sale: number;
    line_total: number;
  }[];
  expenses: {
    category: string;
    expense_date: string;
    amount_base: number;
    approval_status: string;
  }[];
  purchases: {
    supplier_id: string;
    received_date: string;
    total_cost: number;
  }[];
  suppliers: {
    id: string;
    name: string;
    lead_time_days: number;
    rating: number | null;
    verification_status: string;
  }[];
  customers: {
    id: string;
    full_name: string;
    total_orders: number;
    total_purchase_value: number;
    created_at: string;
  }[];
  transactions: {
    direction: "inflow" | "outflow";
    tx_date: string;
    amount: number;
  }[];
  marketingMetrics: {
    metric_date: string;
    actual_spend: number;
    revenue: number;
    orders: number;
    product_costs: number;
    other_variable_costs: number;
  }[];
}

function inDateRange(dateStr: string, start?: string, end?: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

export function computeBusinessAnalytics(
  data: AnalyticsDataset,
  filters: AnalyticsFilter
) {
  const matchingProducts = data.products.filter((p) => {
    if (filters.categoryId && p.category_id !== filters.categoryId) return false;
    if (filters.brandId && p.brand_id !== filters.brandId) return false;
    if (filters.productId && p.id !== filters.productId) return false;
    if (filters.supplierId && p.default_supplier_id !== filters.supplierId)
      return false;
    return true;
  });
  const allowedProductIds = new Set(matchingProducts.map((p) => p.id));
  const hasProductScope = Boolean(
    filters.categoryId || filters.brandId || filters.productId || filters.supplierId
  );

  const completedSales = data.sales.filter(
    (s) =>
      s.order_status === "completed" &&
      inDateRange(s.sale_date, filters.startDate, filters.endDate) &&
      (!filters.channel || s.channel === filters.channel)
  );
  const completedSaleIds = new Set(completedSales.map((s) => s.id));
  const saleDateMap = new Map(completedSales.map((s) => [s.id, s.sale_date]));

  const filteredItems = data.saleItems.filter(
    (it) =>
      completedSaleIds.has(it.sale_id) &&
      (!hasProductScope || allowedProductIds.has(it.product_id))
  );

  const approvedExpenses = data.expenses.filter(
    (e) =>
      e.approval_status === "approved" &&
      inDateRange(e.expense_date, filters.startDate, filters.endDate)
  );

  const filteredPurchases = data.purchases.filter(
    (p) =>
      inDateRange(p.received_date, filters.startDate, filters.endDate) &&
      (!filters.supplierId || p.supplier_id === filters.supplierId)
  );

  const filteredTx = data.transactions.filter((t) =>
    inDateRange(t.tx_date, filters.startDate, filters.endDate)
  );

  const filteredAds = data.marketingMetrics.filter((m) =>
    inDateRange(m.metric_date, filters.startDate, filters.endDate)
  );

  const totalRevenue = round2(
    hasProductScope
      ? filteredItems.reduce((s, i) => s + Number(i.line_total), 0)
      : completedSales.reduce((s, r) => s + Number(r.grand_total), 0)
  );
  const totalCogs = round2(
    hasProductScope
      ? filteredItems.reduce(
          (s, i) => s + Number(i.quantity) * Number(i.unit_cost_at_sale),
          0
        )
      : completedSales.reduce((s, r) => s + Number(r.cogs_total), 0)
  );
  const totalExpenses = round2(
    approvedExpenses.reduce((s, e) => s + Number(e.amount_base), 0)
  );
  const grossProfit = round2(totalRevenue - totalCogs);
  const netProfit = round2(grossProfit - totalExpenses);

  const stockValuation = round2(
    data.inventory
      .filter((inv) => !hasProductScope || allowedProductIds.has(inv.product_id))
      .reduce(
        (s, inv) =>
          s + Number(inv.quantity_on_hand) * Number(inv.unit_landed_cost),
        0
      )
  );

  const inventoryTurnover =
    stockValuation > 0 ? round2(totalCogs / stockValuation) : 0;

  // Monthly Trend Aggregation
  const monthBuckets = new Map<
    string,
    {
      month: string;
      revenue: number;
      cogs: number;
      expenses: number;
      purchases: number;
      cashInflow: number;
      cashOutflow: number;
    }
  >();

  const ensureMonth = (m: string) => {
    if (!monthBuckets.has(m)) {
      monthBuckets.set(m, {
        month: m,
        revenue: 0,
        cogs: 0,
        expenses: 0,
        purchases: 0,
        cashInflow: 0,
        cashOutflow: 0,
      });
    }
    return monthBuckets.get(m)!;
  };

  if (hasProductScope) {
    for (const it of filteredItems) {
      const m = (saleDateMap.get(it.sale_id) ?? "").slice(0, 7);
      if (!m) continue;
      const b = ensureMonth(m);
      b.revenue += Number(it.line_total);
      b.cogs += Number(it.quantity) * Number(it.unit_cost_at_sale);
    }
  } else {
    for (const s of completedSales) {
      const b = ensureMonth(s.sale_date.slice(0, 7));
      b.revenue += Number(s.grand_total);
      b.cogs += Number(s.cogs_total);
    }
  }
  for (const e of approvedExpenses) {
    const b = ensureMonth(e.expense_date.slice(0, 7));
    b.expenses += Number(e.amount_base);
  }
  for (const p of filteredPurchases) {
    const b = ensureMonth(p.received_date.slice(0, 7));
    b.purchases += Number(p.total_cost);
  }
  for (const t of filteredTx) {
    const b = ensureMonth(t.tx_date.slice(0, 7));
    if (t.direction === "inflow") b.cashInflow += Number(t.amount);
    else b.cashOutflow += Number(t.amount);
  }

  const trends = Array.from(monthBuckets.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({
      ...m,
      revenue: round2(m.revenue),
      grossProfit: round2(m.revenue - m.cogs),
      netProfit: round2(m.revenue - m.cogs - m.expenses),
      expenses: round2(m.expenses),
      purchases: round2(m.purchases),
      cashInflow: round2(m.cashInflow),
      cashOutflow: round2(m.cashOutflow),
    }));

  // Sales Growth (last 2 months in trend)
  let salesGrowthPct = 0;
  if (trends.length >= 2) {
    const prev = trends[trends.length - 2].revenue;
    const curr = trends[trends.length - 1].revenue;
    salesGrowthPct = prev > 0 ? round2(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;
  }

  // Expense breakdown
  const expenseMap = new Map<string, number>();
  for (const e of approvedExpenses) {
    expenseMap.set(e.category, (expenseMap.get(e.category) ?? 0) + Number(e.amount_base));
  }
  const expenseAnalysis = Array.from(expenseMap.entries()).map(([name, value]) => ({
    name,
    value: round2(value),
  }));

  // Supplier performance
  const supplierSpend = new Map<string, { orders: number; totalSpend: number }>();
  for (const p of filteredPurchases) {
    const cur = supplierSpend.get(p.supplier_id) ?? { orders: 0, totalSpend: 0 };
    cur.orders += 1;
    cur.totalSpend += Number(p.total_cost);
    supplierSpend.set(p.supplier_id, cur);
  }
  const supplierPerformance = data.suppliers.map((s) => {
    const st = supplierSpend.get(s.id) ?? { orders: 0, totalSpend: 0 };
    return {
      id: s.id,
      name: s.name,
      leadTimeDays: s.lead_time_days,
      rating: s.rating ?? 0,
      verificationStatus: s.verification_status,
      purchaseReceipts: st.orders,
      totalSpend: round2(st.totalSpend),
    };
  });

  // Marketing summary
  const adSpend = round2(filteredAds.reduce((s, m) => s + Number(m.actual_spend), 0));
  const adRevenue = round2(filteredAds.reduce((s, m) => s + Number(m.revenue), 0));
  const adContribution = round2(
    filteredAds.reduce(
      (s, m) =>
        s +
        (Number(m.revenue) -
          Number(m.product_costs) -
          Number(m.other_variable_costs) -
          Number(m.actual_spend)),
      0
    )
  );

  // Customer growth by month
  const custMonthMap = new Map<string, number>();
  for (const c of data.customers) {
    const m = c.created_at.slice(0, 7);
    custMonthMap.set(m, (custMonthMap.get(m) ?? 0) + 1);
  }
  const customerGrowth = Array.from(custMonthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, newCustomers]) => ({ month, newCustomers }));

  return {
    summary: {
      totalRevenue,
      totalCogs,
      grossProfit,
      totalExpenses,
      netProfit,
      salesGrowthPct,
      stockValuation,
      inventoryTurnover,
      totalOrders: completedSales.length,
      totalCustomers: data.customers.length,
      adSpend,
      adRevenue,
      adContribution,
    },
    trends,
    expenseAnalysis,
    supplierPerformance,
    customerGrowth,
  };
}

// ----------------------------------------------------------------------------
// 2. Monthly Business Dashboard (Month-over-Month)
// ----------------------------------------------------------------------------
export function computeMonthlyBusinessSummary(
  data: AnalyticsDataset,
  targetMonth: string // YYYY-MM
) {
  const [yStr, mStr] = targetMonth.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const prevDate = new Date(Date.UTC(y, m - 2, 1));
  const prevMonth = prevDate.toISOString().slice(0, 7);

  const summarizeMonth = (ym: string) => {
    const sales = data.sales.filter(
      (s) => s.order_status === "completed" && s.sale_date.startsWith(ym)
    );
    const saleIds = new Set(sales.map((s) => s.id));
    const items = data.saleItems.filter((i) => saleIds.has(i.sale_id));

    const revenue = round2(sales.reduce((s, r) => s + Number(r.grand_total), 0));
    const cogs = round2(sales.reduce((s, r) => s + Number(r.cogs_total), 0));
    const expenses = round2(
      data.expenses
        .filter((e) => e.approval_status === "approved" && e.expense_date.startsWith(ym))
        .reduce((s, e) => s + Number(e.amount_base), 0)
    );
    const grossProfit = round2(revenue - cogs);
    const netProfit = round2(grossProfit - expenses);
    const inventoryPurchases = round2(
      data.purchases
        .filter((p) => p.received_date.startsWith(ym))
        .reduce((s, p) => s + Number(p.total_cost), 0)
    );
    const marketingSpend = round2(
      data.marketingMetrics
        .filter((k) => k.metric_date.startsWith(ym))
        .reduce((s, k) => s + Number(k.actual_spend), 0)
    );
    const cashInflow = round2(
      data.transactions
        .filter((t) => t.direction === "inflow" && t.tx_date.startsWith(ym))
        .reduce((s, t) => s + Number(t.amount), 0)
    );
    const cashOutflow = round2(
      data.transactions
        .filter((t) => t.direction === "outflow" && t.tx_date.startsWith(ym))
        .reduce((s, t) => s + Number(t.amount), 0)
    );
    const activeCustomerCount = new Set(
      sales.map((s) => s.customer_id).filter(Boolean)
    ).size;

    const prodRev = new Map<string, { name: string; revenue: number }>();
    const brandRev = new Map<string, number>();
    const prodMap = new Map(data.products.map((p) => [p.id, p]));
    const brandMap = new Map(data.brands.map((b) => [b.id, b.name]));

    for (const it of items) {
      const cur = prodRev.get(it.product_id) ?? {
        name: it.product_name_snapshot,
        revenue: 0,
      };
      cur.revenue += Number(it.line_total);
      prodRev.set(it.product_id, cur);

      const prod = prodMap.get(it.product_id);
      const bName = (prod?.brand_id && brandMap.get(prod.brand_id)) || "Unbranded";
      brandRev.set(bName, (brandRev.get(bName) ?? 0) + Number(it.line_total));
    }

    const bestProduct =
      Array.from(prodRev.values()).sort((a, b) => b.revenue - a.revenue)[0]?.name ??
      "No sales recorded";
    const bestBrand =
      Array.from(brandRev.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "No sales recorded";

    return {
      month: ym,
      revenue,
      expenses,
      grossProfit,
      netProfit,
      orders: sales.length,
      customers: activeCustomerCount,
      inventoryPurchases,
      marketingSpend,
      cashInflow,
      cashOutflow,
      bestSellingBrand: bestBrand,
      bestSellingProduct: bestProduct,
    };
  };

  const current = summarizeMonth(targetMonth);
  const previous = summarizeMonth(prevMonth);

  const pctChange = (c: number, p: number) =>
    p > 0 ? round2(((c - p) / p) * 100) : c > 0 ? 100 : 0;

  return {
    current,
    previous,
    momDeltas: {
      revenuePct: pctChange(current.revenue, previous.revenue),
      expensesPct: pctChange(current.expenses, previous.expenses),
      grossProfitPct: pctChange(current.grossProfit, previous.grossProfit),
      netProfitPct: pctChange(current.netProfit, previous.netProfit),
      ordersPct: pctChange(current.orders, previous.orders),
    },
  };
}

// ----------------------------------------------------------------------------
// 3. Stock Alert System
// ----------------------------------------------------------------------------
export interface StockAlertConfig {
  overstockMultiplier: number;
  fastMovingWindowDays: number;
  fastMovingMinUnits: number;
  slowMovingWindowDays: number;
  expiryWarningDays: number;
  defaultLeadTimeDays: number;
  safetyStockDays: number;
}

export const DEFAULT_STOCK_ALERT_CONFIG: StockAlertConfig = {
  overstockMultiplier: 5,
  fastMovingWindowDays: 30,
  fastMovingMinUnits: 20,
  slowMovingWindowDays: 60,
  expiryWarningDays: 45,
  defaultLeadTimeDays: 14,
  safetyStockDays: 7,
};

export interface ComputedStockAlert {
  productId: string;
  sku: string;
  name: string;
  onHand: number;
  minStock: number;
  unitsSoldWindow: number;
  avgDailyDemand: number;
  suggestedReorderQty: number;
  conditions: (
    | "out_of_stock"
    | "low_stock"
    | "overstock"
    | "fast_moving"
    | "slow_moving"
    | "reorder_required"
    | "expiry_warning"
  )[];
  earliestExpiry: string | null;
}

export function computeStockAlerts(
  products: AnalyticsDataset["products"],
  inventory: AnalyticsDataset["inventory"],
  sales: AnalyticsDataset["sales"],
  saleItems: AnalyticsDataset["saleItems"],
  config: StockAlertConfig = DEFAULT_STOCK_ALERT_CONFIG,
  referenceDateIso = new Date().toISOString().slice(0, 10)
): ComputedStockAlert[] {
  const refTime = new Date(referenceDateIso).getTime();
  const fastCutoff = new Date(
    refTime - config.fastMovingWindowDays * 86400000
  )
    .toISOString()
    .slice(0, 10);
  const slowCutoff = new Date(
    refTime - config.slowMovingWindowDays * 86400000
  )
    .toISOString()
    .slice(0, 10);
  const expiryCutoff = new Date(
    refTime + config.expiryWarningDays * 86400000
  )
    .toISOString()
    .slice(0, 10);

  const saleMap = new Map(
    sales
      .filter((s) => s.order_status === "completed")
      .map((s) => [s.id, s.sale_date])
  );

  const alerts: ComputedStockAlert[] = [];

  for (const p of products) {
    const rows = inventory.filter((i) => i.product_id === p.id);
    const onHand = round2(rows.reduce((s, r) => s + Number(r.quantity_on_hand), 0));
    const minStock = Number(p.min_stock);

    let unitsSoldFast = 0;
    let unitsSoldSlow = 0;
    for (const it of saleItems) {
      if (it.product_id !== p.id) continue;
      const d = saleMap.get(it.sale_id);
      if (!d) continue;
      if (d >= fastCutoff && d <= referenceDateIso) {
        unitsSoldFast += Number(it.quantity);
      }
      if (d >= slowCutoff && d <= referenceDateIso) {
        unitsSoldSlow += Number(it.quantity);
      }
    }

    const avgDailyDemand = round2(unitsSoldFast / Math.max(1, config.fastMovingWindowDays));
    const targetStock =
      avgDailyDemand * (config.defaultLeadTimeDays + config.safetyStockDays);
    const suggestedReorderQty = Math.max(
      0,
      Math.ceil(Math.max(targetStock, minStock * 2) - onHand)
    );

    const conditions: ComputedStockAlert["conditions"] = [];
    if (onHand <= 0) conditions.push("out_of_stock");
    else if (onHand <= minStock) conditions.push("low_stock");

    if (minStock > 0 && onHand >= minStock * config.overstockMultiplier) {
      conditions.push("overstock");
    }
    if (unitsSoldFast >= config.fastMovingMinUnits) {
      conditions.push("fast_moving");
    }
    if (onHand > 0 && unitsSoldSlow === 0) {
      conditions.push("slow_moving");
    }
    if (onHand <= Math.max(minStock, targetStock * 0.5) && suggestedReorderQty > 0) {
      conditions.push("reorder_required");
    }

    const expiringDates = rows
      .map((r) => r.expiry_date)
      .filter((d): d is string => Boolean(d && d <= expiryCutoff))
      .sort();
    const earliestExpiry = expiringDates[0] ?? null;
    if (earliestExpiry) {
      conditions.push("expiry_warning");
    }

    if (conditions.length > 0) {
      alerts.push({
        productId: p.id,
        sku: p.sku,
        name: p.name,
        onHand,
        minStock,
        unitsSoldWindow: unitsSoldFast,
        avgDailyDemand,
        suggestedReorderQty,
        conditions,
        earliestExpiry,
      });
    }
  }

  return alerts;
}

// ----------------------------------------------------------------------------
// 4. Best-Selling Perfume Intelligence (Actual Sales Only)
// ----------------------------------------------------------------------------
export function computePerfumeIntelligence(data: AnalyticsDataset) {
  const completedSales = data.sales.filter((s) => s.order_status === "completed");
  const saleMap = new Map(completedSales.map((s) => [s.id, s]));

  const attrKeyById = new Map(data.attributes.map((a) => [a.id, a.key]));
  const productAttrs = new Map<string, Record<string, string | number>>();
  for (const val of data.attrValues) {
    const key = attrKeyById.get(val.attribute_id);
    if (!key) continue;
    const cur = productAttrs.get(val.product_id) ?? {};
    if (val.value_number != null) cur[key] = Number(val.value_number);
    else if (val.value_text != null) cur[key] = val.value_text;
    productAttrs.set(val.product_id, cur);
  }

  const brandMap = new Map(data.brands.map((b) => [b.id, b.name]));
  const prodStats = new Map<
    string,
    {
      productId: string;
      sku: string;
      name: string;
      brand: string;
      volumeMl: string;
      fragranceFamily: string;
      concentration: string;
      unitsSold: number;
      revenue: number;
      cogs: number;
      profit: number;
      distinctCustomers: Set<string>;
      orderCount: number;
    }
  >();

  const seasonalMap = new Map<string, { month: string; units: number; revenue: number }>();
  const channelMap = new Map<string, number>();

  for (const it of data.saleItems) {
    const sale = saleMap.get(it.sale_id);
    if (!sale) continue;
    const prod = data.products.find((p) => p.id === it.product_id);
    if (!prod) continue;
    const attrs = productAttrs.get(prod.id) ?? {};
    const brand = (prod.brand_id && brandMap.get(prod.brand_id)) || "Unbranded";
    const vol = attrs.volume_ml != null ? `${attrs.volume_ml}ml` : "Unspecified";
    const family = String(attrs.fragrance_family ?? "Unspecified");
    const conc = String(attrs.concentration ?? "Unspecified");

    if (!prodStats.has(prod.id)) {
      prodStats.set(prod.id, {
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        brand,
        volumeMl: vol,
        fragranceFamily: family,
        concentration: conc,
        unitsSold: 0,
        revenue: 0,
        cogs: 0,
        profit: 0,
        distinctCustomers: new Set(),
        orderCount: 0,
      });
    }
    const st = prodStats.get(prod.id)!;
    const qty = Number(it.quantity);
    const rev = Number(it.line_total);
    const cogs = qty * Number(it.unit_cost_at_sale);
    st.unitsSold += qty;
    st.revenue += rev;
    st.cogs += cogs;
    st.profit += rev - cogs;
    st.orderCount += 1;
    if (sale.customer_id) st.distinctCustomers.add(sale.customer_id);

    const month = sale.sale_date.slice(0, 7);
    const sm = seasonalMap.get(month) ?? { month, units: 0, revenue: 0 };
    sm.units += qty;
    sm.revenue += rev;
    seasonalMap.set(month, sm);

    channelMap.set(sale.channel, (channelMap.get(sale.channel) ?? 0) + qty);
  }

  const allStats = Array.from(prodStats.values()).map((s) => ({
    ...s,
    revenue: round2(s.revenue),
    profit: round2(s.profit),
    repeatCustomerCount: s.distinctCustomers.size,
  }));

  const aggregateBy = (getter: (s: (typeof allStats)[number]) => string) => {
    const m = new Map<string, { name: string; units: number; revenue: number; profit: number }>();
    for (const s of allStats) {
      const k = getter(s);
      const cur = m.get(k) ?? { name: k, units: 0, revenue: 0, profit: 0 };
      cur.units += s.unitsSold;
      cur.revenue += s.revenue;
      cur.profit += s.profit;
      m.set(k, cur);
    }
    return Array.from(m.values())
      .map((x) => ({ ...x, revenue: round2(x.revenue), profit: round2(x.profit) }))
      .sort((a, b) => b.units - a.units);
  };

  const soldProductIds = new Set(allStats.map((s) => s.productId));
  const slowMovingPerfumes = data.products
    .filter((p) => !soldProductIds.has(p.id))
    .map((p) => ({
      productId: p.id,
      sku: p.sku,
      name: p.name,
      brand: (p.brand_id && brandMap.get(p.brand_id)) || "Unbranded",
      unitsSold: 0,
    }));

  return {
    bestSellingPerfumes: [...allStats].sort((a, b) => b.unitsSold - a.unitsSold),
    mostProfitablePerfumes: [...allStats].sort((a, b) => b.profit - a.profit),
    highestRevenueProducts: [...allStats].sort((a, b) => b.revenue - a.revenue),
    repeatPurchaseProducts: [...allStats]
      .filter((s) => s.orderCount >= 2 || s.repeatCustomerCount >= 2)
      .sort((a, b) => b.orderCount - a.orderCount),
    bestSellingBrands: aggregateBy((s) => s.brand),
    bestSellingVolumes: aggregateBy((s) => s.volumeMl),
    fragranceFamilies: aggregateBy((s) => s.fragranceFamily),
    customerPreferences: {
      topConcentrations: aggregateBy((s) => s.concentration),
      topChannels: Array.from(channelMap.entries())
        .map(([channel, units]) => ({ channel, units }))
        .sort((a, b) => b.units - a.units),
    },
    slowMovingPerfumes,
    seasonalTrends: Array.from(seasonalMap.values())
      .map((x) => ({ ...x, revenue: round2(x.revenue) }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  };
}

// ----------------------------------------------------------------------------
// 5. Grounded AI Business Assistant Brief (Strict Separation of Facts/Forecasts)
// ----------------------------------------------------------------------------
export interface GroundedAiResponse {
  question: string;
  externalAiConnected: boolean;
  provider: string | null;
  recordedFacts: string[];
  calculatedMetrics: string[];
  forecasts: string[];
  recommendations: string[];
  missingData: string[];
  suggestedProposals: {
    proposalType: "reorder_po" | "price_review" | "ad_budget_review" | "stock_audit";
    title: string;
    rationale: string;
    payload: Record<string, unknown>;
  }[];
  narrativeSummary?: string;
}

export function buildGroundedAiBrief(
  question: string,
  data: AnalyticsDataset,
  aiStatus: { configured: boolean; provider: string | null }
): GroundedAiResponse {
  const analytics = computeBusinessAnalytics(data, {});
  const alerts = computeStockAlerts(
    data.products,
    data.inventory,
    data.sales,
    data.saleItems
  );
  const perfume = computePerfumeIntelligence(data);
  const q = question.toLowerCase();

  const recordedFacts: string[] = [
    `Recorded completed sales orders: ${analytics.summary.totalOrders}`,
    `Active products in catalog: ${data.products.length}`,
    `Registered customers: ${data.customers.length}; Suppliers: ${data.suppliers.length}`,
  ];

  const calculatedMetrics: string[] = [
    `Net Revenue: ${analytics.summary.totalRevenue.toLocaleString()} | Gross Profit: ${analytics.summary.grossProfit.toLocaleString()} | Net Profit: ${analytics.summary.netProfit.toLocaleString()}`,
    `Inventory Valuation: ${analytics.summary.stockValuation.toLocaleString()} | Inventory Turnover: ${analytics.summary.inventoryTurnover}x`,
  ];

  const forecasts: string[] = [];
  const recommendations: string[] = [];
  const missingData: string[] = [];
  const suggestedProposals: GroundedAiResponse["suggestedProposals"] = [];

  if (analytics.trends.length >= 2) {
    const latest = analytics.trends[analytics.trends.length - 1];
    const prev = analytics.trends[analytics.trends.length - 2];
    const avgOutflow = round2(
      analytics.trends.reduce((s, t) => s + t.cashOutflow, 0) /
        analytics.trends.length
    );
    forecasts.push(
      `Next-month cash outflow baseline (mean of ${analytics.trends.length} recorded months): ${avgOutflow.toLocaleString()}`
    );
    if (latest.netProfit < prev.netProfit) {
      calculatedMetrics.push(
        `Latest month net profit (${latest.netProfit.toLocaleString()}) declined vs prior month (${prev.netProfit.toLocaleString()}).`
      );
    }
  } else {
    missingData.push(
      "Fewer than 2 months of sales/cash-flow history exist for reliable multi-month trend forecasting."
    );
  }

  if (perfume.mostProfitablePerfumes[0]) {
    const top = perfume.mostProfitablePerfumes[0];
    calculatedMetrics.push(
      `Most profitable recorded product: ${top.name} (Profit: ${top.profit.toLocaleString()}, Units: ${top.unitsSold})`
    );
  } else {
    missingData.push("No completed product sales recorded yet to rank product profitability.");
  }

  const reorderAlerts = alerts.filter((a) =>
    a.conditions.includes("reorder_required") || a.conditions.includes("low_stock") || a.conditions.includes("out_of_stock")
  );
  if (reorderAlerts.length > 0) {
    const topReorder = reorderAlerts.slice(0, 3);
    calculatedMetrics.push(
      `Products flagged for reorder/low stock: ${topReorder.map((r) => `${r.name} (on hand: ${r.onHand}, suggested: +${r.suggestedReorderQty})`).join("; ")}`
    );
    recommendations.push(
      `Review and approve draft Purchase Orders for ${topReorder.map((r) => r.sku).join(", ")} (human approval required).`
    );
    suggestedProposals.push({
      proposalType: "reorder_po",
      title: `Draft Reorder Review for ${topReorder[0].name}`,
      rationale: `On-hand stock (${topReorder[0].onHand}) is below threshold; suggested reorder +${topReorder[0].suggestedReorderQty} units.`,
      payload: {
        sku: topReorder[0].sku,
        suggestedQty: topReorder[0].suggestedReorderQty,
      },
    });
  }

  const slowAlerts = alerts.filter((a) => a.conditions.includes("slow_moving"));
  if (slowAlerts.length > 0 || q.includes("slow")) {
    calculatedMetrics.push(
      `Slow-moving items (in stock, zero sales in 60d): ${slowAlerts.length} SKU(s)`
    );
    if (slowAlerts.length > 0) {
      recommendations.push(
        `Bundle or promote slow-moving stock (${slowAlerts[0].name}) rather than reordering.`
      );
      suggestedProposals.push({
        proposalType: "stock_audit",
        title: `Slow-Moving Stock Review (${slowAlerts.length} SKUs)`,
        rationale: `${slowAlerts[0].name} has ${slowAlerts[0].onHand} units on hand with 0 sales in 60 days.`,
        payload: { skus: slowAlerts.slice(0, 5).map((s) => s.sku) },
      });
    }
  }

  if (data.marketingMetrics.length > 0) {
    calculatedMetrics.push(
      `Ad Spend: ${analytics.summary.adSpend.toLocaleString()} | Attributed Revenue: ${analytics.summary.adRevenue.toLocaleString()} | Post-Ad Contribution: ${analytics.summary.adContribution.toLocaleString()}`
    );
    if (analytics.summary.adContribution < 0) {
      recommendations.push(
        "Pause or restructure ad sets where Post-Ad Contribution is negative even if ROAS > 1x."
      );
      suggestedProposals.push({
        proposalType: "ad_budget_review",
        title: "Ad Campaign Budget Review Required",
        rationale: `Aggregate Contribution After Advertising is ${analytics.summary.adContribution.toLocaleString()}.`,
        payload: { adSpend: analytics.summary.adSpend },
      });
    }
  } else {
    missingData.push("No marketing campaign metrics logged yet.");
  }

  if (data.customers.length > 0) {
    const topCustomer = [...data.customers].sort(
      (a, b) => Number(b.total_purchase_value) - Number(a.total_purchase_value)
    )[0];
    recordedFacts.push(
      `Highest-CLV customer: ${topCustomer.full_name} (${Number(topCustomer.total_purchase_value).toLocaleString()} across ${topCustomer.total_orders} orders)`
    );
  }

  if (data.suppliers.length > 0 && analytics.supplierPerformance.length > 0) {
    const topSup = [...analytics.supplierPerformance].sort(
      (a, b) => b.totalSpend - a.totalSpend
    )[0];
    recordedFacts.push(
      `Top supplier by purchase receipts: ${topSup.name} (Lead time: ${topSup.leadTimeDays}d, Status: ${topSup.verificationStatus})`
    );
  }

  if (!aiStatus.configured) {
    missingData.push(
      "External LLM API key (GEMINI_API_KEY / OPENAI_API_KEY) is not configured — showing deterministic database-grounded analysis only."
    );
  }

  return {
    question,
    externalAiConnected: aiStatus.configured,
    provider: aiStatus.provider,
    recordedFacts,
    calculatedMetrics,
    forecasts,
    recommendations,
    missingData,
    suggestedProposals,
  };
}

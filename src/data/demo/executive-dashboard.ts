import type {
  BreakdownPoint,
  CashFlowPoint,
  CategoryFilterKey,
  CustomerGrowthPoint,
  DashboardWidgetConfig,
  DateRangeKey,
  DemoPerfumeOrder,
  DemoStockAlert,
  DemoTopProduct,
  KpiMetric,
  RevenueTrendPoint,
} from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils/format";

export const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last_7_days", label: "Last 7 Days" },
  { key: "last_30_days", label: "Last 30 Days" },
  { key: "this_month", label: "This Month" },
  { key: "previous_month", label: "Previous Month" },
  { key: "this_year", label: "This Year" },
  { key: "custom", label: "Custom Range" },
];

export const CATEGORY_FILTER_OPTIONS: {
  key: CategoryFilterKey;
  label: string;
}[] = [
  { key: "all", label: "All Categories" },
  { key: "arabian", label: "Arabian Fragrances" },
  { key: "designer", label: "Designer Fragrances" },
  { key: "niche", label: "Niche Fragrances" },
  { key: "oud-attar", label: "Oud & Attar" },
  { key: "gift-sets", label: "Perfume Gift Sets" },
];

export const DEFAULT_WIDGET_LAYOUT: DashboardWidgetConfig[] = [
  { id: "kpis", title: "12 Executive KPI Cards", visible: true },
  { id: "revenue_profit", title: "Revenue, Profit & Loss Trend", visible: true },
  { id: "cash_flow", title: "Monthly Cash Flow & Customer Growth", visible: true },
  { id: "expense_breakdown", title: "Expense Breakdown & Sales Mix", visible: true },
  { id: "sales_category_brand", title: "Sales by Category & Top Brands", visible: true },
  { id: "top_products", title: "Top-Selling Demo Perfumes", visible: true },
  { id: "recent_orders", title: "Recent Demo Sales Orders", visible: true },
  { id: "stock_alerts", title: "Inventory Stock Alerts (Demo)", visible: true },
];

export const DEMO_NOTIFICATIONS = [
  {
    id: "notif-1",
    title: "Low Stock Warning (Sample)",
    detail: "Lattafa Khamrah 100ml EDP dropped to 6 units (min: 15).",
    time: "12m ago",
  },
  {
    id: "notif-2",
    title: "Pending KSA Shipment Review",
    detail: "Sample PO-2026-041 awaits Dangerous Goods clearance check.",
    time: "1h ago",
  },
  {
    id: "notif-3",
    title: "Unpaid Wholesale Invoice",
    detail: "Sample invoice INV-1084 has ৳42,500 outstanding balance.",
    time: "3h ago",
  },
];

const RANGE_MULTIPLIER: Record<DateRangeKey, number> = {
  today: 0.05,
  yesterday: 0.045,
  last_7_days: 0.27,
  last_30_days: 1,
  this_month: 0.92,
  previous_month: 0.84,
  this_year: 9.8,
  custom: 0.65,
};

const CATEGORY_MULTIPLIER: Record<CategoryFilterKey, number> = {
  all: 1,
  arabian: 0.38,
  designer: 0.27,
  niche: 0.16,
  "oud-attar": 0.12,
  "gift-sets": 0.07,
};

const BASE_TREND: RevenueTrendPoint[] = [
  { period: "May", revenue: 1120000, grossProfit: 414000, netProfit: 218000, expenses: 196000 },
  { period: "Jun", revenue: 1245000, grossProfit: 468000, netProfit: 249000, expenses: 219000 },
  { period: "Jul", revenue: 1190000, grossProfit: 441000, netProfit: 226000, expenses: 215000 },
  { period: "Aug", revenue: 1385000, grossProfit: 526000, netProfit: 289000, expenses: 237000 },
  { period: "Sep", revenue: 1510000, grossProfit: 579000, netProfit: 324000, expenses: 255000 },
  { period: "Oct", revenue: 1640000, grossProfit: 639000, netProfit: 368000, expenses: 271000 },
  { period: "Nov", revenue: 1845000, grossProfit: 721000, netProfit: 422000, expenses: 299000 },
];

const BASE_CASH_FLOW: CashFlowPoint[] = [
  { month: "May", inflow: 1050000, outflow: 860000 },
  { month: "Jun", inflow: 1190000, outflow: 910000 },
  { month: "Jul", inflow: 1140000, outflow: 950000 },
  { month: "Aug", inflow: 1320000, outflow: 1015000 },
  { month: "Sep", inflow: 1460000, outflow: 1105000 },
  { month: "Oct", inflow: 1585000, outflow: 1190000 },
  { month: "Nov", inflow: 1760000, outflow: 1265000 },
];

const BASE_CUSTOMER_GROWTH: CustomerGrowthPoint[] = [
  { month: "May", totalCustomers: 640, repeatCustomers: 210 },
  { month: "Jun", totalCustomers: 735, repeatCustomers: 258 },
  { month: "Jul", totalCustomers: 812, repeatCustomers: 294 },
  { month: "Aug", totalCustomers: 928, repeatCustomers: 348 },
  { month: "Sep", totalCustomers: 1054, repeatCustomers: 412 },
  { month: "Oct", totalCustomers: 1185, repeatCustomers: 478 },
  { month: "Nov", totalCustomers: 1340, repeatCustomers: 562 },
];

export const DEMO_TOP_PRODUCTS: DemoTopProduct[] = [
  {
    id: "prod-1",
    sku: "ARB-LAT-100",
    name: "Khamrah EDP (Sample)",
    brand: "Lattafa",
    category: "arabian",
    volumeMl: 100,
    unitsSold: 148,
    revenueBdt: 473600,
    grossMarginPct: 41.2,
    stockQty: 6,
  },
  {
    id: "prod-2",
    sku: "ARB-AFN-100",
    name: "Supremacy Not Only Intense (Sample)",
    brand: "Afnan",
    category: "arabian",
    volumeMl: 100,
    unitsSold: 104,
    revenueBdt: 447200,
    grossMarginPct: 38.6,
    stockQty: 24,
  },
  {
    id: "prod-3",
    sku: "DES-DIO-100",
    name: "Sauvage Elixir (Sample)",
    brand: "Dior",
    category: "designer",
    volumeMl: 100,
    unitsSold: 38,
    revenueBdt: 684000,
    grossMarginPct: 31.5,
    stockQty: 9,
  },
  {
    id: "prod-4",
    sku: "NIC-MFK-070",
    name: "Baccarat Rouge 540 EDP (Sample)",
    brand: "Maison Francis Kurkdjian",
    category: "niche",
    volumeMl: 70,
    unitsSold: 16,
    revenueBdt: 544000,
    grossMarginPct: 29.8,
    stockQty: 4,
  },
  {
    id: "prod-5",
    sku: "OUD-RAS-090",
    name: "Hawas Ice for Him (Sample)",
    brand: "Rasasi",
    category: "oud-attar",
    volumeMl: 100,
    unitsSold: 92,
    revenueBdt: 386400,
    grossMarginPct: 39.4,
    stockQty: 31,
  },
  {
    id: "prod-6",
    sku: "GFT-ARM-105",
    name: "Club de Nuit Intense Gift Set (Sample)",
    brand: "Armaf",
    category: "gift-sets",
    volumeMl: 105,
    unitsSold: 54,
    revenueBdt: 259200,
    grossMarginPct: 42.0,
    stockQty: 14,
  },
];

export const DEMO_RECENT_ORDERS: DemoPerfumeOrder[] = [
  {
    id: "ord-1",
    invoiceNo: "DEMO-INV-2041",
    customer: "Tanvir Rahman (Sample)",
    product: "Lattafa Khamrah 100ml",
    brand: "Lattafa",
    category: "arabian",
    channel: "Facebook Shop",
    paymentMethod: "bKash",
    status: "Completed",
    amountBdt: 6400,
    date: "2026-11-24",
  },
  {
    id: "ord-2",
    invoiceNo: "DEMO-INV-2040",
    customer: "Nusrat Jahan (Sample)",
    product: "Dior Sauvage Elixir 100ml",
    brand: "Dior",
    category: "designer",
    channel: "Showroom",
    paymentMethod: "Card",
    status: "Completed",
    amountBdt: 18500,
    date: "2026-11-24",
  },
  {
    id: "ord-3",
    invoiceNo: "DEMO-INV-2039",
    customer: "Farhan Ahmed (Sample)",
    product: "MFK Baccarat Rouge 540",
    brand: "Maison Francis Kurkdjian",
    category: "niche",
    channel: "WhatsApp",
    paymentMethod: "Bank Transfer",
    status: "Pending",
    amountBdt: 34000,
    date: "2026-11-23",
  },
  {
    id: "ord-4",
    invoiceNo: "DEMO-INV-2038",
    customer: "Sadia Islam (Sample)",
    product: "Rasasi Hawas Ice 100ml",
    brand: "Rasasi",
    category: "oud-attar",
    channel: "Website",
    paymentMethod: "bKash",
    status: "Completed",
    amountBdt: 4200,
    date: "2026-11-23",
  },
  {
    id: "ord-5",
    invoiceNo: "DEMO-INV-2037",
    customer: "Mehedi Hasan (Sample)",
    product: "Armaf CDNIM Gift Set",
    brand: "Armaf",
    category: "gift-sets",
    channel: "Showroom",
    paymentMethod: "Cash",
    status: "Processing",
    amountBdt: 4800,
    date: "2026-11-22",
  },
  {
    id: "ord-6",
    invoiceNo: "DEMO-INV-2036",
    customer: "Rashedul Karim (Sample)",
    product: "Afnan Supremacy NOI",
    brand: "Afnan",
    category: "arabian",
    channel: "Website",
    paymentMethod: "Card",
    status: "Completed",
    amountBdt: 4300,
    date: "2026-11-22",
  },
  {
    id: "ord-7",
    invoiceNo: "DEMO-INV-2035",
    customer: "Zarin Tasnim (Sample)",
    product: "Al Haramain Amber Oud",
    brand: "Al Haramain",
    category: "oud-attar",
    channel: "Facebook Shop",
    paymentMethod: "bKash",
    status: "Completed",
    amountBdt: 5900,
    date: "2026-11-21",
  },
  {
    id: "ord-8",
    invoiceNo: "DEMO-INV-2034",
    customer: "Imran Chowdhury (Sample)",
    product: "Versace Eros Flame 100ml",
    brand: "Versace",
    category: "designer",
    channel: "Showroom",
    paymentMethod: "Card",
    status: "Pending",
    amountBdt: 9800,
    date: "2026-11-21",
  },
];

export const DEMO_STOCK_ALERTS: DemoStockAlert[] = [
  {
    id: "alt-1",
    sku: "ARB-LAT-100",
    productName: "Lattafa Khamrah EDP 100ml (Sample)",
    brand: "Lattafa",
    stockQty: 6,
    minStock: 15,
    severity: "Low Stock",
    suggestedReorder: 40,
  },
  {
    id: "alt-2",
    sku: "NIC-MFK-070",
    productName: "MFK Baccarat Rouge 540 70ml (Sample)",
    brand: "Maison Francis Kurkdjian",
    stockQty: 4,
    minStock: 8,
    severity: "Low Stock",
    suggestedReorder: 10,
  },
  {
    id: "alt-3",
    sku: "OUD-AJM-050",
    productName: "Ajmal Dahn Al Oudh Moattaq (Sample)",
    brand: "Ajmal",
    stockQty: 0,
    minStock: 6,
    severity: "Out of Stock",
    suggestedReorder: 12,
  },
  {
    id: "alt-4",
    sku: "DES-VER-100",
    productName: "Versace Dylan Blue 100ml (Sample)",
    brand: "Versace",
    stockQty: 11,
    minStock: 12,
    severity: "Reorder Soon",
    suggestedReorder: 20,
  },
];

export function getFilteredExecutiveSnapshot(
  dateRange: DateRangeKey,
  category: CategoryFilterKey,
  customDays = 14
) {
  const rangeFactor =
    dateRange === "custom"
      ? Math.max(0.04, Math.min(3, customDays / 30))
      : RANGE_MULTIPLIER[dateRange];
  const catFactor = CATEGORY_MULTIPLIER[category];
  const factor = rangeFactor * catFactor;

  const revenue = Math.round(1845000 * factor);
  const cogs = Math.round(revenue * 0.61);
  const operatingExpenses = Math.round(299000 * factor);
  const grossProfit = revenue - cogs;
  const netProfit = Math.max(0, grossProfit - operatingExpenses);
  const totalOrders = Math.max(1, Math.round(418 * factor));
  const totalCustomers = Math.max(12, Math.round(1340 * catFactor));
  const totalProducts = Math.max(18, Math.round(186 * catFactor));
  const inventoryValue = Math.round(4260000 * catFactor);
  const lowStockCount = category === "all" ? 11 : 3;
  const pendingOrders = Math.max(1, Math.round(14 * Math.min(1.5, factor)));
  const outstandingPayments = Math.round(186500 * Math.min(2, factor));
  const monthlyGrowth =
    category === "arabian" ? 18.4 : category === "niche" ? 14.9 : 12.6;

  const kpis: KpiMetric[] = [
    {
      id: "total-revenue",
      label: "Total Revenue",
      value: formatCurrency(revenue),
      delta: "+12.6%",
      trend: "up",
      hint: "Earned sales net of returns (demo)",
    },
    {
      id: "total-expenses",
      label: "Total Expenses",
      value: formatCurrency(operatingExpenses),
      delta: "+4.2%",
      trend: "neutral",
      hint: "Operating, ads, freight & customs",
    },
    {
      id: "net-profit",
      label: "Net Profit",
      value: formatCurrency(netProfit),
      delta: "+16.4%",
      trend: "up",
      hint: `${((netProfit / Math.max(1, revenue)) * 100).toFixed(1)}% net margin`,
    },
    {
      id: "gross-profit",
      label: "Gross Profit",
      value: formatCurrency(grossProfit),
      delta: "+14.1%",
      trend: "up",
      hint: `${((grossProfit / Math.max(1, revenue)) * 100).toFixed(1)}% gross margin`,
    },
    {
      id: "total-orders",
      label: "Total Orders",
      value: totalOrders.toLocaleString(),
      delta: "+9.8%",
      trend: "up",
      hint: `AOV ${formatCurrency(Math.round(revenue / totalOrders))}`,
    },
    {
      id: "total-customers",
      label: "Total Customers",
      value: totalCustomers.toLocaleString(),
      delta: "+13.1%",
      trend: "up",
      hint: "41.9% repeat buyers (demo)",
    },
    {
      id: "total-products",
      label: "Total Products",
      value: totalProducts.toLocaleString(),
      delta: "+6 SKUs",
      trend: "up",
      hint: "Active catalog SKUs",
    },
    {
      id: "inventory-value",
      label: "Total Inventory Value",
      value: formatCurrency(inventoryValue),
      delta: "+5.4%",
      trend: "up",
      hint: "Weighted landed cost basis",
    },
    {
      id: "low-stock",
      label: "Low Stock Products",
      value: String(lowStockCount),
      delta: "Needs review",
      trend: "down",
      hint: "Below custom min threshold",
    },
    {
      id: "pending-orders",
      label: "Pending Orders",
      value: String(pendingOrders),
      delta: "Dispatch queue",
      trend: "neutral",
      hint: "Awaiting confirmation/packing",
    },
    {
      id: "outstanding-payments",
      label: "Outstanding Payments",
      value: formatCurrency(outstandingPayments),
      delta: "-8.2%",
      trend: "up",
      hint: "Receivables across B2B/COD",
    },
    {
      id: "monthly-growth",
      label: "Monthly Growth",
      value: `+${monthlyGrowth.toFixed(1)}%`,
      delta: "MoM pace",
      trend: "up",
      hint: "Vs prior comparative period",
    },
  ];

  const revenueTrend = BASE_TREND.map((pt) => ({
    ...pt,
    revenue: Math.round(pt.revenue * catFactor),
    grossProfit: Math.round(pt.grossProfit * catFactor),
    netProfit: Math.round(pt.netProfit * catFactor),
    expenses: Math.round(pt.expenses * catFactor),
  }));

  const cashFlow = BASE_CASH_FLOW.map((pt) => ({
    ...pt,
    inflow: Math.round(pt.inflow * catFactor),
    outflow: Math.round(pt.outflow * catFactor),
  }));

  const expenseBreakdown: BreakdownPoint[] = [
    { name: "KSA Freight & Customs", value: Math.round(118000 * factor), share: 39 },
    { name: "Meta & Social Ads", value: Math.round(78000 * factor), share: 26 },
    { name: "Showroom & Staff", value: Math.round(64000 * factor), share: 22 },
    { name: "Packaging & Delivery", value: Math.round(39000 * factor), share: 13 },
  ];

  const salesByCategory: BreakdownPoint[] = [
    { name: "Arabian", value: Math.round(701100 * rangeFactor), share: 38 },
    { name: "Designer", value: Math.round(498150 * rangeFactor), share: 27 },
    { name: "Niche", value: Math.round(295200 * rangeFactor), share: 16 },
    { name: "Oud & Attar", value: Math.round(221400 * rangeFactor), share: 12 },
    { name: "Gift Sets", value: Math.round(129150 * rangeFactor), share: 7 },
  ];

  const salesByBrand: BreakdownPoint[] = [
    { name: "Lattafa", value: Math.round(420000 * rangeFactor), share: 23 },
    { name: "Dior", value: Math.round(365000 * rangeFactor), share: 20 },
    { name: "Afnan", value: Math.round(310000 * rangeFactor), share: 17 },
    { name: "Rasasi", value: Math.round(268000 * rangeFactor), share: 15 },
    { name: "MFK", value: Math.round(240000 * rangeFactor), share: 13 },
    { name: "Armaf", value: Math.round(215000 * rangeFactor), share: 12 },
  ];

  const salesPerformance = [
    { channel: "Facebook Shop", sales: Math.round(685000 * factor), orders: Math.max(1, Math.round(162 * factor)) },
    { channel: "Showroom", sales: Math.round(542000 * factor), orders: Math.max(1, Math.round(108 * factor)) },
    { channel: "Website", sales: Math.round(398000 * factor), orders: Math.max(1, Math.round(96 * factor)) },
    { channel: "WhatsApp", sales: Math.round(220000 * factor), orders: Math.max(1, Math.round(52 * factor)) },
  ];

  const topProducts =
    category === "all"
      ? DEMO_TOP_PRODUCTS
      : DEMO_TOP_PRODUCTS.filter((p) => p.category === category);

  const recentOrders =
    category === "all"
      ? DEMO_RECENT_ORDERS
      : DEMO_RECENT_ORDERS.filter((o) => o.category === category);

  return {
    kpis,
    revenueTrend,
    cashFlow,
    customerGrowth: BASE_CUSTOMER_GROWTH,
    expenseBreakdown,
    salesByCategory,
    salesByBrand,
    salesPerformance,
    topProducts,
    recentOrders,
    stockAlerts: DEMO_STOCK_ALERTS,
  };
}

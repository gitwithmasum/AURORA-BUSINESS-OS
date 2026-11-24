export type DateRangeKey =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "previous_month"
  | "this_year"
  | "custom";

export type CategoryFilterKey =
  | "all"
  | "arabian"
  | "designer"
  | "niche"
  | "oud-attar"
  | "gift-sets";

export type DensityMode = "expanded" | "compact";

export type WidgetId =
  | "kpis"
  | "revenue_profit"
  | "cash_flow"
  | "expense_breakdown"
  | "sales_category_brand"
  | "top_products"
  | "recent_orders"
  | "stock_alerts";

export interface DashboardWidgetConfig {
  id: WidgetId;
  title: string;
  visible: boolean;
}

export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "neutral";
  hint: string;
}

export interface RevenueTrendPoint {
  period: string;
  revenue: number;
  grossProfit: number;
  netProfit: number;
  expenses: number;
}

export interface CashFlowPoint {
  month: string;
  inflow: number;
  outflow: number;
}

export interface BreakdownPoint {
  name: string;
  value: number;
  share: number;
}

export interface CustomerGrowthPoint {
  month: string;
  totalCustomers: number;
  repeatCustomers: number;
}

export interface DemoPerfumeOrder {
  id: string;
  invoiceNo: string;
  customer: string;
  product: string;
  brand: string;
  category: Exclude<CategoryFilterKey, "all">;
  channel: "Website" | "Facebook Shop" | "Showroom" | "WhatsApp";
  paymentMethod: "bKash" | "Card" | "Cash" | "Bank Transfer";
  status: "Completed" | "Pending" | "Processing";
  amountBdt: number;
  date: string;
}

export interface DemoTopProduct {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: Exclude<CategoryFilterKey, "all">;
  volumeMl: number;
  unitsSold: number;
  revenueBdt: number;
  grossMarginPct: number;
  stockQty: number;
}

export interface DemoStockAlert {
  id: string;
  sku: string;
  productName: string;
  brand: string;
  stockQty: number;
  minStock: number;
  severity: "Low Stock" | "Out of Stock" | "Reorder Soon";
  suggestedReorder: number;
}

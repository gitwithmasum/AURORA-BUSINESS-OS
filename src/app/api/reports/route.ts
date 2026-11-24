import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { loadOrganizationAnalyticsDataset } from "@/lib/analytics/loader";
import { computePerfumeIntelligence } from "@/lib/analytics/engine";
import {
  calculateCashFlowStatement,
  calculateProfitAndLoss,
} from "@/lib/finance/calculations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  const reportType = searchParams.get("type") || "sales";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const permMap: Record<string, "inventory.read" | "sales.read" | "purchases.read" | "customers.read" | "suppliers.read" | "finance.read" | "dashboard.read"> = {
    inventory: "inventory.read",
    sales: "sales.read",
    purchases: "purchases.read",
    customers: "customers.read",
    suppliers: "suppliers.read",
    expenses: "finance.read",
    pnl: "finance.read",
    cashflow: "finance.read",
    imports: "purchases.read",
    customs: "purchases.read",
    marketing: "dashboard.read",
    bestsellers: "sales.read",
  };

  const auth = await requireOrgPermission(
    organizationId,
    permMap[reportType] ?? "dashboard.read"
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const inRange = (d: string) => {
    const day = (d || "").slice(0, 10);
    if (startDate && day < startDate) return false;
    if (endDate && day > endDate) return false;
    return true;
  };

  if (reportType === "inventory") {
    const [inv, prods] = await Promise.all([
      auth.supabase.from("inventory").select("*").eq("organization_id", organizationId),
      auth.supabase.from("products").select("id, sku, name").eq("organization_id", organizationId),
    ]);
    const pMap = new Map((prods.data ?? []).map((p) => [p.id, p]));
    return NextResponse.json({
      rows: (inv.data ?? []).map((i) => ({
        sku: pMap.get(i.product_id)?.sku ?? "",
        product: pMap.get(i.product_id)?.name ?? "",
        batch: i.batch_number,
        quantity: i.quantity_on_hand,
        unitCost: i.unit_landed_cost,
        valuation: Number((Number(i.quantity_on_hand) * Number(i.unit_landed_cost)).toFixed(2)),
      })),
    });
  }

  if (reportType === "sales") {
    const { data } = await auth.supabase
      .from("sales")
      .select("invoice_number, sale_date, channel, payment_method, payment_status, order_status, grand_total")
      .eq("organization_id", organizationId)
      .order("sale_date", { ascending: false });
    return NextResponse.json({
      rows: (data ?? []).filter((r) => inRange(r.sale_date)),
    });
  }

  if (reportType === "purchases") {
    const { data } = await auth.supabase
      .from("purchases")
      .select("purchase_number, received_date, currency, additional_costs, total_cost, payment_status")
      .eq("organization_id", organizationId)
      .order("received_date", { ascending: false });
    return NextResponse.json({
      rows: (data ?? []).filter((r) => inRange(r.received_date)),
    });
  }

  if (reportType === "customers") {
    const { data } = await auth.supabase
      .from("customers")
      .select("customer_code, full_name, phone, city, segment, total_orders, total_purchase_value, outstanding_balance")
      .eq("organization_id", organizationId);
    return NextResponse.json({ rows: data ?? [] });
  }

  if (reportType === "suppliers") {
    const { data } = await auth.supabase
      .from("suppliers")
      .select("supplier_code, name, country, city, moq, lead_time_days, currency, verification_status, partnership_status")
      .eq("organization_id", organizationId);
    return NextResponse.json({ rows: data ?? [] });
  }

  if (reportType === "expenses") {
    const { data } = await auth.supabase
      .from("expenses")
      .select("expense_date, category, vendor_name, amount_base, payment_status, approval_status")
      .eq("organization_id", organizationId)
      .order("expense_date", { ascending: false });
    return NextResponse.json({
      rows: (data ?? []).filter((r) => inRange(r.expense_date)),
    });
  }

  if (reportType === "imports") {
    const { data } = await auth.supabase
      .from("import_scenarios")
      .select("title, origin_country, destination_country, fx_currency, exchange_rate, total_purchase_bdt, total_import_cost_bdt, total_landed_cost_bdt, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    return NextResponse.json({
      rows: (data ?? []).filter((r) => inRange(r.created_at)),
    });
  }

  if (reportType === "customs") {
    const { data } = await auth.supabase
      .from("tax_configurations")
      .select("name, hs_code, country_of_origin, effective_date, customs_duty_pct, regulatory_duty_pct, supplementary_duty_pct, vat_pct, advance_tax_pct, is_verified_by_user")
      .eq("organization_id", organizationId);
    return NextResponse.json({ rows: data ?? [] });
  }

  if (reportType === "marketing") {
    const { data } = await auth.supabase
      .from("marketing_metrics")
      .select("metric_date, actual_spend, impressions, clicks, leads, orders, revenue, product_costs, other_variable_costs")
      .eq("organization_id", organizationId);
    return NextResponse.json({
      rows: (data ?? []).filter((r) => inRange(r.metric_date)),
    });
  }

  const dataset = await loadOrganizationAnalyticsDataset(auth.supabase, organizationId);

  if (reportType === "bestsellers") {
    const perfume = computePerfumeIntelligence(dataset);
    return NextResponse.json({
      rows: perfume.bestSellingPerfumes.map((p) => ({
        sku: p.sku,
        product: p.name,
        brand: p.brand,
        volume: p.volumeMl,
        unitsSold: p.unitsSold,
        revenue: p.revenue,
        profit: p.profit,
      })),
    });
  }

  if (reportType === "cashflow") {
    const txs = dataset.transactions.filter((t) => inRange(t.tx_date));
    const cf = calculateCashFlowStatement(
      0,
      txs.map((t) => ({ direction: t.direction, category: "other", amount: Number(t.amount) }))
    );
    return NextResponse.json({
      rows: [
        { item: "Total Cash Inflows", amount: cf.totalInflows },
        { item: "Total Cash Outflows", amount: -cf.totalOutflows },
        { item: "Net Cash Movement", amount: cf.netCashMovement },
      ],
    });
  }

  // Default: P&L
  const compSales = dataset.sales.filter(
    (s) => s.order_status === "completed" && inRange(s.sale_date)
  );
  const exps = dataset.expenses.filter(
    (e) => e.approval_status === "approved" && inRange(e.expense_date)
  );
  const pnl = calculateProfitAndLoss({
    grossSales: compSales.reduce((s, r) => s + Number(r.grand_total), 0),
    salesReturns: 0,
    cogs: compSales.reduce((s, r) => s + Number(r.cogs_total), 0),
    operatingExpenses: exps.reduce((s, e) => s + Number(e.amount_base), 0),
    marketingExpenses: 0,
    shippingExpenses: 0,
    importExpenses: 0,
    otherExpenses: 0,
  });
  return NextResponse.json({
    rows: [
      { item: "Net Sales", amount: pnl.netSales },
      { item: "Cost of Goods Sold", amount: -pnl.cogs },
      { item: "Gross Profit", amount: pnl.grossProfit },
      { item: "Approved Expenses", amount: -pnl.totalExpenses },
      { item: "Net Profit", amount: pnl.netProfit },
    ],
  });
}

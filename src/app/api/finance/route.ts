import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import {
  calculateCashFlowStatement,
  calculateProfitAndLoss,
} from "@/lib/finance/calculations";
import {
  cashTransactionSchema,
  financialAccountSchema,
} from "@/lib/validators/part4";
import { logActivity } from "@/lib/audit/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const accountId = searchParams.get("accountId") || "";

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "finance.read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let salesQ = auth.supabase
    .from("sales")
    .select("id, sale_date, grand_total, cogs_total, paid_amount, order_status")
    .eq("organization_id", organizationId);
  let returnsQ = auth.supabase
    .from("sales_returns")
    .select("id, return_date, refund_amount, status")
    .eq("organization_id", organizationId);
  let expensesQ = auth.supabase
    .from("expenses")
    .select("id, category, expense_date, amount_base, approval_status")
    .eq("organization_id", organizationId)
    .eq("approval_status", "approved");
  let purchasesQ = auth.supabase
    .from("purchases")
    .select("id, received_date, total_cost")
    .eq("organization_id", organizationId);
  let txQ = auth.supabase
    .from("financial_transactions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("tx_date", { ascending: false });
  const importsQ = auth.supabase
    .from("import_scenarios")
    .select("id, total_import_cost_bdt, created_at")
    .eq("organization_id", organizationId);
  let adsQ = auth.supabase
    .from("marketing_metrics")
    .select("id, metric_date, actual_spend")
    .eq("organization_id", organizationId);

  if (startDate) {
    salesQ = salesQ.gte("sale_date", startDate);
    returnsQ = returnsQ.gte("return_date", startDate);
    expensesQ = expensesQ.gte("expense_date", startDate);
    purchasesQ = purchasesQ.gte("received_date", startDate);
    txQ = txQ.gte("tx_date", startDate);
    adsQ = adsQ.gte("metric_date", startDate);
  }
  if (endDate) {
    salesQ = salesQ.lte("sale_date", endDate);
    returnsQ = returnsQ.lte("return_date", endDate);
    expensesQ = expensesQ.lte("expense_date", endDate);
    purchasesQ = purchasesQ.lte("received_date", endDate);
    txQ = txQ.lte("tx_date", endDate);
    adsQ = adsQ.lte("metric_date", endDate);
  }
  if (accountId) {
    txQ = txQ.eq("account_id", accountId);
  }

  const [
    salesRes,
    returnsRes,
    expensesRes,
    purchasesRes,
    accountsRes,
    txRes,
    customersRes,
    importsRes,
    adsRes,
  ] = await Promise.all([
    salesQ,
    returnsQ,
    expensesQ,
    purchasesQ,
    auth.supabase
      .from("financial_accounts")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at"),
    txQ,
    auth.supabase
      .from("customers")
      .select("outstanding_balance")
      .eq("organization_id", organizationId),
    importsQ,
    adsQ,
  ]);

  const completedSales = (salesRes.data ?? []).filter(
    (s) => s.order_status === "completed"
  );
  const grossSales = completedSales.reduce((s, r) => s + Number(r.grand_total), 0);
  const cogs = completedSales.reduce((s, r) => s + Number(r.cogs_total), 0);
  const salesReturns = (returnsRes.data ?? []).reduce(
    (s, r) => s + Number(r.refund_amount),
    0
  );

  let operatingExpenses = 0;
  let marketingExpenses = 0;
  let shippingExpenses = 0;
  let importExpenses = 0;
  let otherExpenses = 0;

  for (const e of expensesRes.data ?? []) {
    const amt = Number(e.amount_base);
    if (e.category === "Marketing") marketingExpenses += amt;
    else if (e.category === "Shipping" || e.category === "Transportation") shippingExpenses += amt;
    else if (e.category === "Customs") importExpenses += amt;
    else if (e.category === "Other Expenses") otherExpenses += amt;
    else operatingExpenses += amt;
  }

  const inventoryPurchases = (purchasesRes.data ?? []).reduce(
    (s, p) => s + Number(p.total_cost),
    0
  );

  const accounts = accountsRes.data ?? [];
  const filteredAccounts = accountId
    ? accounts.filter((a) => a.id === accountId)
    : accounts;
  const openingBalance = filteredAccounts.reduce(
    (s, a) => s + Number(a.opening_balance),
    0
  );

  const txs = txRes.data ?? [];
  const cashFlow = calculateCashFlowStatement(
    openingBalance,
    txs.map((t) => ({
      direction: t.direction,
      category: t.category,
      amount: Number(t.amount),
    }))
  );

  const pnl = calculateProfitAndLoss({
    grossSales,
    salesReturns,
    cogs,
    operatingExpenses,
    marketingExpenses,
    shippingExpenses,
    importExpenses,
    otherExpenses,
    cashReceipts: cashFlow.salesReceipts + cashFlow.customerPayments,
    inventoryPurchases,
  });

  const outstandingPayments = (customersRes.data ?? []).reduce(
    (s, c) => s + Number(c.outstanding_balance),
    0
  );
  const importCostsTotal = (importsRes.data ?? []).reduce(
    (s, i) => s + Number(i.total_import_cost_bdt),
    0
  );
  const marketingSpend = (adsRes.data ?? []).reduce(
    (s, m) => s + Number(m.actual_spend),
    0
  );

  return NextResponse.json({
    pnl,
    cashFlow,
    accounts,
    transactions: txs,
    kpis: {
      revenue: pnl.netSales,
      expenses: pnl.totalExpenses,
      grossProfit: pnl.grossProfit,
      netProfit: pnl.netProfit,
      cashBalance: cashFlow.closingCashBalance,
      outstandingPayments,
      importCosts: importCostsTotal,
      marketingSpend,
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const kind = body?.kind as "account" | "transaction" | undefined;

  if (kind === "account") {
    const parsed = financialAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const v = parsed.data;
    const auth = await requireOrgPermission(v.organizationId, "finance.write");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data, error } = await auth.supabase
      .from("financial_accounts")
      .insert({
        organization_id: v.organizationId,
        account_name: v.accountName,
        account_type: v.accountType,
        institution_name: v.institutionName,
        account_number_masked: v.accountNumberMasked,
        currency: v.currency,
        opening_balance: v.openingBalance,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logActivity(auth.supabase, {
      organizationId: v.organizationId,
      actorUserId: auth.context.user.id,
      eventType: "settings.updated",
      entityType: "financial_account",
      entityId: data.id,
      metadata: { account_name: v.accountName, account_type: v.accountType },
    });

    return NextResponse.json({ account: data }, { status: 201 });
  }

  const parsed = cashTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const auth = await requireOrgPermission(v.organizationId, "finance.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("financial_transactions")
    .insert({
      organization_id: v.organizationId,
      account_id: v.accountId,
      direction: v.direction,
      category: v.category,
      amount: v.amount,
      tx_date: v.txDate,
      payment_method: v.paymentMethod,
      reference_type: "manual",
      description: v.description,
      actor_user_id: auth.context.user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ transaction: data }, { status: 201 });
}

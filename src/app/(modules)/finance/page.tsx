"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Landmark, Plus, Scale } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/format";
import {
  calculateBreakEven,
  type CashFlowSummary,
  type PnlResult,
} from "@/lib/finance/calculations";
import { exportDocumentPdf, exportRowsToExcel } from "@/lib/operations/exports";
import { BackendConnectionGuard } from "@/components/operations/BackendConnectionGuard";
import {
  ChartCard,
  DataTable,
  FormField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
  GlassChartTooltip,
  GlassDialog,
  GlassInput,
  GlassSelect,
  KpiCard,
  PageHeader,
  useToast,
} from "@/components/ui";

interface FinancialAccountRow {
  id: string;
  account_name: string;
  account_type: "cash" | "bank" | "mfs";
  institution_name: string;
  currency: string;
  opening_balance: number;
}

interface CashTxRow {
  id: string;
  account_id: string | null;
  direction: "inflow" | "outflow";
  category: string;
  amount: number;
  tx_date: string;
  payment_method: string;
  description: string;
}

type PeriodMode = "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "custom";

function computePeriodDates(mode: PeriodMode): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const d = new Date(now);
  if (mode === "daily") return { start: end, end };
  if (mode === "weekly") {
    d.setDate(d.getDate() - 7);
    return { start: d.toISOString().slice(0, 10), end };
  }
  if (mode === "monthly") {
    d.setDate(1);
    return { start: d.toISOString().slice(0, 10), end };
  }
  if (mode === "quarterly") {
    d.setMonth(d.getMonth() - 3);
    return { start: d.toISOString().slice(0, 10), end };
  }
  if (mode === "annual") {
    d.setMonth(0, 1);
    return { start: d.toISOString().slice(0, 10), end };
  }
  return { start: "", end: "" };
}

function FinanceWorkspace() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = React.useState<"dashboard" | "pnl" | "cashflow" | "breakeven">("dashboard");
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>("monthly");
  const [startDate, setStartDate] = React.useState(() => computePeriodDates("monthly").start);
  const [endDate, setEndDate] = React.useState(() => computePeriodDates("monthly").end);
  const [accountFilter, setAccountFilter] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [pnl, setPnl] = React.useState<PnlResult | null>(null);
  const [cashFlow, setCashFlow] = React.useState<CashFlowSummary | null>(null);
  const [accounts, setAccounts] = React.useState<FinancialAccountRow[]>([]);
  const [transactions, setTransactions] = React.useState<CashTxRow[]>([]);
  const [kpis, setKpis] = React.useState({
    revenue: 0,
    expenses: 0,
    grossProfit: 0,
    netProfit: 0,
    cashBalance: 0,
    outstandingPayments: 0,
    importCosts: 0,
    marketingSpend: 0,
  });

  // Modals for Account / Cash Transaction
  const [acctOpen, setAcctOpen] = React.useState(false);
  const [txOpen, setTxOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [acctName, setAcctName] = React.useState("");
  const [acctType, setAcctType] = React.useState<"cash" | "bank" | "mfs">("bank");
  const [acctInst, setAcctInst] = React.useState("");
  const [acctOpenBal, setAcctOpenBal] = React.useState(0);

  const [txDirection, setTxDirection] = React.useState<"inflow" | "outflow">("inflow");
  const [txCategory, setTxCategory] = React.useState("customer_payment");
  const [txAccountId, setTxAccountId] = React.useState("");
  const [txAmount, setTxAmount] = React.useState(0);
  const [txDate, setTxDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [txMethod, setTxMethod] = React.useState("Bank Transfer");
  const [txDesc, setTxDesc] = React.useState("");

  // Break-even interactive calculator state
  const [fixedCosts, setFixedCosts] = React.useState(180000);
  const [variableCost, setVariableCost] = React.useState(1950);
  const [sellingPrice, setSellingPrice] = React.useState(3200);
  const [expectedVolume, setExpectedVolume] = React.useState(220);

  const loadFinance = React.useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ organizationId: activeOrg.organizationId });
      if (startDate) qs.set("startDate", startDate);
      if (endDate) qs.set("endDate", endDate);
      if (accountFilter) qs.set("accountId", accountFilter);

      const res = await fetch(`/api/finance?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to load finance data", tone: "error" });
        return;
      }
      setPnl(json.pnl);
      setCashFlow(json.cashFlow);
      setAccounts(json.accounts ?? []);
      setTransactions(json.transactions ?? []);
      setKpis(json.kpis);
      if (!txAccountId && json.accounts?.[0]?.id) setTxAccountId(json.accounts[0].id);
    } finally {
      setLoading(false);
    }
  }, [activeOrg, startDate, endDate, accountFilter, txAccountId, toast]);

  React.useEffect(() => {
    void loadFinance();
  }, [loadFinance]);

  const handlePeriodChange = (mode: PeriodMode) => {
    setPeriodMode(mode);
    if (mode !== "custom") {
      const r = computePeriodDates(mode);
      setStartDate(r.start);
      setEndDate(r.end);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setSaving(true);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "account",
          organizationId: activeOrg.organizationId,
          accountName: acctName,
          accountType: acctType,
          institutionName: acctInst,
          openingBalance: Number(acctOpenBal) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to add account", tone: "error" });
        return;
      }
      toast({ title: "Financial account added", tone: "success" });
      setAcctOpen(false);
      setAcctName("");
      setAcctInst("");
      setAcctOpenBal(0);
      await loadFinance();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setSaving(true);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "transaction",
          organizationId: activeOrg.organizationId,
          accountId: txAccountId || null,
          direction: txDirection,
          category: txCategory,
          amount: Number(txAmount),
          txDate,
          paymentMethod: txMethod,
          description: txDesc,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Transaction failed", tone: "error" });
        return;
      }
      toast({ title: "Cash transaction recorded", tone: "success" });
      setTxOpen(false);
      setTxAmount(0);
      setTxDesc("");
      await loadFinance();
    } finally {
      setSaving(false);
    }
  };

  const breakEven = React.useMemo(
    () =>
      calculateBreakEven({
        fixedCosts,
        variableCostPerUnit: variableCost,
        sellingPricePerUnit: sellingPrice,
        expectedSalesVolume: expectedVolume,
      }),
    [fixedCosts, variableCost, sellingPrice, expectedVolume]
  );

  const breakEvenChartData = React.useMemo(() => {
    const maxUnits = Math.max(expectedVolume * 1.4, (breakEven.breakEvenUnits ?? 100) * 1.5, 50);
    const step = Math.max(1, Math.round(maxUnits / 6));
    const pts = [];
    for (let u = 0; u <= maxUnits; u += step) {
      pts.push({
        units: u,
        revenue: Math.round(u * sellingPrice),
        totalCost: Math.round(fixedCosts + u * variableCost),
      });
    }
    return pts;
  }, [expectedVolume, breakEven.breakEvenUnits, sellingPrice, fixedCosts, variableCost]);

  const pnlRows = pnl
    ? [
        { line: "Gross Sales", amount: pnl.grossSales },
        { line: "Less: Sales Returns", amount: -pnl.salesReturns },
        { line: "Net Sales", amount: pnl.netSales },
        { line: "Less: Cost of Goods Sold (COGS)", amount: -pnl.cogs },
        { line: "Gross Profit", amount: pnl.grossProfit },
        { line: "Operating Expenses", amount: -pnl.operatingExpenses },
        { line: "Marketing Expenses", amount: -pnl.marketingExpenses },
        { line: "Shipping Expenses", amount: -pnl.shippingExpenses },
        { line: "Import / Customs Expenses", amount: -pnl.importExpenses },
        { line: "Other Expenses", amount: -pnl.otherExpenses },
        { line: "Net Profit", amount: pnl.netProfit },
      ]
    : [];

  const txColumns: ColumnDef<CashTxRow>[] = [
    { accessorKey: "tx_date", header: "Date" },
    {
      accessorKey: "direction",
      header: "Flow",
      cell: ({ row }) => (
        <GlassBadge tone={row.original.direction === "inflow" ? "success" : "warning"}>
          {row.original.direction}
        </GlassBadge>
      ),
    },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "payment_method", header: "Method" },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(Number(row.original.amount)),
    },
    { accessorKey: "description", header: "Description" },
  ];

  const exportPnlPdf = () => {
    if (!pnl) return;
    exportDocumentPdf({
      title: "PROFIT & LOSS STATEMENT",
      subtitle: `${periodMode.toUpperCase()} (${startDate || "All"} to ${endDate || "Today"})`,
      businessName: activeOrg?.organizationName ?? "AURORA BUSINESS OS",
      meta: [
        { label: "Gross Margin", value: `${pnl.grossMarginPct}%` },
        { label: "Net Margin", value: `${pnl.netMarginPct}%` },
        { label: "Cash Receipts (Separate)", value: formatCurrency(pnl.cashReceipts) },
      ],
      columns: ["Statement Line", "Amount (BDT)"],
      rows: pnlRows.map((r) => [r.line, formatCurrency(r.amount)]),
      footerNote: "Generated from real PostgreSQL sales, COGS, and approved expenses.",
      filename: "aurora-pnl-statement.pdf",
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Financial Management & Accounting"
        subtitle="P&L Statement, Cash Flow across Cash/Bank/MFS, Financial Dashboard & Break-even Simulator."
        actions={
          <>
            <GlassButton variant="secondary" size="sm" onClick={() => setAcctOpen(true)}>
              <Landmark className="h-3.5 w-3.5" />
              Add Account
            </GlassButton>
            <GlassButton variant="primary" size="sm" onClick={() => setTxOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Record Cash Tx
            </GlassButton>
          </>
        }
      />

      {/* Tabs + Date Range */}
      <GlassCard padding="sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "dashboard", label: "Financial Dashboard" },
              { key: "pnl", label: "Profit & Loss" },
              { key: "cashflow", label: "Cash Flow Statement" },
              { key: "breakeven", label: "Break-even Calculator" },
            ].map((t) => (
              <GlassButton
                key={t.key}
                size="sm"
                variant={tab === t.key ? "primary" : "ghost"}
                onClick={() => setTab(t.key as typeof tab)}
              >
                {t.label}
              </GlassButton>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <GlassSelect
              value={periodMode}
              onChange={(e) => handlePeriodChange(e.target.value as PeriodMode)}
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
                { value: "annual", label: "Annual" },
                { value: "custom", label: "Custom Range" },
              ]}
              className="h-8 w-36 text-xs"
            />
            {periodMode === "custom" && (
              <>
                <GlassInput
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 w-36 text-xs"
                />
                <GlassInput
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 w-36 text-xs"
                />
              </>
            )}
          </div>
        </div>
      </GlassCard>

      {tab === "dashboard" && (
        <div className="space-y-5">
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Net Revenue" value={formatCurrency(kpis.revenue)} />
            <KpiCard label="Approved Expenses" value={formatCurrency(kpis.expenses)} />
            <KpiCard label="Gross Profit" value={formatCurrency(kpis.grossProfit)} hint={`Margin: ${pnl?.grossMarginPct ?? 0}%`} />
            <KpiCard label="Net Profit" value={formatCurrency(kpis.netProfit)} hint={`Margin: ${pnl?.netMarginPct ?? 0}%`} />
            <KpiCard label="Closing Cash Balance" value={formatCurrency(kpis.cashBalance)} />
            <KpiCard label="Outstanding Payments" value={formatCurrency(kpis.outstandingPayments)} />
            <KpiCard label="Import Costs Logged" value={formatCurrency(kpis.importCosts)} />
            <KpiCard label="Marketing Spend" value={formatCurrency(kpis.marketingSpend)} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Revenue vs COGS vs Net Profit" loading={loading}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Net Sales", value: pnl?.netSales ?? 0 },
                    { name: "COGS", value: pnl?.cogs ?? 0 },
                    { name: "Expenses", value: pnl?.totalExpenses ?? 0 },
                    { name: "Net Profit", value: pnl?.netProfit ?? 0 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--aurora-chart-grid)" />
                  <XAxis dataKey="name" stroke="var(--aurora-text-muted)" fontSize={11} />
                  <YAxis stroke="var(--aurora-text-muted)" fontSize={11} tickFormatter={(v) => formatCompactNumber(Number(v))} />
                  <Tooltip content={<GlassChartTooltip valueFormatter={(v) => formatCurrency(v)} />} />
                  <Bar dataKey="value" name="Amount" fill="var(--aurora-chart-1)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Cash Receipts vs Inventory Purchases (Accounting Separation)" loading={loading}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Earned Revenue", value: pnl?.netSales ?? 0 },
                    { name: "Cash Receipts", value: pnl?.cashReceipts ?? 0 },
                    { name: "Inventory Purchases", value: pnl?.inventoryPurchases ?? 0 },
                    { name: "COGS", value: pnl?.cogs ?? 0 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--aurora-chart-grid)" />
                  <XAxis dataKey="name" stroke="var(--aurora-text-muted)" fontSize={11} />
                  <YAxis stroke="var(--aurora-text-muted)" fontSize={11} tickFormatter={(v) => formatCompactNumber(Number(v))} />
                  <Tooltip content={<GlassChartTooltip valueFormatter={(v) => formatCurrency(v)} />} />
                  <Bar dataKey="value" name="Amount" fill="var(--aurora-chart-2)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {tab === "pnl" && pnl && (
        <GlassCard>
          <GlassCardHeader>
            <div>
              <GlassCardTitle>Profit &amp; Loss Statement</GlassCardTitle>
              <GlassCardDescription>
                Net Sales = Gross Sales − Returns | Gross Profit = Net Sales − COGS | Net Profit = Gross Profit − Expenses
              </GlassCardDescription>
            </div>
            <div className="flex gap-2">
              <GlassButton size="sm" variant="secondary" onClick={exportPnlPdf}>
                <Download className="h-3.5 w-3.5" />
                PDF
              </GlassButton>
              <GlassButton
                size="sm"
                variant="secondary"
                onClick={() => exportRowsToExcel("aurora-pnl.xlsx", "ProfitAndLoss", pnlRows)}
              >
                <Download className="h-3.5 w-3.5" />
                Excel
              </GlassButton>
            </div>
          </GlassCardHeader>
          <GlassCardContent className="space-y-2">
            {pnlRows.map((row) => (
              <div
                key={row.line}
                className={`flex items-center justify-between rounded-2xl px-4 py-2.5 text-sm ${
                  ["Net Sales", "Gross Profit", "Net Profit"].includes(row.line)
                    ? "aurora-glass-elevated font-bold text-[var(--aurora-text-strong)]"
                    : "aurora-glass-subtle text-[var(--aurora-text)]"
                }`}
              >
                <span>{row.line}</span>
                <span>{formatCurrency(row.amount)}</span>
              </div>
            ))}
            <div className="mt-3 grid gap-3 sm:grid-cols-4 text-xs">
              <div className="aurora-glass-subtle rounded-2xl p-3">Gross Margin: <strong>{pnl.grossMarginPct}%</strong></div>
              <div className="aurora-glass-subtle rounded-2xl p-3">Net Margin: <strong>{pnl.netMarginPct}%</strong></div>
              <div className="aurora-glass-subtle rounded-2xl p-3">Cash Receipts (Non-P&amp;L): <strong>{formatCurrency(pnl.cashReceipts)}</strong></div>
              <div className="aurora-glass-subtle rounded-2xl p-3">Inventory Purchases (Asset): <strong>{formatCurrency(pnl.inventoryPurchases)}</strong></div>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {tab === "cashflow" && cashFlow && (
        <div className="space-y-5">
          <GlassCard>
            <GlassCardHeader>
              <div>
                <GlassCardTitle>Cash Flow Statement</GlassCardTitle>
                <GlassCardDescription>
                  Derived strictly from recorded financial_transactions across Cash, Bank, and MFS accounts.
                </GlassCardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <GlassSelect
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  options={[
                    { value: "", label: "All Accounts" },
                    ...accounts.map((a) => ({
                      value: a.id,
                      label: `${a.account_name} (${a.account_type.toUpperCase()})`,
                    })),
                  ]}
                  className="h-8 w-48 text-xs"
                />
                <GlassButton
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    exportRowsToExcel("aurora-cashflow.xlsx", "CashFlow", transactions)
                  }
                >
                  <Download className="h-3.5 w-3.5" />
                  Excel
                </GlassButton>
              </div>
            </GlassCardHeader>
            <GlassCardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
              <div className="aurora-glass-subtle rounded-2xl p-3.5 space-y-1.5">
                <div className="font-semibold text-[var(--aurora-text-strong)]">Balances</div>
                <div className="flex justify-between"><span>Opening Balance</span><strong>{formatCurrency(cashFlow.openingCashBalance)}</strong></div>
                <div className="flex justify-between"><span>Net Cash Movement</span><strong>{formatCurrency(cashFlow.netCashMovement)}</strong></div>
                <div className="flex justify-between text-sm text-[var(--aurora-text-strong)] pt-1 border-t border-[var(--aurora-glass-border)]"><span>Closing Balance</span><strong>{formatCurrency(cashFlow.closingCashBalance)}</strong></div>
              </div>
              <div className="aurora-glass-subtle rounded-2xl p-3.5 space-y-1.5">
                <div className="font-semibold text-[var(--aurora-text-strong)]">Cash Inflows</div>
                <div className="flex justify-between"><span>Sales Receipts</span><span>{formatCurrency(cashFlow.salesReceipts)}</span></div>
                <div className="flex justify-between"><span>Customer Payments</span><span>{formatCurrency(cashFlow.customerPayments)}</span></div>
                <div className="flex justify-between"><span>Other Inflows</span><span>{formatCurrency(cashFlow.otherInflows)}</span></div>
                <div className="flex justify-between font-semibold pt-1 border-t border-[var(--aurora-glass-border)]"><span>Total Inflows</span><span>{formatCurrency(cashFlow.totalInflows)}</span></div>
              </div>
              <div className="aurora-glass-subtle rounded-2xl p-3.5 space-y-1.5">
                <div className="font-semibold text-[var(--aurora-text-strong)]">Cash Outflows</div>
                <div className="flex justify-between"><span>Supplier &amp; Inventory</span><span>{formatCurrency(cashFlow.supplierPayments + cashFlow.inventoryPurchases)}</span></div>
                <div className="flex justify-between"><span>Freight &amp; Customs</span><span>{formatCurrency(cashFlow.freightPayments + cashFlow.customsPayments)}</span></div>
                <div className="flex justify-between"><span>Marketing &amp; Operating</span><span>{formatCurrency(cashFlow.marketingPayments + cashFlow.operatingExpenses)}</span></div>
                <div className="flex justify-between"><span>Refunds &amp; Other</span><span>{formatCurrency(cashFlow.refunds + cashFlow.otherOutflows)}</span></div>
                <div className="flex justify-between font-semibold pt-1 border-t border-[var(--aurora-glass-border)]"><span>Total Outflows</span><span>{formatCurrency(cashFlow.totalOutflows)}</span></div>
              </div>
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle>Recorded Cash Ledger</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <DataTable columns={txColumns} data={transactions} loading={loading} searchPlaceholder="Search cash transactions..." />
            </GlassCardContent>
          </GlassCard>
        </div>
      )}

      {tab === "breakeven" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <GlassCard>
            <GlassCardHeader>
              <div>
                <GlassCardTitle>Break-even Scenario Controls</GlassCardTitle>
                <GlassCardDescription>Adjust costs, pricing, and expected monthly volume</GlassCardDescription>
              </div>
              <Scale className="h-4 w-4 text-[var(--aurora-accent)]" />
            </GlassCardHeader>
            <GlassCardContent className="space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Monthly Fixed Costs">
                  <GlassInput type="number" min={0} value={fixedCosts} onChange={(e) => setFixedCosts(Number(e.target.value) || 0)} />
                </FormField>
                <FormField label="Variable Cost / Unit">
                  <GlassInput type="number" min={0} value={variableCost} onChange={(e) => setVariableCost(Number(e.target.value) || 0)} />
                </FormField>
                <FormField label="Selling Price / Unit">
                  <GlassInput type="number" min={0} value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value) || 0)} />
                </FormField>
                <FormField label="Expected Monthly Volume (Units)">
                  <GlassInput type="number" min={0} value={expectedVolume} onChange={(e) => setExpectedVolume(Number(e.target.value) || 0)} />
                </FormField>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 text-xs pt-2">
                <div className="aurora-glass-subtle rounded-2xl p-3">Contribution / Unit: <strong>{formatCurrency(breakEven.contributionPerUnit)}</strong></div>
                <div className="aurora-glass-subtle rounded-2xl p-3">Contribution Margin: <strong>{breakEven.contributionMarginPct}%</strong></div>
                <div className="aurora-glass-subtle rounded-2xl p-3">Break-even Units: <strong>{breakEven.breakEvenUnits ?? "Unprofitable"}</strong></div>
                <div className="aurora-glass-subtle rounded-2xl p-3">Break-even Revenue: <strong>{breakEven.breakEvenRevenue != null ? formatCurrency(breakEven.breakEvenRevenue) : "N/A"}</strong></div>
                <div className="aurora-glass-subtle rounded-2xl p-3">Required Daily Sales: <strong>{breakEven.requiredDailySales ?? "N/A"} units/day</strong></div>
                <div className="aurora-glass-subtle rounded-2xl p-3">
                  {breakEven.expectedProfit > 0
                    ? <>Expected Profit: <strong className="text-[var(--aurora-success)]">{formatCurrency(breakEven.expectedProfit)}</strong></>
                    : <>Expected Loss: <strong className="text-[var(--aurora-danger)]">{formatCurrency(breakEven.expectedLoss)}</strong></>}
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>

          <ChartCard title="Break-even Crossover Curve" subtitle="Revenue vs Total Cost across unit volume">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={breakEvenChartData}>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--aurora-chart-grid)" />
                <XAxis dataKey="units" stroke="var(--aurora-text-muted)" fontSize={11} />
                <YAxis stroke="var(--aurora-text-muted)" fontSize={11} tickFormatter={(v) => formatCompactNumber(Number(v))} />
                <Tooltip content={<GlassChartTooltip valueFormatter={(v) => formatCurrency(v)} />} />
                <Line type="monotone" dataKey="revenue" name="Total Revenue" stroke="var(--aurora-chart-2)" strokeWidth={2.4} />
                <Line type="monotone" dataKey="totalCost" name="Total Cost" stroke="var(--aurora-chart-3)" strokeWidth={2.2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Add Financial Account Modal */}
      <GlassDialog open={acctOpen} onOpenChange={setAcctOpen} title="Add Financial Account">
        <form onSubmit={handleCreateAccount} className="space-y-3.5">
          <FormField label="Account Name" required>
            <GlassInput value={acctName} onChange={(e) => setAcctName(e.target.value)} placeholder="e.g. City Bank Business A/C or bKash Merchant" required />
          </FormField>
          <FormField label="Account Type">
            <GlassSelect
              value={acctType}
              onChange={(e) => setAcctType(e.target.value as "cash" | "bank" | "mfs")}
              options={[
                { value: "cash", label: "Cash" },
                { value: "bank", label: "Bank Account" },
                { value: "mfs", label: "Mobile Financial Service (bKash/Nagad)" },
              ]}
            />
          </FormField>
          <FormField label="Institution">
            <GlassInput value={acctInst} onChange={(e) => setAcctInst(e.target.value)} />
          </FormField>
          <FormField label="Opening Balance">
            <GlassInput type="number" value={acctOpenBal} onChange={(e) => setAcctOpenBal(Number(e.target.value))} />
          </FormField>
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setAcctOpen(false)}>Cancel</GlassButton>
            <GlassButton type="submit" variant="primary" size="sm" loading={saving}>Save Account</GlassButton>
          </div>
        </form>
      </GlassDialog>

      {/* Record Cash Transaction Modal */}
      <GlassDialog open={txOpen} onOpenChange={setTxOpen} title="Record Cash Flow Transaction">
        <form onSubmit={handleCreateTx} className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Direction">
              <GlassSelect
                value={txDirection}
                onChange={(e) => setTxDirection(e.target.value as "inflow" | "outflow")}
                options={[
                  { value: "inflow", label: "Cash Inflow" },
                  { value: "outflow", label: "Cash Outflow" },
                ]}
              />
            </FormField>
            <FormField label="Category">
              <GlassSelect
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value)}
                options={[
                  { value: "sales_receipt", label: "Sales Receipt" },
                  { value: "customer_payment", label: "Customer Payment" },
                  { value: "other_inflow", label: "Other Inflow" },
                  { value: "supplier_payment", label: "Supplier Payment" },
                  { value: "inventory_purchase", label: "Inventory Purchase" },
                  { value: "freight_payment", label: "Freight Payment" },
                  { value: "customs_payment", label: "Customs Payment" },
                  { value: "marketing_payment", label: "Marketing Payment" },
                  { value: "operating_expense", label: "Operating Expense" },
                  { value: "sales_refund", label: "Refund" },
                  { value: "other_outflow", label: "Other Outflow" },
                ]}
              />
            </FormField>
            <FormField label="Account">
              <GlassSelect
                value={txAccountId}
                onChange={(e) => setTxAccountId(e.target.value)}
                options={accounts.map((a) => ({ value: a.id, label: a.account_name }))}
              />
            </FormField>
            <FormField label="Amount" required>
              <GlassInput type="number" min={1} value={txAmount} onChange={(e) => setTxAmount(Number(e.target.value))} required />
            </FormField>
            <FormField label="Date">
              <GlassInput type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
            </FormField>
            <FormField label="Method">
              <GlassInput value={txMethod} onChange={(e) => setTxMethod(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Description">
            <GlassInput value={txDesc} onChange={(e) => setTxDesc(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setTxOpen(false)}>Cancel</GlassButton>
            <GlassButton type="submit" variant="primary" size="sm" loading={saving}>Record Transaction</GlassButton>
          </div>
        </form>
      </GlassDialog>
    </div>
  );
}

export default function FinancePage() {
  return (
    <BackendConnectionGuard moduleTitle="Financial Management">
      <FinanceWorkspace />
    </BackendConnectionGuard>
  );
}

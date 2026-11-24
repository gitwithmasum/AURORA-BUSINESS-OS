"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Sliders, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/format";
import { BackendConnectionGuard } from "@/components/operations/BackendConnectionGuard";
import {
  ChartCard,
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
  GlassSwitch,
  KpiCard,
  PageHeader,
  useToast,
} from "@/components/ui";

interface AnalyticsPayload {
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
      adSpend: number;
      adRevenue: number;
      adContribution: number;
    };
    trends: {
      month: string;
      revenue: number;
      grossProfit: number;
      netProfit: number;
      expenses: number;
      purchases: number;
      cashInflow: number;
      cashOutflow: number;
    }[];
    expenseAnalysis: { name: string; value: number }[];
    supplierPerformance: {
      id: string;
      name: string;
      leadTimeDays: number;
      rating: number;
      verificationStatus: string;
      purchaseReceipts: number;
      totalSpend: number;
    }[];
    customerGrowth: { month: string; newCustomers: number }[];
  };
  monthly: {
    current: {
      month: string;
      revenue: number;
      expenses: number;
      grossProfit: number;
      netProfit: number;
      orders: number;
      customers: number;
      inventoryPurchases: number;
      marketingSpend: number;
      cashInflow: number;
      cashOutflow: number;
      bestSellingBrand: string;
      bestSellingProduct: string;
    };
    momDeltas: {
      revenuePct: number;
      expensesPct: number;
      grossProfitPct: number;
      netProfitPct: number;
      ordersPct: number;
    };
  };
  stockAlerts: {
    productId: string;
    sku: string;
    name: string;
    onHand: number;
    minStock: number;
    unitsSoldWindow: number;
    avgDailyDemand: number;
    suggestedReorderQty: number;
    conditions: string[];
    earliestExpiry: string | null;
  }[];
  alertConfig: {
    overstockMultiplier: number;
    fastMovingWindowDays: number;
    fastMovingMinUnits: number;
    slowMovingWindowDays: number;
    expiryWarningDays: number;
    defaultLeadTimeDays: number;
    safetyStockDays: number;
  };
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
    mostProfitablePerfumes: { name: string; brand: string; profit: number; unitsSold: number }[];
    highestRevenueProducts: { name: string; brand: string; revenue: number }[];
    repeatPurchaseProducts: { name: string; orderCount: number; repeatCustomerCount: number }[];
    bestSellingBrands: { name: string; units: number; revenue: number }[];
    bestSellingVolumes: { name: string; units: number; revenue: number }[];
    fragranceFamilies: { name: string; units: number; revenue: number }[];
    customerPreferences: {
      topConcentrations: { name: string; units: number }[];
      topChannels: { channel: string; units: number }[];
    };
    slowMovingPerfumes: { sku: string; name: string; brand: string }[];
    seasonalTrends: { month: string; units: number; revenue: number }[];
  };
  dimensions: {
    categories: { id: string; name: string }[];
    brands: { id: string; name: string }[];
    products: { id: string; name: string; sku: string }[];
    suppliers: { id: string; name: string }[];
  };
}

function AnalyticsWorkspace() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = React.useState<"overview" | "monthly" | "alerts" | "perfume">("overview");
  const [data, setData] = React.useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [brandId, setBrandId] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [supplierId, setSupplierId] = React.useState("");
  const [channel, setChannel] = React.useState("");
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0, 7));

  const [thresholdModal, setThresholdModal] = React.useState(false);
  const [overstockMult, setOverstockMult] = React.useState(5);
  const [fastWindow, setFastWindow] = React.useState(30);
  const [fastMinUnits, setFastMinUnits] = React.useState(20);
  const [slowWindow, setSlowWindow] = React.useState(60);
  const [expiryDays, setExpiryDays] = React.useState(45);
  const [leadDays, setLeadDays] = React.useState(14);
  const [safetyDays, setSafetyDays] = React.useState(7);
  const [emailAlerts, setEmailAlerts] = React.useState(false);

  const loadAnalytics = React.useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        organizationId: activeOrg.organizationId,
        month,
      });
      if (startDate) qs.set("startDate", startDate);
      if (endDate) qs.set("endDate", endDate);
      if (categoryId) qs.set("categoryId", categoryId);
      if (brandId) qs.set("brandId", brandId);
      if (productId) qs.set("productId", productId);
      if (supplierId) qs.set("supplierId", supplierId);
      if (channel) qs.set("channel", channel);

      const res = await fetch(`/api/analytics?${qs.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
        const c = json.alertConfig;
        if (c) {
          setOverstockMult(c.overstockMultiplier);
          setFastWindow(c.fastMovingWindowDays);
          setFastMinUnits(c.fastMovingMinUnits);
          setSlowWindow(c.slowMovingWindowDays);
          setExpiryDays(c.expiryWarningDays);
          setLeadDays(c.defaultLeadTimeDays);
          setSafetyDays(c.safetyStockDays);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [activeOrg, month, startDate, endDate, categoryId, brandId, productId, supplierId, channel]);

  React.useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    const res = await fetch("/api/analytics", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: activeOrg.organizationId,
        overstockMultiplier: overstockMult,
        fastMovingWindowDays: fastWindow,
        fastMovingMinUnits: fastMinUnits,
        slowMovingWindowDays: slowWindow,
        expiryWarningDays: expiryDays,
        defaultLeadTimeDays: leadDays,
        safetyStockDays: safetyDays,
        emailAlertsEnabled: emailAlerts,
      }),
    });
    if (res.ok) {
      toast({ title: "Stock alert thresholds saved", tone: "success" });
      setThresholdModal(false);
      await loadAnalytics();
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Business Intelligence, Stock Alerts & Perfume Analytics"
        subtitle="Real-time metrics computed exclusively from authorized PostgreSQL records."
        actions={
          <GlassButton variant="secondary" size="sm" onClick={() => setThresholdModal(true)}>
            <Sliders className="h-3.5 w-3.5" />
            Alert Thresholds
          </GlassButton>
        }
      />

      <GlassCard padding="sm">
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: "overview", label: "Advanced Analytics" },
            { key: "monthly", label: "Monthly Business Dashboard" },
            { key: "alerts", label: `Stock Alerts (${data?.stockAlerts.length ?? 0})` },
            { key: "perfume", label: "Best-Selling Perfume Analysis" },
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
      </GlassCard>

      {tab === "overview" && data && (
        <div className="space-y-5">
          <GlassCard padding="sm">
            <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-7">
              <GlassInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs" />
              <GlassInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-xs" />
              <GlassSelect
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                options={[
                  { value: "", label: "All Categories" },
                  ...data.dimensions.categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                className="h-8 text-xs"
              />
              <GlassSelect
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                options={[
                  { value: "", label: "All Brands" },
                  ...data.dimensions.brands.map((b) => ({ value: b.id, label: b.name })),
                ]}
                className="h-8 text-xs"
              />
              <GlassSelect
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                options={[
                  { value: "", label: "All Products" },
                  ...data.dimensions.products.map((p) => ({ value: p.id, label: p.name })),
                ]}
                className="h-8 text-xs"
              />
              <GlassSelect
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                options={[
                  { value: "", label: "All Suppliers" },
                  ...data.dimensions.suppliers.map((s) => ({ value: s.id, label: s.name })),
                ]}
                className="h-8 text-xs"
              />
              <GlassSelect
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                options={[
                  { value: "", label: "All Channels" },
                  { value: "Showroom", label: "Showroom" },
                  { value: "Facebook Shop", label: "Facebook Shop" },
                  { value: "Website", label: "Website" },
                  { value: "WhatsApp", label: "WhatsApp" },
                ]}
                className="h-8 text-xs"
              />
            </div>
          </GlassCard>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Net Revenue" value={formatCurrency(data.analytics.summary.totalRevenue)} />
            <KpiCard label="Net Profit" value={formatCurrency(data.analytics.summary.netProfit)} />
            <KpiCard label="Stock Valuation" value={formatCurrency(data.analytics.summary.stockValuation)} />
            <KpiCard label="Inventory Turnover" value={`${data.analytics.summary.inventoryTurnover}x`} hint={`Sales Growth: ${data.analytics.summary.salesGrowthPct}%`} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Revenue, Profit & Expense Trends" loading={loading}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.analytics.trends}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--aurora-chart-grid)" />
                  <XAxis dataKey="month" stroke="var(--aurora-text-muted)" fontSize={11} />
                  <YAxis stroke="var(--aurora-text-muted)" fontSize={11} tickFormatter={(v) => formatCompactNumber(Number(v))} />
                  <Tooltip content={<GlassChartTooltip valueFormatter={(v) => formatCurrency(v)} />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--aurora-chart-1)" fillOpacity={0.2} fill="var(--aurora-chart-1)" />
                  <Area type="monotone" dataKey="netProfit" name="Net Profit" stroke="var(--aurora-chart-2)" fillOpacity={0.2} fill="var(--aurora-chart-2)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Cash Flow & Purchase Trends" loading={loading}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.analytics.trends}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--aurora-chart-grid)" />
                  <XAxis dataKey="month" stroke="var(--aurora-text-muted)" fontSize={11} />
                  <YAxis stroke="var(--aurora-text-muted)" fontSize={11} tickFormatter={(v) => formatCompactNumber(Number(v))} />
                  <Tooltip content={<GlassChartTooltip valueFormatter={(v) => formatCurrency(v)} />} />
                  <Bar dataKey="cashInflow" name="Cash Inflow" fill="var(--aurora-chart-2)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="cashOutflow" name="Cash Outflow" fill="var(--aurora-chart-3)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="purchases" name="Purchases" fill="var(--aurora-chart-4)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {tab === "monthly" && data && (
        <div className="space-y-4">
          <GlassCard padding="sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-[var(--aurora-text-strong)]">
                Monthly Performance vs Previous Month
              </span>
              <GlassInput
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-8 w-44 text-xs"
              />
            </div>
          </GlassCard>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Monthly Revenue" value={formatCurrency(data.monthly.current.revenue)} delta={`${data.monthly.momDeltas.revenuePct}% MoM`} trend={data.monthly.momDeltas.revenuePct >= 0 ? "up" : "down"} />
            <KpiCard label="Monthly Expenses" value={formatCurrency(data.monthly.current.expenses)} delta={`${data.monthly.momDeltas.expensesPct}% MoM`} />
            <KpiCard label="Monthly Gross Profit" value={formatCurrency(data.monthly.current.grossProfit)} delta={`${data.monthly.momDeltas.grossProfitPct}% MoM`} trend={data.monthly.momDeltas.grossProfitPct >= 0 ? "up" : "down"} />
            <KpiCard label="Monthly Net Profit" value={formatCurrency(data.monthly.current.netProfit)} delta={`${data.monthly.momDeltas.netProfitPct}% MoM`} trend={data.monthly.momDeltas.netProfitPct >= 0 ? "up" : "down"} />
            <KpiCard label="Orders" value={String(data.monthly.current.orders)} delta={`${data.monthly.momDeltas.ordersPct}% MoM`} />
            <KpiCard label="Active Customers" value={String(data.monthly.current.customers)} />
            <KpiCard label="Inventory Purchases" value={formatCurrency(data.monthly.current.inventoryPurchases)} />
            <KpiCard label="Marketing Spend" value={formatCurrency(data.monthly.current.marketingSpend)} />
            <KpiCard label="Cash Inflow" value={formatCurrency(data.monthly.current.cashInflow)} />
            <KpiCard label="Cash Outflow" value={formatCurrency(data.monthly.current.cashOutflow)} />
            <KpiCard label="Best-Selling Brand" value={data.monthly.current.bestSellingBrand} />
            <KpiCard label="Best-Selling Product" value={data.monthly.current.bestSellingProduct} />
          </div>
        </div>
      )}

      {tab === "alerts" && data && (
        <GlassCard>
          <GlassCardHeader>
            <div>
              <GlassCardTitle>Intelligent Stock Alert System</GlassCardTitle>
              <GlassCardDescription>
                Lead time: {data.alertConfig.defaultLeadTimeDays}d · Safety stock: {data.alertConfig.safetyStockDays}d · Slow window: {data.alertConfig.slowMovingWindowDays}d
              </GlassCardDescription>
            </div>
          </GlassCardHeader>
          <GlassCardContent className="space-y-2.5">
            {data.stockAlerts.length === 0 ? (
              <div className="aurora-glass-subtle rounded-2xl p-6 text-center text-xs text-[var(--aurora-text-muted)]">
                No stock alert conditions triggered for current products &amp; inventory.
              </div>
            ) : (
              data.stockAlerts.map((a) => (
                <div key={a.productId} className="aurora-glass-subtle flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5 text-xs">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-[var(--aurora-text-strong)]">
                      <AlertTriangle className="h-3.5 w-3.5 text-[var(--aurora-warning)]" />
                      {a.name} ({a.sku})
                    </div>
                    <div className="mt-1 text-[var(--aurora-text-muted)]">
                      On Hand: <strong>{a.onHand}</strong> · Min: {a.minStock} · Daily Demand: {a.avgDailyDemand}/day
                      {a.earliestExpiry && ` · Expiry: ${a.earliestExpiry}`}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {a.conditions.map((c) => (
                      <GlassBadge key={c} tone={c === "out_of_stock" ? "danger" : c === "fast_moving" ? "success" : "warning"}>
                        {c.replace("_", " ")}
                      </GlassBadge>
                    ))}
                    {a.suggestedReorderQty > 0 && (
                      <GlassBadge tone="accent">Suggest +{a.suggestedReorderQty}</GlassBadge>
                    )}
                  </div>
                </div>
              ))
            )}
          </GlassCardContent>
        </GlassCard>
      )}

      {tab === "perfume" && data && (
        <div className="grid gap-5 lg:grid-cols-2">
          <GlassCard>
            <GlassCardHeader>
              <div>
                <GlassCardTitle>Best-Selling &amp; Most Profitable Perfumes</GlassCardTitle>
                <GlassCardDescription>Ranked strictly from recorded completed sales</GlassCardDescription>
              </div>
              <Sparkles className="h-4 w-4 text-[var(--aurora-accent)]" />
            </GlassCardHeader>
            <GlassCardContent className="space-y-2 text-xs">
              {data.perfume.bestSellingPerfumes.length === 0 ? (
                <p className="text-[var(--aurora-text-muted)]">No completed perfume sales recorded yet.</p>
              ) : (
                data.perfume.bestSellingPerfumes.slice(0, 8).map((p) => (
                  <div key={p.productId} className="aurora-glass-subtle flex justify-between rounded-xl px-3 py-2">
                    <span><strong>{p.name}</strong> · {p.brand} ({p.volumeMl})</span>
                    <span>{p.unitsSold} sold · Profit {formatCurrency(p.profit)}</span>
                  </div>
                ))
              )}
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle>Brands, Volumes, Fragrance Families &amp; Preferences</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-3 text-xs">
              <div>
                <div className="mb-1 font-semibold text-[var(--aurora-text-strong)]">Top Brands</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.perfume.bestSellingBrands.slice(0, 6).map((b) => (
                    <GlassBadge key={b.name} tone="info">{b.name}: {b.units}</GlassBadge>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 font-semibold text-[var(--aurora-text-strong)]">Best-Selling Volumes</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.perfume.bestSellingVolumes.map((v) => (
                    <GlassBadge key={v.name} tone="accent">{v.name}: {v.units}</GlassBadge>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 font-semibold text-[var(--aurora-text-strong)]">Fragrance Families</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.perfume.fragranceFamilies.map((f) => (
                    <GlassBadge key={f.name} tone="success">{f.name}: {f.units}</GlassBadge>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 font-semibold text-[var(--aurora-text-strong)]">Slow-Moving Catalog ({data.perfume.slowMovingPerfumes.length})</div>
                <div className="text-[var(--aurora-text-muted)]">
                  {data.perfume.slowMovingPerfumes.slice(0, 5).map((s) => s.name).join(", ") || "None"}
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>
      )}

      <GlassDialog open={thresholdModal} onOpenChange={setThresholdModal} title="Configure Stock Alert Thresholds">
        <form onSubmit={handleSaveThresholds} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Overstock Multiplier (× Min Stock)">
              <GlassInput type="number" step="0.5" min={1} value={overstockMult} onChange={(e) => setOverstockMult(Number(e.target.value))} />
            </FormField>
            <FormField label="Fast-Moving Window (Days)">
              <GlassInput type="number" min={1} value={fastWindow} onChange={(e) => setFastWindow(Number(e.target.value))} />
            </FormField>
            <FormField label="Fast-Moving Min Units">
              <GlassInput type="number" min={1} value={fastMinUnits} onChange={(e) => setFastMinUnits(Number(e.target.value))} />
            </FormField>
            <FormField label="Slow-Moving Window (Days)">
              <GlassInput type="number" min={1} value={slowWindow} onChange={(e) => setSlowWindow(Number(e.target.value))} />
            </FormField>
            <FormField label="Expiry Warning (Days)">
              <GlassInput type="number" min={1} value={expiryDays} onChange={(e) => setExpiryDays(Number(e.target.value))} />
            </FormField>
            <FormField label="Lead Time + Safety Days">
              <div className="flex gap-2">
                <GlassInput type="number" min={1} value={leadDays} onChange={(e) => setLeadDays(Number(e.target.value))} />
                <GlassInput type="number" min={0} value={safetyDays} onChange={(e) => setSafetyDays(Number(e.target.value))} />
              </div>
            </FormField>
          </div>
          <GlassSwitch checked={emailAlerts} onCheckedChange={setEmailAlerts} label="Enable Email Notifications (when email integration is active)" />
          <div className="flex justify-end gap-2 pt-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setThresholdModal(false)}>Cancel</GlassButton>
            <GlassButton type="submit" variant="primary" size="sm">Save Thresholds</GlassButton>
          </div>
        </form>
      </GlassDialog>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <BackendConnectionGuard moduleTitle="Advanced Business Analytics">
      <AnalyticsWorkspace />
    </BackendConnectionGuard>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  Calendar,
  Eye,
  LayoutGrid,
  Minimize2,
  Maximize2,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import {
  CATEGORY_FILTER_OPTIONS,
  DATE_RANGE_OPTIONS,
  DEFAULT_WIDGET_LAYOUT,
  getFilteredExecutiveSnapshot,
} from "@/data/demo/executive-dashboard";
import type {
  CategoryFilterKey,
  DashboardWidgetConfig,
  DateRangeKey,
  DemoPerfumeOrder,
  DensityMode,
  WidgetId,
} from "@/types/dashboard";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  buildLiveExecutiveSnapshot,
  resolveDateWindow,
  type LiveAnalyticsPayload,
  type LiveSalesPayload,
} from "@/lib/dashboard/live-adapter";
import { formatCategoryLabel, formatCurrency } from "@/lib/utils/format";
import {
  ConfirmDialog,
  DataTable,
  Drawer,
  FilterDropdown,
  FormField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
  GlassInput,
  PageHeader,
  useToast,
} from "@/components/ui";
import { KpiGrid } from "./KpiGrid";
import {
  CashFlowAndCustomerChart,
  CategoryBrandChart,
  ExpenseBreakdownChart,
  RevenueProfitChart,
  SalesPerformanceChart,
} from "./DashboardCharts";
import { CustomizeWidgetsModal } from "./CustomizeWidgetsModal";

const LAYOUT_STORAGE_KEY = "aurora_os_dashboard_widgets_v1";
const DENSITY_STORAGE_KEY = "aurora_os_dashboard_density_v1";

export function ExecutiveDashboard() {
  const router = useRouter();
  const { user, activeOrg } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  const isLiveMode = Boolean(user && activeOrg);
  const activeCurrency = (
    isLiveMode &&
    (activeOrg?.currency === "BDT" ||
      activeOrg?.currency === "SAR" ||
      activeOrg?.currency === "USD")
      ? activeOrg.currency
      : activeWorkspace.currency
  ) as "BDT" | "SAR" | "USD";

  const [dateRange, setDateRange] = React.useState<DateRangeKey>("last_30_days");
  const [customDays, setCustomDays] = React.useState<number>(14);
  const [category, setCategory] = React.useState<CategoryFilterKey>("all");
  const [liveCategoryId, setLiveCategoryId] = React.useState<string>("all");
  const [liveAnalytics, setLiveAnalytics] =
    React.useState<LiveAnalyticsPayload | null>(null);
  const [liveSales, setLiveSales] = React.useState<LiveSalesPayload | null>(null);
  const [liveLoading, setLiveLoading] = React.useState<boolean>(false);
  const [density, setDensity] = React.useState<DensityMode>("expanded");
  const [widgets, setWidgets] = React.useState<DashboardWidgetConfig[]>(
    DEFAULT_WIDGET_LAYOUT
  );
  const [customizeOpen, setCustomizeOpen] = React.useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] =
    React.useState<DemoPerfumeOrder | null>(null);

  React.useEffect(() => {
    try {
      const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (savedLayout) {
        const parsed = JSON.parse(savedLayout) as DashboardWidgetConfig[];
        if (Array.isArray(parsed) && parsed.length === DEFAULT_WIDGET_LAYOUT.length) {
          setWidgets(parsed);
        }
      }
      const savedDensity = localStorage.getItem(DENSITY_STORAGE_KEY) as DensityMode | null;
      if (savedDensity === "compact" || savedDensity === "expanded") {
        setDensity(savedDensity);
      }
    } catch {
      // Ignore malformed storage values
    }
  }, []);

  const persistWidgets = (next: DashboardWidgetConfig[]) => {
    setWidgets(next);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  const toggleDensity = () => {
    const next: DensityMode = density === "expanded" ? "compact" : "expanded";
    setDensity(next);
    try {
      localStorage.setItem(DENSITY_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  };

  const handleToggleWidget = (id: WidgetId) => {
    persistWidgets(
      widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  };

  const handleMoveWidget = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= widgets.length) return;
    const copy = [...widgets];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    persistWidgets(copy);
  };

  const handleResetWidgets = () => {
    persistWidgets(DEFAULT_WIDGET_LAYOUT);
    setConfirmResetOpen(false);
    toast({
      title: "Dashboard layout reset",
      description: "Restored default modular widget arrangement.",
      tone: "info",
    });
  };

  React.useEffect(() => {
    if (!user || !activeOrg) {
      setLiveAnalytics(null);
      setLiveSales(null);
      return;
    }

    let cancelled = false;
    const { startDate, endDate } = resolveDateWindow(dateRange, customDays);
    const analyticsParams = new URLSearchParams({
      organizationId: activeOrg.organizationId,
      startDate,
      endDate,
    });
    if (liveCategoryId !== "all") {
      analyticsParams.set("categoryId", liveCategoryId);
    }

    const salesParams = new URLSearchParams({
      organizationId: activeOrg.organizationId,
      startDate,
      endDate,
    });

    setLiveLoading(true);
    Promise.all([
      fetch(`/api/analytics?${analyticsParams.toString()}`).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch(`/api/sales?${salesParams.toString()}`).then((r) =>
        r.ok ? r.json() : null
      ),
    ])
      .then(([analyticsJson, salesJson]) => {
        if (cancelled) return;
        if (analyticsJson?.analytics) {
          setLiveAnalytics(analyticsJson as LiveAnalyticsPayload);
        }
        if (salesJson?.sales) {
          setLiveSales(salesJson as LiveSalesPayload);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLiveLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, activeOrg, dateRange, customDays, liveCategoryId]);

  const snapshot = React.useMemo(() => {
    if (isLiveMode && liveAnalytics) {
      return buildLiveExecutiveSnapshot({
        analyticsData: liveAnalytics,
        salesData: liveSales,
        currency: activeCurrency,
      });
    }
    return getFilteredExecutiveSnapshot(dateRange, category, customDays);
  }, [
    isLiveMode,
    liveAnalytics,
    liveSales,
    activeCurrency,
    dateRange,
    category,
    customDays,
  ]);

  const orderColumns = React.useMemo<ColumnDef<DemoPerfumeOrder>[]>(
    () => [
      {
        accessorKey: "invoiceNo",
        header: "Invoice",
        cell: ({ row }) => (
          <span className="system-code text-xs font-semibold text-[var(--aurora-accent)]">
            {row.original.invoiceNo}
          </span>
        ),
      },
      {
        accessorKey: "customer",
        header: "Customer",
      },
      {
        accessorKey: "product",
        header: "Product",
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-[var(--aurora-text-strong)]">
              {row.original.product}
            </div>
            <div className="text-[11px] text-[var(--aurora-text-muted)]">
              {row.original.brand}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "channel",
        header: "Channel",
        cell: ({ row }) => (
          <GlassBadge tone="info">{row.original.channel}</GlassBadge>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const st = row.original.status;
          const tone =
            st === "Completed"
              ? "success"
              : st === "Pending"
                ? "warning"
                : "accent";
          return (
            <GlassBadge tone={tone} dot>
              {st}
            </GlassBadge>
          );
        },
      },
      {
        accessorKey: "amountBdt",
        header: "Total",
        cell: ({ row }) => (
          <span className="financial-value font-semibold text-[var(--aurora-text-strong)]">
            {formatCurrency(row.original.amountBdt, activeCurrency)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <GlassButton
            size="sm"
            variant="ghost"
            onClick={() => setSelectedOrder(row.original)}
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </GlassButton>
        ),
      },
    ],
    [activeCurrency]
  );

  const renderWidget = (widget: DashboardWidgetConfig) => {
    if (!widget.visible) return null;

    switch (widget.id) {
      case "kpis":
        return <KpiGrid key={widget.id} kpis={snapshot.kpis} density={density} />;

      case "revenue_profit":
        return (
          <div key={widget.id} className="grid gap-5 xl:grid-cols-2">
            <RevenueProfitChart data={snapshot.revenueTrend} isLive={isLiveMode} />
            <SalesPerformanceChart data={snapshot.salesPerformance} isLive={isLiveMode} />
          </div>
        );

      case "cash_flow":
        return (
          <CashFlowAndCustomerChart
            key={widget.id}
            cashFlow={snapshot.cashFlow}
            customerGrowth={snapshot.customerGrowth}
            isLive={isLiveMode}
          />
        );

      case "expense_breakdown":
        return (
          <ExpenseBreakdownChart
            key={widget.id}
            data={snapshot.expenseBreakdown}
            isLive={isLiveMode}
          />
        );

      case "sales_category_brand":
        return (
          <CategoryBrandChart
            key={widget.id}
            byCategory={snapshot.salesByCategory}
            byBrand={snapshot.salesByBrand}
            isLive={isLiveMode}
          />
        );

      case "top_products":
        return (
          <GlassCard key={widget.id}>
            <GlassCardHeader>
              <div>
                <GlassCardTitle>
                  {isLiveMode
                    ? "Top-Selling Products"
                    : "Top-Selling Perfumes (Demo)"}
                </GlassCardTitle>
                <GlassCardDescription>
                  {isLiveMode
                    ? "Ranked directly from recorded completed sales in your workspace"
                    : "Ranked from illustrative sample records; sign in to connect live data"}
                </GlassCardDescription>
              </div>
              <GlassBadge tone={isLiveMode ? "success" : "accent"}>
                {isLiveMode ? "Live Ranking" : "Sample Catalog"}
              </GlassBadge>
            </GlassCardHeader>
            <GlassCardContent>
              {snapshot.topProducts.length === 0 ? (
                <div className="aurora-glass-subtle flex flex-wrap items-center justify-between gap-3 rounded-[18px] p-4 text-xs text-[var(--aurora-text-muted)]">
                  <span>No completed product sales recorded in this period yet.</span>
                  <Link href="/sales">
                    <GlassButton size="sm" variant="primary">
                      Record First Sale
                    </GlassButton>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {snapshot.topProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="aurora-glass-subtle flex flex-col justify-between rounded-[18px] p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--aurora-accent)]">
                            {prod.brand} · {prod.volumeMl}ml
                          </div>
                          <div className="mt-0.5 text-sm font-semibold text-[var(--aurora-text-strong)]">
                            {prod.name}
                          </div>
                          <div className="text-[11px] text-[var(--aurora-text-muted)]">
                            SKU: {prod.sku}
                          </div>
                        </div>
                        <GlassBadge tone={prod.stockQty <= 8 ? "warning" : "success"}>
                          {prod.stockQty} left
                        </GlassBadge>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-[var(--aurora-glass-border)] pt-2.5 text-xs">
                        <span className="text-[var(--aurora-text-muted)]">
                          {prod.unitsSold} units · {prod.grossMarginPct}% GM
                        </span>
                        <span className="font-semibold text-[var(--aurora-text-strong)]">
                          {formatCurrency(prod.revenueBdt, activeCurrency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        );

      case "recent_orders":
        return (
          <GlassCard key={widget.id}>
            <GlassCardHeader className="mb-4">
              <div>
                <GlassCardTitle>
                  {isLiveMode
                    ? "Recent Sales Orders"
                    : "Recent Sales Orders (Sample Data)"}
                </GlassCardTitle>
                <GlassCardDescription>
                  {isLiveMode
                    ? "Live organization orders — click View to inspect details"
                    : "Interactive TanStack Table preview — click View to inspect sample invoice details"}
                </GlassCardDescription>
              </div>
              <GlassBadge tone={isLiveMode ? "success" : "warning"}>
                {isLiveMode ? "Live Orders" : "Demo Records"}
              </GlassBadge>
            </GlassCardHeader>
            <DataTable
              columns={orderColumns}
              data={snapshot.recentOrders}
              searchPlaceholder={
                isLiveMode
                  ? "Filter orders by customer, invoice, channel..."
                  : "Filter demo orders by customer, brand, channel..."
              }
              pageSize={density === "compact" ? 4 : 5}
            />
          </GlassCard>
        );

      case "stock_alerts":
        return (
          <GlassCard key={widget.id}>
            <GlassCardHeader>
              <div>
                <GlassCardTitle>
                  {isLiveMode ? "Stock Alerts" : "Stock Alert Preview (Demo)"}
                </GlassCardTitle>
                <GlassCardDescription>
                  Configurable reorder alerts based on minimum stock thresholds
                </GlassCardDescription>
              </div>
              <GlassBadge tone={snapshot.stockAlerts.length > 0 ? "warning" : "success"} dot>
                {isLiveMode
                  ? `${snapshot.stockAlerts.length} Active Alerts`
                  : `${snapshot.stockAlerts.length} Demo Alerts`}
              </GlassBadge>
            </GlassCardHeader>
            <GlassCardContent>
              {snapshot.stockAlerts.length === 0 ? (
                <div className="aurora-glass-subtle flex flex-wrap items-center justify-between gap-3 rounded-[18px] p-4 text-xs text-[var(--aurora-text-muted)]">
                  <span>All stocked SKUs are currently above minimum alert thresholds.</span>
                  <Link href="/inventory">
                    <GlassButton size="sm" variant="secondary">
                      Open Inventory
                    </GlassButton>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {snapshot.stockAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="aurora-glass-subtle flex flex-wrap items-center justify-between gap-3 rounded-[18px] p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[var(--aurora-warning)]" />
                          <span className="truncate text-sm font-semibold text-[var(--aurora-text-strong)]">
                            {alert.productName}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-[var(--aurora-text-muted)]">
                          {alert.sku} · On hand:{" "}
                          <strong className="text-[var(--aurora-text-strong)]">
                            {alert.stockQty}
                          </strong>{" "}
                          / Min: {alert.minStock}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <GlassBadge
                          tone={
                            alert.severity === "Out of Stock"
                              ? "danger"
                              : "warning"
                          }
                        >
                          {alert.severity}
                        </GlassBadge>
                        <GlassButton
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (isLiveMode) {
                              router.push("/purchases");
                              return;
                            }
                            toast({
                              title: `Reorder Draft Preview (${alert.sku})`,
                              description: `Suggested quantity: ${alert.suggestedReorder} units.`,
                              tone: "info",
                            });
                          }}
                        >
                          Reorder +{alert.suggestedReorder}
                        </GlassButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {/* Live Organization or Demo Notice Page Header */}
      <PageHeader
        title={isLiveMode ? activeOrg!.organizationName : activeWorkspace.name}
        subtitle={
          isLiveMode
            ? `Real-time executive overview for ${activeOrg!.organizationName} (${activeCurrency})${liveLoading ? " · Syncing..." : ""}`
            : "All figures below are illustrative demo records for UI & analytics verification — sign in to view live organization records."
        }
        leading={
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
              isLiveMode
                ? "bg-[color-mix(in_srgb,var(--aurora-success)_18%,transparent)] text-[var(--aurora-success)]"
                : "bg-[color-mix(in_srgb,var(--aurora-warning)_18%,transparent)] text-[var(--aurora-warning)]"
            }`}
          >
            <Sparkles className="h-4 w-4" />
          </div>
        }
        badges={
          isLiveMode ? (
            <>
              <GlassBadge tone="success" dot>
                LIVE DATABASE
              </GlassBadge>
              <GlassBadge tone="info">
                {formatCategoryLabel(activeOrg!.categorySlug)}
              </GlassBadge>
            </>
          ) : (
            <>
              <GlassBadge tone="warning" dot>
                SAMPLE / DEMO DATA ONLY
              </GlassBadge>
              <GlassBadge tone="info">Preview Mode</GlassBadge>
            </>
          )
        }
        actions={
          <>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={toggleDensity}
            >
              {density === "expanded" ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  Compact View
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  Expanded View
                </>
              )}
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={() => setCustomizeOpen(true)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Customize Widgets
            </GlassButton>
          </>
        }
      />

      {/* Interactive Filter Toolbar */}
      <GlassCard padding="sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--aurora-text-muted)]">
              <Calendar className="h-3.5 w-3.5 text-[var(--aurora-accent)]" />
              Period:
            </span>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <GlassButton
                key={opt.key}
                size="sm"
                variant={dateRange === opt.key ? "primary" : "ghost"}
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => setDateRange(opt.key)}
              >
                {opt.label}
              </GlassButton>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {dateRange === "custom" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--aurora-text-muted)]">
                  Days:
                </span>
                <GlassInput
                  type="number"
                  min={1}
                  max={90}
                  value={customDays}
                  onChange={(e) =>
                    setCustomDays(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="h-8 w-20 text-xs"
                />
              </div>
            )}

            {isLiveMode ? (
              <FilterDropdown
                label="Category"
                value={liveCategoryId}
                icon={<LayoutGrid className="h-3.5 w-3.5" />}
                options={[
                  { value: "all", label: "All Categories" },
                  ...(liveAnalytics?.dimensions.categories ?? []).map((c) => ({
                    value: c.id,
                    label: c.name,
                  })),
                ]}
                onChange={(val) => setLiveCategoryId(val)}
              />
            ) : (
              <FilterDropdown
                label="Category"
                value={category}
                icon={<LayoutGrid className="h-3.5 w-3.5" />}
                options={CATEGORY_FILTER_OPTIONS.map((c) => ({
                  value: c.key,
                  label: c.label,
                }))}
                onChange={(val) => setCategory(val)}
              />
            )}
          </div>
        </div>
      </GlassCard>

      {/* Modular Widgets Rendered in User Order */}
      <div className="space-y-5">
        {widgets.map((widget) => renderWidget(widget))}
      </div>

      {/* Customize Widgets Dialog */}
      <CustomizeWidgetsModal
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        widgets={widgets}
        onToggleVisibility={handleToggleWidget}
        onMoveWidget={handleMoveWidget}
        onReset={() => setConfirmResetOpen(true)}
      />

      {/* Reset Layout Confirmation Dialog */}
      <ConfirmDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title="Reset Dashboard Layout?"
        description="This restores the default modular widget order and shows all hidden dashboard sections."
        confirmLabel="Reset Layout"
        tone="primary"
        onConfirm={handleResetWidgets}
      />

      {/* Order Detail Slide-over Drawer */}
      <Drawer
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        title={
          selectedOrder
            ? `${isLiveMode ? "Order" : "Sample Order"} ${selectedOrder.invoiceNo}`
            : ""
        }
        description={
          isLiveMode
            ? "Recorded sales transaction summary — open Sales or Orders for PDF invoices."
            : "Illustrative demo record — sign in to inspect real organization invoices."
        }
        footer={
          <div className="flex items-center gap-2">
            {isLiveMode && (
              <Link href="/orders">
                <GlassButton variant="secondary" size="sm">
                  Open Orders
                </GlassButton>
              </Link>
            )}
            <GlassButton
              variant="primary"
              size="sm"
              onClick={() => setSelectedOrder(null)}
            >
              Close Preview
            </GlassButton>
          </div>
        }
      >
        {selectedOrder && (
          <div className="space-y-3.5">
            <FormField label={isLiveMode ? "Customer" : "Customer (Sample)"}>
              <div className="aurora-glass-subtle rounded-2xl px-3.5 py-2.5 text-sm text-[var(--aurora-text-strong)]">
                {selectedOrder.customer}
              </div>
            </FormField>
            <FormField label="Order Date">
              <div className="aurora-glass-subtle rounded-2xl px-3.5 py-2.5 text-sm text-[var(--aurora-text-strong)]">
                {selectedOrder.date}
              </div>
            </FormField>
            <FormField label="Product Summary">
              <div className="aurora-glass-subtle rounded-2xl px-3.5 py-2.5 text-sm text-[var(--aurora-text-strong)]">
                {selectedOrder.product} — {selectedOrder.brand}
              </div>
            </FormField>
            <FormField label="Channel & Payment">
              <div className="aurora-glass-subtle rounded-2xl px-3.5 py-2.5 text-sm text-[var(--aurora-text-strong)]">
                {selectedOrder.channel} · {selectedOrder.paymentMethod}
              </div>
            </FormField>
            <FormField label="Order Total">
              <div className="aurora-glass-subtle rounded-2xl px-3.5 py-2.5 text-sm font-bold text-[var(--aurora-text-strong)]">
                {formatCurrency(selectedOrder.amountBdt, activeCurrency)}
              </div>
            </FormField>
          </div>
        )}
      </Drawer>
    </div>
  );
}

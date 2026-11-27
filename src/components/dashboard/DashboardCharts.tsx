"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Plus,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  BreakdownPoint,
  CashFlowPoint,
  CustomerGrowthPoint,
  RevenueTrendPoint,
} from "@/types/dashboard";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/format";
import { ChartCard, GlassButton, GlassChartTooltip } from "@/components/ui";

const CHART_COLORS = [
  "#38bdf8", // Sky
  "#34d399", // Emerald
  "#fbbf24", // Amber
  "#a78bfa", // Violet
  "#f472b6", // Pink
];

export function RevenueProfitChart({
  data,
  isLive = false,
}: {
  data: RevenueTrendPoint[];
  isLive?: boolean;
}) {
  const [mode, setMode] = React.useState<"revenue" | "pnl">("revenue");

  const hasData = Boolean(
    data &&
      data.length > 0 &&
      data.some(
        (d) =>
          Number(d.revenue || 0) > 0 ||
          Number(d.grossProfit || 0) > 0 ||
          Number(d.netProfit || 0) > 0 ||
          Number(d.expenses || 0) > 0
      )
  );

  return (
    <ChartCard
      title={
        mode === "revenue"
          ? isLive
            ? "Revenue Overview"
            : "Revenue Overview (Demo)"
          : isLive
            ? "Profit & Loss Trend"
            : "Profit & Loss Trend (Demo)"
      }
      subtitle={
        mode === "revenue"
          ? "Monthly earned revenue vs gross profit across selected categories"
          : "Gross profit, operating expenses, and net profit progression"
      }
      action={
        <div className="aurora-glass-subtle flex rounded-full p-1">
          <GlassButton
            size="sm"
            variant={mode === "revenue" ? "primary" : "ghost"}
            className="h-7 rounded-full px-3 text-[11px]"
            onClick={() => setMode("revenue")}
          >
            Revenue
          </GlassButton>
          <GlassButton
            size="sm"
            variant={mode === "pnl" ? "primary" : "ghost"}
            className="h-7 rounded-full px-3 text-[11px]"
            onClick={() => setMode("pnl")}
          >
            P&amp;L Trend
          </GlassButton>
        </div>
      }
    >
      {!hasData ? (
        <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--aurora-border)] bg-[rgba(15,23,42,0.35)] p-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--aurora-border)] bg-[var(--aurora-bg-surface)] text-[var(--aurora-accent)] shadow-[0_0_20px_rgba(245,186,75,0.15)]">
            <LineChartIcon className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-[var(--aurora-text-strong)]">
            {isLive ? "No Revenue Recorded Yet" : "No Trend Data Available"}
          </p>
          <p className="mt-1 max-w-sm text-xs text-[var(--aurora-text-muted)]">
            {isLive
              ? "Live revenue, gross profit, and operating curves will automatically plot as soon as you record sales orders."
              : "No historical transactions recorded for this period."}
          </p>
          {isLive && (
            <Link
              href="/sales"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--aurora-accent-border)] bg-[var(--aurora-accent)]/10 px-4 py-1.5 text-xs font-medium text-[var(--aurora-accent)] transition-all hover:bg-[var(--aurora-accent)]/20 hover:shadow-[0_0_15px_rgba(245,186,75,0.25)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Record First Sale
            </Link>
          )}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="auroraRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.42} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="auroraProfitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.42} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255, 255, 255, 0.08)" />
            <XAxis
              dataKey="period"
              stroke="var(--aurora-text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--aurora-text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCompactNumber(Number(v))}
            />
            <Tooltip
              content={
                <GlassChartTooltip
                  valueFormatter={(val) => formatCurrency(val)}
                />
              }
            />
            {mode === "revenue" ? (
              <>
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#38bdf8"
                  strokeWidth={2.4}
                  fill="url(#auroraRevGrad)"
                  dot={{ r: 3.5, strokeWidth: 1.5, fill: "#38bdf8" }}
                  activeDot={{ r: 5.5 }}
                />
                <Area
                  type="monotone"
                  dataKey="grossProfit"
                  name="Gross Profit"
                  stroke="#34d399"
                  strokeWidth={2}
                  fill="url(#auroraProfitGrad)"
                  dot={{ r: 3.5, strokeWidth: 1.5, fill: "#34d399" }}
                  activeDot={{ r: 5.5 }}
                />
              </>
            ) : (
              <>
                <Area
                  type="monotone"
                  dataKey="grossProfit"
                  name="Gross Profit"
                  stroke="#38bdf8"
                  strokeWidth={2.2}
                  fill="url(#auroraRevGrad)"
                  dot={{ r: 3.5, strokeWidth: 1.5, fill: "#38bdf8" }}
                  activeDot={{ r: 5.5 }}
                />
                <Area
                  type="monotone"
                  dataKey="netProfit"
                  name="Net Profit"
                  stroke="#34d399"
                  strokeWidth={2.2}
                  fill="url(#auroraProfitGrad)"
                  dot={{ r: 3.5, strokeWidth: 1.5, fill: "#34d399" }}
                  activeDot={{ r: 5.5 }}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Operating Expenses"
                  stroke="#fbbf24"
                  strokeWidth={1.8}
                  fillOpacity={0}
                  dot={{ r: 3, strokeWidth: 1.5, fill: "#fbbf24" }}
                  activeDot={{ r: 5 }}
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function CashFlowAndCustomerChart({
  cashFlow,
  customerGrowth,
  isLive = false,
}: {
  cashFlow: CashFlowPoint[];
  customerGrowth: CustomerGrowthPoint[];
  isLive?: boolean;
}) {
  const [view, setView] = React.useState<"cash" | "customers">("cash");

  const hasCashData = Boolean(
    cashFlow &&
      cashFlow.length > 0 &&
      cashFlow.some(
        (c) => Number(c.inflow || 0) > 0 || Number(c.outflow || 0) > 0
      )
  );

  const hasCustomerData = Boolean(
    customerGrowth &&
      customerGrowth.length > 0 &&
      customerGrowth.some(
        (c) =>
          Number(c.totalCustomers || 0) > 0 ||
          Number(c.repeatCustomers || 0) > 0
      )
  );

  return (
    <ChartCard
      title={
        view === "cash"
          ? isLive
            ? "Monthly Cash Flow"
            : "Monthly Cash Flow (Demo)"
          : isLive
            ? "Customer Growth"
            : "Customer Growth (Demo)"
      }
      subtitle={
        view === "cash"
          ? "Actual cash inflows vs outflows (distinct from earned revenue)"
          : "Total CRM base vs repeat fragrance buyers"
      }
      action={
        <div className="aurora-glass-subtle flex rounded-full p-1">
          <GlassButton
            size="sm"
            variant={view === "cash" ? "primary" : "ghost"}
            className="h-7 rounded-full px-3 text-[11px]"
            onClick={() => setView("cash")}
          >
            Cash Flow
          </GlassButton>
          <GlassButton
            size="sm"
            variant={view === "customers" ? "primary" : "ghost"}
            className="h-7 rounded-full px-3 text-[11px]"
            onClick={() => setView("customers")}
          >
            Customers
          </GlassButton>
        </div>
      }
    >
      {view === "cash" ? (
        !hasCashData ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--aurora-border)] bg-[rgba(15,23,42,0.35)] p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--aurora-border)] bg-[var(--aurora-bg-surface)] text-[var(--aurora-accent)] shadow-[0_0_20px_rgba(245,186,75,0.15)]">
              <TrendingUp className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-[var(--aurora-text-strong)]">
              {isLive ? "No Cash Flow Transactions" : "No Cash Flow Data"}
            </p>
            <p className="mt-1 max-w-sm text-xs text-[var(--aurora-text-muted)]">
              {isLive
                ? "Real-time cash inflows from client payments and outflows from expenses will plot here."
                : "No recorded inflows or outflows for this period."}
            </p>
            {isLive && (
              <Link
                href="/finance"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--aurora-accent-border)] bg-[var(--aurora-accent)]/10 px-4 py-1.5 text-xs font-medium text-[var(--aurora-accent)] transition-all hover:bg-[var(--aurora-accent)]/20"
              >
                <Plus className="h-3.5 w-3.5" />
                View Finance Ledger
              </Link>
            )}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlow} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(255, 255, 255, 0.08)" />
              <XAxis
                dataKey="month"
                stroke="var(--aurora-text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--aurora-text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCompactNumber(Number(v))}
              />
              <Tooltip
                content={
                  <GlassChartTooltip
                    valueFormatter={(val) => formatCurrency(val)}
                  />
                }
              />
              <Bar
                dataKey="inflow"
                name="Cash Inflow"
                fill="#34d399"
                maxBarSize={44}
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="outflow"
                name="Cash Outflow"
                fill="#fbbf24"
                maxBarSize={44}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )
      ) : !hasCustomerData ? (
        <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--aurora-border)] bg-[rgba(15,23,42,0.35)] p-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--aurora-border)] bg-[var(--aurora-bg-surface)] text-[var(--aurora-accent)] shadow-[0_0_20px_rgba(245,186,75,0.15)]">
            <LineChartIcon className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-[var(--aurora-text-strong)]">
            {isLive ? "No Customer Growth Recorded" : "No Customer Data"}
          </p>
          <p className="mt-1 max-w-sm text-xs text-[var(--aurora-text-muted)]">
            {isLive
              ? "Add or import your client directory in CRM to track total and repeat customer progression."
              : "No customer metrics available."}
          </p>
          {isLive && (
            <Link
              href="/customers"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--aurora-accent-border)] bg-[var(--aurora-accent)]/10 px-4 py-1.5 text-xs font-medium text-[var(--aurora-accent)] transition-all hover:bg-[var(--aurora-accent)]/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Customer
            </Link>
          )}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={customerGrowth}
            margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255, 255, 255, 0.08)" />
            <XAxis
              dataKey="month"
              stroke="var(--aurora-text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--aurora-text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<GlassChartTooltip />} />
            <Line
              type="monotone"
              dataKey="totalCustomers"
              name="Total Customers"
              stroke="#38bdf8"
              strokeWidth={2.5}
              dot={{ r: 3.5, strokeWidth: 1.5, fill: "#38bdf8" }}
              activeDot={{ r: 5.5 }}
            />
            <Line
              type="monotone"
              dataKey="repeatCustomers"
              name="Repeat Buyers"
              stroke="#34d399"
              strokeWidth={2.2}
              dot={{ r: 3.5, strokeWidth: 1.5, fill: "#34d399" }}
              activeDot={{ r: 5.5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function ExpenseBreakdownChart({
  data,
  isLive = false,
}: {
  data: BreakdownPoint[];
  isLive?: boolean;
}) {
  const hasData = Boolean(
    data &&
      data.length > 0 &&
      data.some((d) => Number(d.value || 0) > 0)
  );

  return (
    <ChartCard
      title={isLive ? "Expense Breakdown" : "Expense Breakdown (Demo)"}
      subtitle={
        isLive
          ? "Approved expenses grouped by category"
          : "Estimated allocation across KSA import freight, ads, showroom & fulfillment"
      }
      heightClass="h-[250px]"
    >
      {!hasData ? (
        <div className="flex h-full min-h-[190px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--aurora-border)] bg-[rgba(15,23,42,0.35)] p-6 text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--aurora-border)] bg-[var(--aurora-bg-surface)] text-[var(--aurora-accent)] shadow-[0_0_15px_rgba(245,186,75,0.15)]">
            <PieChartIcon className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-[var(--aurora-text-strong)]">
            {isLive ? "No Expenses Logged" : "No Expense Breakdown"}
          </p>
          <p className="mt-0.5 max-w-xs text-[11px] text-[var(--aurora-text-muted)]">
            {isLive
              ? "Log operating expenses or supplier procurement to see categorized cost shares."
              : "No expenses recorded."}
          </p>
          {isLive && (
            <Link
              href="/expenses"
              className="mt-3 inline-flex items-center gap-1 rounded-full border border-[var(--aurora-accent-border)] bg-[var(--aurora-accent)]/10 px-3 py-1 text-[11px] font-medium text-[var(--aurora-accent)] transition-all hover:bg-[var(--aurora-accent)]/20"
            >
              <Plus className="h-3 w-3" />
              Record Expense
            </Link>
          )}
        </div>
      ) : (
        <div className="grid h-full grid-cols-1 items-center gap-3 sm:grid-cols-2">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={
                    <GlassChartTooltip
                      valueFormatter={(val) => formatCurrency(val)}
                    />
                  }
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={4}
                  stroke="none"
                >
                  {data.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2.5">
            {data.map((item, idx) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-[var(--aurora-text)]">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                      }}
                    />
                    {item.name}
                  </span>
                  <span className="font-semibold text-[var(--aurora-text-strong)]">
                    {item.share}%
                  </span>
                </div>
                <div className="text-[11px] text-[var(--aurora-text-muted)]">
                  {formatCurrency(item.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

export function CategoryBrandChart({
  byCategory,
  byBrand,
  isLive = false,
}: {
  byCategory: BreakdownPoint[];
  byBrand: BreakdownPoint[];
  isLive?: boolean;
}) {
  const [dimension, setDimension] = React.useState<"category" | "brand">(
    "category"
  );
  const activeData = dimension === "category" ? byCategory : byBrand;
  const hasData = Boolean(
    activeData &&
      activeData.length > 0 &&
      activeData.some((d) => Number(d.value || 0) > 0)
  );

  return (
    <ChartCard
      title={
        dimension === "category"
          ? isLive
            ? "Sales by Fragrance / Category"
            : "Sales by Category (Demo)"
          : isLive
            ? "Sales by Brand"
            : "Sales by Brand (Demo)"
      }
      subtitle="Compare fragrance portfolio contribution by category or house"
      heightClass="h-[250px]"
      action={
        <div className="aurora-glass-subtle flex rounded-full p-1">
          <GlassButton
            size="sm"
            variant={dimension === "category" ? "primary" : "ghost"}
            className="h-7 rounded-full px-3 text-[11px]"
            onClick={() => setDimension("category")}
          >
            Category
          </GlassButton>
          <GlassButton
            size="sm"
            variant={dimension === "brand" ? "primary" : "ghost"}
            className="h-7 rounded-full px-3 text-[11px]"
            onClick={() => setDimension("brand")}
          >
            Brand
          </GlassButton>
        </div>
      }
    >
      {!hasData ? (
        <div className="flex h-full min-h-[190px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--aurora-border)] bg-[rgba(15,23,42,0.35)] p-6 text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--aurora-border)] bg-[var(--aurora-bg-surface)] text-[var(--aurora-accent)] shadow-[0_0_15px_rgba(245,186,75,0.15)]">
            <BarChart3 className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-[var(--aurora-text-strong)]">
            {isLive ? "No Category Distribution" : "No Distribution Data"}
          </p>
          <p className="mt-0.5 max-w-xs text-[11px] text-[var(--aurora-text-muted)]">
            {isLive
              ? "Assign categories or perfume houses to catalog products to visualize share distribution."
              : "No categories recorded."}
          </p>
          {isLive && (
            <Link
              href="/products"
              className="mt-3 inline-flex items-center gap-1 rounded-full border border-[var(--aurora-accent-border)] bg-[var(--aurora-accent)]/10 px-3 py-1 text-[11px] font-medium text-[var(--aurora-accent)] transition-all hover:bg-[var(--aurora-accent)]/20"
            >
              <Plus className="h-3 w-3" />
              Manage Products
            </Link>
          )}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={activeData}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255, 255, 255, 0.08)" />
            <XAxis
              type="number"
              stroke="var(--aurora-text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCompactNumber(Number(v))}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="var(--aurora-text-strong)"
              fontSize={11}
              width={78}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={
                <GlassChartTooltip
                  valueFormatter={(val) => formatCurrency(val)}
                />
              }
            />
            <Bar dataKey="value" name="Sales" radius={[0, 8, 8, 0]} maxBarSize={28}>
              {activeData.map((_, idx) => (
                <Cell
                  key={idx}
                  fill={CHART_COLORS[idx % CHART_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function SalesPerformanceChart({
  data,
  isLive = false,
}: {
  data: { channel: string; sales: number; orders: number }[];
  isLive?: boolean;
}) {
  const hasData = Boolean(
    data &&
      data.length > 0 &&
      data.some((d) => Number(d.sales || 0) > 0 || Number(d.orders || 0) > 0)
  );

  return (
    <ChartCard
      title={
        isLive
          ? "Sales Performance by Channel"
          : "Sales Performance by Channel (Demo)"
      }
      subtitle="Revenue and order volume across Facebook Shop, Showroom, Website & WhatsApp"
      heightClass="h-[250px]"
    >
      {!hasData ? (
        <div className="flex h-full min-h-[190px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--aurora-border)] bg-[rgba(15,23,42,0.35)] p-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--aurora-border)] bg-[var(--aurora-bg-surface)] text-[var(--aurora-accent)] shadow-[0_0_20px_rgba(245,186,75,0.15)]">
            <BarChart3 className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-[var(--aurora-text-strong)]">
            {isLive ? "No Channel Sales Yet" : "No Channel Data"}
          </p>
          <p className="mt-1 max-w-sm text-xs text-[var(--aurora-text-muted)]">
            {isLive
              ? "Orders from Showroom, Website, Facebook, or WhatsApp will be broken down here by channel volume."
              : "No channel performance metrics available."}
          </p>
          {isLive && (
            <Link
              href="/sales"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--aurora-accent-border)] bg-[var(--aurora-accent)]/10 px-4 py-1.5 text-xs font-medium text-[var(--aurora-accent)] transition-all hover:bg-[var(--aurora-accent)]/20 hover:shadow-[0_0_15px_rgba(245,186,75,0.25)]"
            >
              <Plus className="h-3.5 w-3.5" />
              New Channel Order
            </Link>
          )}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255, 255, 255, 0.08)" />
            <XAxis
              dataKey="channel"
              stroke="var(--aurora-text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--aurora-text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCompactNumber(Number(v))}
            />
            <Tooltip
              content={
                <GlassChartTooltip
                  valueFormatter={(val, name) =>
                    name === "Orders" ? `${val} orders` : formatCurrency(val)
                  }
                />
              }
            />
            <Bar
              dataKey="sales"
              name="Channel Sales"
              fill="#38bdf8"
              maxBarSize={48}
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

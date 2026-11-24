"use client";

import * as React from "react";
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
  "var(--aurora-chart-1)",
  "var(--aurora-chart-2)",
  "var(--aurora-chart-3)",
  "var(--aurora-chart-4)",
  "var(--aurora-chart-5)",
];

export function RevenueProfitChart({ data }: { data: RevenueTrendPoint[] }) {
  const [mode, setMode] = React.useState<"revenue" | "pnl">("revenue");

  return (
    <ChartCard
      title={mode === "revenue" ? "Revenue Overview (Demo)" : "Profit & Loss Trend (Demo)"}
      subtitle={
        mode === "revenue"
          ? "Monthly earned revenue vs gross profit across selected fragrance categories"
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
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="auroraRevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--aurora-chart-1)" stopOpacity={0.42} />
              <stop offset="95%" stopColor="var(--aurora-chart-1)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="auroraProfitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--aurora-chart-2)" stopOpacity={0.42} />
              <stop offset="95%" stopColor="var(--aurora-chart-2)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--aurora-chart-grid)" />
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
                stroke="var(--aurora-chart-1)"
                strokeWidth={2.4}
                fill="url(#auroraRevGrad)"
              />
              <Area
                type="monotone"
                dataKey="grossProfit"
                name="Gross Profit"
                stroke="var(--aurora-chart-2)"
                strokeWidth={2}
                fill="url(#auroraProfitGrad)"
              />
            </>
          ) : (
            <>
              <Area
                type="monotone"
                dataKey="grossProfit"
                name="Gross Profit"
                stroke="var(--aurora-chart-1)"
                strokeWidth={2.2}
                fill="url(#auroraRevGrad)"
              />
              <Area
                type="monotone"
                dataKey="netProfit"
                name="Net Profit"
                stroke="var(--aurora-chart-2)"
                strokeWidth={2.2}
                fill="url(#auroraProfitGrad)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Operating Expenses"
                stroke="var(--aurora-chart-3)"
                strokeWidth={1.8}
                fillOpacity={0}
              />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function CashFlowAndCustomerChart({
  cashFlow,
  customerGrowth,
}: {
  cashFlow: CashFlowPoint[];
  customerGrowth: CustomerGrowthPoint[];
}) {
  const [view, setView] = React.useState<"cash" | "customers">("cash");

  return (
    <ChartCard
      title={
        view === "cash"
          ? "Monthly Cash Flow (Demo)"
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
      <ResponsiveContainer width="100%" height="100%">
        {view === "cash" ? (
          <BarChart data={cashFlow} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--aurora-chart-grid)" />
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
              fill="var(--aurora-chart-2)"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="outflow"
              name="Cash Outflow"
              fill="var(--aurora-chart-3)"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        ) : (
          <LineChart
            data={customerGrowth}
            margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="var(--aurora-chart-grid)" />
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
              stroke="var(--aurora-chart-1)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="repeatCustomers"
              name="Repeat Buyers"
              stroke="var(--aurora-chart-2)"
              strokeWidth={2.2}
              dot={{ r: 3 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ExpenseBreakdownChart({ data }: { data: BreakdownPoint[] }) {
  return (
    <ChartCard
      title="Expense Breakdown (Demo)"
      subtitle="Estimated allocation across KSA import freight, ads, showroom & fulfillment"
      heightClass="h-[250px]"
    >
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
    </ChartCard>
  );
}

export function CategoryBrandChart({
  byCategory,
  byBrand,
}: {
  byCategory: BreakdownPoint[];
  byBrand: BreakdownPoint[];
}) {
  const [dimension, setDimension] = React.useState<"category" | "brand">(
    "category"
  );
  const activeData = dimension === "category" ? byCategory : byBrand;

  return (
    <ChartCard
      title={
        dimension === "category"
          ? "Sales by Category (Demo)"
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
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={activeData}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke="var(--aurora-chart-grid)" />
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
          <Bar dataKey="value" name="Sales" radius={[0, 8, 8, 0]}>
            {activeData.map((_, idx) => (
              <Cell
                key={idx}
                fill={CHART_COLORS[idx % CHART_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function SalesPerformanceChart({
  data,
}: {
  data: { channel: string; sales: number; orders: number }[];
}) {
  return (
    <ChartCard
      title="Sales Performance by Channel (Demo)"
      subtitle="Revenue and order volume across Facebook Shop, Showroom, Website & WhatsApp"
      heightClass="h-[250px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--aurora-chart-grid)" />
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
            fill="var(--aurora-chart-1)"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

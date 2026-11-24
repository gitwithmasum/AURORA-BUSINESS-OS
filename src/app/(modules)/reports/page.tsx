"use client";

import * as React from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  exportDocumentPdf,
  exportRowsToCsv,
  exportRowsToExcel,
} from "@/lib/operations/exports";
import { BackendConnectionGuard } from "@/components/operations/BackendConnectionGuard";
import {
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  GlassInput,
  PageHeader,
  useToast,
} from "@/components/ui";

const REPORT_TYPES = [
  { key: "inventory", label: "Inventory Report" },
  { key: "sales", label: "Sales Report" },
  { key: "purchases", label: "Purchase Report" },
  { key: "customers", label: "Customer Report" },
  { key: "suppliers", label: "Supplier Report" },
  { key: "expenses", label: "Expense Report" },
  { key: "pnl", label: "Profit & Loss Report" },
  { key: "cashflow", label: "Cash Flow Report" },
  { key: "imports", label: "Import Cost Report" },
  { key: "customs", label: "Customs Estimation Report" },
  { key: "marketing", label: "Marketing Report" },
  { key: "bestsellers", label: "Best-Selling Products Report" },
] as const;

function ReportsCenterWorkspace() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  const [reportType, setReportType] = React.useState<string>("sales");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [rows, setRows] = React.useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadReport = React.useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        organizationId: activeOrg.organizationId,
        type: reportType,
      });
      if (startDate) qs.set("startDate", startDate);
      if (endDate) qs.set("endDate", endDate);
      const res = await fetch(`/api/reports?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Access denied or report failed", tone: "error" });
        setRows([]);
        return;
      }
      setRows(json.rows ?? []);
    } finally {
      setLoading(false);
    }
  }, [activeOrg, reportType, startDate, endDate, toast]);

  React.useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const activeMeta = REPORT_TYPES.find((r) => r.key === reportType);
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

  const handleExportPdf = () => {
    if (rows.length === 0) return;
    exportDocumentPdf({
      title: (activeMeta?.label ?? "REPORT").toUpperCase(),
      businessName: activeOrg?.organizationName ?? "AURORA OS",
      meta: [
        { label: "Date Range", value: `${startDate || "All"} to ${endDate || "Today"}` },
        { label: "Total Rows", value: String(rows.length) },
      ],
      columns: cols,
      rows: rows.map((r) => cols.map((c) => String(r[c] ?? ""))),
      filename: `aurora-${reportType}-report.pdf`,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Enterprise Reports Center"
        subtitle="12 permission-controlled reports with date filters and PDF, CSV, and Excel exports."
        badges={<GlassBadge tone="accent">{rows.length} Records</GlassBadge>}
        actions={
          <>
            <GlassButton
              variant="secondary"
              size="sm"
              disabled={rows.length === 0}
              onClick={() =>
                exportRowsToCsv(`aurora-${reportType}.csv`, rows)
              }
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </GlassButton>
            <GlassButton
              variant="secondary"
              size="sm"
              disabled={rows.length === 0}
              onClick={() =>
                exportRowsToExcel(`aurora-${reportType}.xlsx`, activeMeta?.label ?? "Report", rows)
              }
            >
              <Download className="h-3.5 w-3.5" />
              Excel
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              disabled={rows.length === 0}
              onClick={handleExportPdf}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              PDF
            </GlassButton>
          </>
        }
      />

      <GlassCard padding="sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {REPORT_TYPES.map((r) => (
              <GlassButton
                key={r.key}
                size="sm"
                variant={reportType === r.key ? "primary" : "ghost"}
                onClick={() => setReportType(r.key)}
              >
                {r.label}
              </GlassButton>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <GlassInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 w-36 text-xs" />
            <GlassInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 w-36 text-xs" />
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle>{activeMeta?.label}</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          {loading ? (
            <div className="py-8 text-center text-xs text-[var(--aurora-text-muted)]">
              Loading report records...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--aurora-text-muted)]">
              No records available for the selected report &amp; date range.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[var(--aurora-glass-border)]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--aurora-glass-border)] bg-[var(--aurora-glass-bg)]">
                    {cols.map((c) => (
                      <th key={c} className="px-3.5 py-2.5 font-semibold uppercase text-[var(--aurora-text-muted)]">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--aurora-glass-border)]">
                  {rows.slice(0, 100).map((r, i) => (
                    <tr key={i} className="hover:bg-[var(--aurora-glass-bg-subtle)]">
                      {cols.map((c) => (
                        <td key={c} className="whitespace-nowrap px-3.5 py-2.5 text-[var(--aurora-text)]">
                          {String(r[c] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <BackendConnectionGuard moduleTitle="Enterprise Reports Center">
      <ReportsCenterWorkspace />
    </BackendConnectionGuard>
  );
}

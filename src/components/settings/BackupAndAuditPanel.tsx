"use client";

import * as React from "react";
import { Download, History, ShieldCheck, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { parseSpreadsheetFile } from "@/lib/operations/exports";
import {
  FormField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
  GlassInput,
  GlassSelect,
  useToast,
} from "@/components/ui";

interface ActivityLogRow {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function BackupAndAuditPanel() {
  const { activeOrg, user } = useAuth();
  const { toast } = useToast();

  const [logs, setLogs] = React.useState<ActivityLogRow[]>([]);
  const [eventFilter, setEventFilter] = React.useState("");
  const [importEntity, setImportEntity] = React.useState<"products" | "customers" | "suppliers">("products");
  const [importReport, setImportReport] = React.useState<{
    insertedCount: number;
    skippedDuplicates: string[];
    errors: string[];
  } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const loadLogs = React.useCallback(async () => {
    if (!activeOrg) return;
    const qs = new URLSearchParams({ organizationId: activeOrg.organizationId });
    if (eventFilter) qs.set("eventType", eventFilter);
    const res = await fetch(`/api/activity-logs?${qs.toString()}`);
    if (res.ok) {
      const json = await res.json();
      setLogs(json.logs ?? []);
    }
  }, [activeOrg, eventFilter]);

  React.useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleJsonBackup = async () => {
    if (!activeOrg) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/backup?organizationId=${activeOrg.organizationId}`
      );
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Backup export failed", tone: "error" });
        return;
      }
      const blob = new Blob([JSON.stringify(json.backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aurora-backup-${activeOrg.slug || "org"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Structured JSON backup exported", tone: "success" });
    } finally {
      setBusy(false);
    }
  };

  const handleValidatedImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeOrg) return;
    setBusy(true);
    try {
      const { rows, duplicates } = await parseSpreadsheetFile(file);
      if (duplicates.length > 0) {
        toast({
          title: `Spreadsheet contains duplicate SKUs/codes: ${duplicates.slice(0, 3).join(", ")}`,
          tone: "warning",
        });
      }
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: activeOrg.organizationId,
          entity: importEntity,
          rows,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Import failed", tone: "error" });
        return;
      }
      setImportReport(json.report);
      toast({
        title: `Imported ${json.report.insertedCount} ${importEntity}`,
        description: `Skipped ${json.report.skippedDuplicates.length} duplicates without overwriting.`,
        tone: "success",
      });
      await loadLogs();
    } finally {
      setBusy(false);
    }
  };

  if (!user || !activeOrg) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <GlassCard>
        <GlassCardHeader>
          <div>
            <GlassCardTitle>Backup &amp; Validated Data Import</GlassCardTitle>
            <GlassCardDescription>
              Permission-controlled JSON backup export and duplicate-safe CSV/Excel import (never silently overwrites existing rows).
            </GlassCardDescription>
          </div>
          <ShieldCheck className="h-4 w-4 text-[var(--aurora-success)]" />
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="aurora-glass-subtle flex items-center justify-between rounded-2xl p-3.5 text-xs">
            <span>Export full organization JSON backup</span>
            <GlassButton size="sm" variant="primary" loading={busy} onClick={() => void handleJsonBackup()}>
              <Download className="h-3.5 w-3.5" />
              Download Backup
            </GlassButton>
          </div>

          <div className="aurora-glass-subtle space-y-3 rounded-2xl p-3.5">
            <FormField label="Import Target Entity">
              <GlassSelect
                value={importEntity}
                onChange={(e) => setImportEntity(e.target.value as "products" | "customers" | "suppliers")}
                options={[
                  { value: "products", label: "Products (sku, name, purchase_cost, selling_price)" },
                  { value: "customers", label: "Customers (customer_code, full_name, phone, email)" },
                  { value: "suppliers", label: "Suppliers (supplier_code, name, country, currency)" },
                ]}
              />
            </FormField>
            <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--aurora-glass-border-strong)] text-xs font-medium text-[var(--aurora-text-strong)]">
              <Upload className="h-3.5 w-3.5 text-[var(--aurora-accent)]" />
              <span>Upload CSV / Excel for Validated Import</span>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleValidatedImport} />
            </label>
          </div>

          {importReport && (
            <div className="aurora-glass-subtle rounded-2xl p-3.5 text-xs space-y-1">
              <div>Inserted: <strong>{importReport.insertedCount}</strong></div>
              <div>Skipped Duplicates: <strong>{importReport.skippedDuplicates.length}</strong></div>
              <div>Validation Errors: <strong>{importReport.errors.length}</strong></div>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      <GlassCard>
        <GlassCardHeader>
          <div>
            <GlassCardTitle>Immutable Activity &amp; Audit Logs</GlassCardTitle>
            <GlassCardDescription>
              Tracks products, stock, sales, approvals, invoices, permissions, and settings
            </GlassCardDescription>
          </div>
          <History className="h-4 w-4 text-[var(--aurora-accent)]" />
        </GlassCardHeader>
        <GlassCardContent className="space-y-3">
          <GlassInput
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            placeholder="Filter by event (e.g. sale, product, settings)..."
            className="h-9 text-xs"
          />
          <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1 text-xs">
            {logs.length === 0 ? (
              <div className="text-[var(--aurora-text-muted)]">No audit events matching filter.</div>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="aurora-glass-subtle flex items-center justify-between gap-2 rounded-xl px-3 py-2">
                  <div className="min-w-0">
                    <GlassBadge tone="info">{l.event_type}</GlassBadge>
                    <div className="mt-1 truncate text-[11px] text-[var(--aurora-text-muted)]">
                      {l.entity_type} {l.entity_id ? `· ${l.entity_id.slice(0, 8)}` : ""}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-[var(--aurora-text-muted)]">
                    {new Date(l.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

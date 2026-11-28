"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Download, Plus, Upload, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { EXPENSE_CATEGORIES } from "@/lib/validators/part4";
import { formatCurrency } from "@/lib/utils/format";
import { validateStorageUpload } from "@/lib/storage/buckets";
import {
  exportDocumentPdf,
  exportRowsToCsv,
  exportRowsToExcel,
} from "@/lib/operations/exports";
import { BackendConnectionGuard } from "@/components/operations/BackendConnectionGuard";
import {
  DataTable,
  FilterDropdown,
  FormField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassDialog,
  GlassInput,
  GlassSelect,
  GlassTextarea,
  KpiCard,
  PageHeader,
  useToast,
} from "@/components/ui";

interface ExpenseRow {
  id: string;
  category: string;
  vendor_name: string;
  expense_date: string;
  currency: string;
  exchange_rate: number;
  amount: number;
  amount_base: number;
  payment_status: "paid" | "unpaid";
  approval_status: "pending" | "approved" | "rejected";
  receipt_path: string | null;
  notes: string;
}

interface AccountOpt {
  id: string;
  account_name: string;
}

function ExpensesWorkspace() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [expenses, setExpenses] = React.useState<ExpenseRow[]>([]);
  const [accounts, setAccounts] = React.useState<AccountOpt[]>([]);
  const [catFilter, setCatFilter] = React.useState("all");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [category, setCategory] = React.useState<string>("Rent");
  const [vendorName, setVendorName] = React.useState("");
  const [expenseDate, setExpenseDate] = React.useState(
    new Date().toISOString().slice(0, 10)
  );
  const [currency, setCurrency] = React.useState("BDT");
  const [exchangeRate, setExchangeRate] = React.useState(1);
  const [amount, setAmount] = React.useState(0);
  const [paymentStatus, setPaymentStatus] = React.useState<"paid" | "unpaid">("paid");
  const [accountId, setAccountId] = React.useState("");
  const [receiptPath, setReceiptPath] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");

  const canApprove = activeOrg
    ? ["owner", "admin", "manager", "accountant"].includes(activeOrg.roleKey)
    : false;

  const loadData = React.useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/expenses?organizationId=${activeOrg.organizationId}`
      );
      const json = await res.json();
      if (res.ok) {
        setExpenses(json.expenses ?? []);
        setAccounts(json.accounts ?? []);
        if (!accountId && json.accounts?.[0]?.id) {
          setAccountId(json.accounts[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [activeOrg, accountId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeOrg) return;
    const check = validateStorageUpload("purchase-documents", {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!check.valid) {
      toast({ title: check.reason, tone: "error" });
      return;
    }
    const fd = new FormData();
    fd.append("organizationId", activeOrg.organizationId);
    fd.append("bucket", "purchase-documents");
    fd.append("file", file);
    const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (res.ok) {
      setReceiptPath(json.path);
      toast({ title: "Receipt uploaded", tone: "success" });
    } else {
      toast({ title: json.error || "Upload failed", tone: "error" });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: activeOrg.organizationId,
          category,
          vendorName,
          expenseDate,
          currency,
          exchangeRate: Number(exchangeRate) || 1,
          amount: Number(amount) || 0,
          paymentStatus,
          accountId: accountId || null,
          receiptPath,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to create expense", tone: "error" });
        return;
      }
      toast({ title: "Expense submitted for approval", tone: "success" });
      setModalOpen(false);
      setVendorName("");
      setAmount(0);
      setReceiptPath(null);
      setNotes("");
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDecision = async (expenseId: string, decision: "approved" | "rejected") => {
    if (!activeOrg) return;
    const res = await fetch("/api/expenses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: activeOrg.organizationId,
        expenseId,
        decision,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: json.error || "Approval failed", tone: "error" });
      return;
    }
    toast({
      title: `Expense ${decision}`,
      description:
        decision === "approved"
          ? "Included in P&L and recorded in Cash Flow if paid."
          : undefined,
      tone: "success",
    });
    await loadData();
  };

  const filtered = React.useMemo(
    () =>
      catFilter === "all"
        ? expenses
        : expenses.filter((e) => e.category === catFilter),
    [expenses, catFilter]
  );

  const approvedTotal = expenses
    .filter((e) => e.approval_status === "approved")
    .reduce((s, e) => s + Number(e.amount_base), 0);
  const pendingCount = expenses.filter(
    (e) => e.approval_status === "pending"
  ).length;

  const columns: ColumnDef<ExpenseRow>[] = [
    { accessorKey: "expense_date", header: "Date" },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <GlassBadge tone="info">{row.original.category}</GlassBadge>,
    },
    { accessorKey: "vendor_name", header: "Vendor / Payee" },
    {
      accessorKey: "amount_base",
      header: "Base Amount",
      cell: ({ row }) => formatCurrency(Number(row.original.amount_base)),
    },
    {
      accessorKey: "approval_status",
      header: "Approval",
      cell: ({ row }) => (
        <GlassBadge
          tone={
            row.original.approval_status === "approved"
              ? "success"
              : row.original.approval_status === "rejected"
                ? "danger"
                : "warning"
          }
        >
          {row.original.approval_status}
        </GlassBadge>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.approval_status === "pending" && canApprove ? (
          <div className="flex gap-1">
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => void handleDecision(row.original.id, "approved")}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aurora-success)]" />
              Approve
            </GlassButton>
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => void handleDecision(row.original.id, "rejected")}
            >
              <XCircle className="h-3.5 w-3.5 text-[var(--aurora-danger)]" />
            </GlassButton>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Expense Management"
        subtitle="Categorized expense entry, authorized approval, receipt upload & Cash Flow linkage."
        actions={
          <>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => exportRowsToCsv("aurora-expenses.csv", filtered)}
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </GlassButton>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() =>
                exportRowsToExcel("aurora-expenses.xlsx", "Expenses", filtered)
              }
            >
              <Download className="h-3.5 w-3.5" />
              Excel
            </GlassButton>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() =>
                exportDocumentPdf({
                  title: "EXPENSE REPORT",
                  businessName: activeOrg?.organizationName ?? "Aurora BusinessHub",
                  meta: [{ label: "Approved Total", value: formatCurrency(approvedTotal) }],
                  columns: ["Date", "Category", "Vendor", "Amount", "Approval"],
                  rows: filtered.map((e) => [
                    e.expense_date,
                    e.category,
                    e.vendor_name || "—",
                    formatCurrency(Number(e.amount_base)),
                    e.approval_status,
                  ]),
                  filename: "aurora-expense-report.pdf",
                })
              }
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </GlassButton>
            <GlassButton variant="primary" size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add Expense
            </GlassButton>
          </>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-3">
        <KpiCard label="Total Entries" value={String(expenses.length)} />
        <KpiCard label="Approved Expenses" value={formatCurrency(approvedTotal)} />
        <KpiCard label="Pending Approval" value={String(pendingCount)} />
      </div>

      <GlassCard overflow="visible" className="relative z-20 overflow-visible">
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          searchPlaceholder="Search vendor, category, notes..."
          toolbarExtra={
            <FilterDropdown
              label="Category"
              value={catFilter}
              onChange={setCatFilter}
              options={[
                { value: "all", label: "All Categories" },
                ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
            />
          }
        />
      </GlassCard>

      <GlassDialog open={modalOpen} onOpenChange={setModalOpen} title="Submit Expense" maxWidth="lg">
        <form onSubmit={handleCreate} className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Category" required>
              <GlassSelect
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </FormField>
            <FormField label="Vendor / Payee">
              <GlassInput value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
            </FormField>
            <FormField label="Expense Date">
              <GlassInput type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </FormField>
            <FormField label="Amount" required>
              <GlassInput type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
            </FormField>
            <FormField label="Currency">
              <GlassSelect
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: "BDT", label: "BDT" },
                  { value: "SAR", label: "SAR" },
                  { value: "USD", label: "USD" },
                ]}
              />
            </FormField>
            <FormField label="Exchange Rate to Base">
              <GlassInput type="number" min={0.01} step="0.01" value={exchangeRate} onChange={(e) => setExchangeRate(Number(e.target.value))} />
            </FormField>
            <FormField label="Payment Status">
              <GlassSelect
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as "paid" | "unpaid")}
                options={[
                  { value: "paid", label: "Paid" },
                  { value: "unpaid", label: "Unpaid" },
                ]}
              />
            </FormField>
            <FormField label="Financial Account">
              <GlassSelect
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                options={[
                  { value: "", label: "Select account..." },
                  ...accounts.map((a) => ({ value: a.id, label: a.account_name })),
                ]}
              />
            </FormField>
          </div>
          <FormField label="Receipt Upload">
            <label className="aurora-glass-subtle flex h-10 cursor-pointer items-center gap-2 rounded-[16px] border border-dashed border-[var(--aurora-glass-border-strong)] px-3.5 text-xs">
              <Upload className="h-3.5 w-3.5 text-[var(--aurora-accent)]" />
              <span className="truncate">{receiptPath ? receiptPath : "Upload PDF/PNG/JPEG receipt"}</span>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleReceiptUpload} />
            </label>
          </FormField>
          <FormField label="Notes">
            <GlassTextarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</GlassButton>
            <GlassButton type="submit" variant="primary" size="sm" loading={saving}>Submit Expense</GlassButton>
          </div>
        </form>
      </GlassDialog>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <BackendConnectionGuard moduleTitle="Expense Management">
      <ExpensesWorkspace />
    </BackendConnectionGuard>
  );
}

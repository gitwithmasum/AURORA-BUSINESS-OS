"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Plus, Printer } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils/format";
import { exportDocumentPdf } from "@/lib/operations/exports";
import { BackendConnectionGuard } from "@/components/operations/BackendConnectionGuard";
import {
  DataTable,
  FormField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassDialog,
  GlassInput,
  GlassSelect,
  GlassTextarea,
  PageHeader,
  useToast,
} from "@/components/ui";

interface InvoiceRow {
  id: string;
  invoice_type: "sales" | "purchase" | "proforma" | "credit_note";
  invoice_number: string;
  counterparty_name: string;
  counterparty_contact: string;
  issue_date: string;
  due_date: string | null;
  payment_status: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total_amount: number;
  terms_and_conditions: string;
}

interface InvoiceItemRow {
  id: string;
  invoice_id: string;
  description: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  line_total: number;
}

interface BusinessSettingsSummary {
  business_name: string;
  address_line: string;
  city: string;
  contact_email: string;
  contact_phone: string;
}

function OrdersInvoicesWorkspace() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [invoices, setInvoices] = React.useState<InvoiceRow[]>([]);
  const [items, setItems] = React.useState<InvoiceItemRow[]>([]);
  const [biz, setBiz] = React.useState<BusinessSettingsSummary | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [invoiceType, setInvoiceType] = React.useState<InvoiceRow["invoice_type"]>("proforma");
  const [counterpartyName, setCounterpartyName] = React.useState("");
  const [counterpartyContact, setCounterpartyContact] = React.useState("");
  const [issueDate, setIssueDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = React.useState("");
  const [itemDesc, setItemDesc] = React.useState("");
  const [itemSku, setItemSku] = React.useState("");
  const [itemQty, setItemQty] = React.useState(1);
  const [itemPrice, setItemPrice] = React.useState(0);
  const [terms, setTerms] = React.useState(
    "Goods sold are subject to organization authenticity & return policy."
  );

  const loadData = React.useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/invoices?organizationId=${activeOrg.organizationId}`
      );
      const json = await res.json();
      if (res.ok) {
        setInvoices(json.invoices ?? []);
        setItems(json.invoiceItems ?? []);
        setBiz(json.businessSettings ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [activeOrg]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: activeOrg.organizationId,
          invoiceType,
          counterpartyName,
          counterpartyContact,
          issueDate,
          dueDate: dueDate || null,
          paymentStatus: invoiceType === "credit_note" ? "refunded" : "unpaid",
          termsAndConditions: terms,
          items: [
            {
              description: itemDesc,
              sku: itemSku,
              quantity: Number(itemQty) || 1,
              unitPrice: Number(itemPrice) || 0,
              discount: 0,
              tax: 0,
            },
          ],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to create invoice", tone: "error" });
        return;
      }
      toast({
        title: `Generated ${json.invoice?.invoice_number}`,
        tone: "success",
      });
      setCreateOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handlePdf = (inv: InvoiceRow) => {
    const lines = items.filter((i) => i.invoice_id === inv.id);
    exportDocumentPdf({
      title: `${inv.invoice_type.toUpperCase()} INVOICE`,
      subtitle: inv.invoice_number,
      businessName: biz?.business_name || activeOrg?.organizationName || "Aurora BusinessHub",
      businessAddress: [biz?.address_line, biz?.city].filter(Boolean).join(", "),
      businessContact: [biz?.contact_phone, biz?.contact_email].filter(Boolean).join(" · "),
      meta: [
        { label: "Bill To", value: inv.counterparty_name },
        { label: "Issue Date", value: inv.issue_date },
        { label: "Payment Status", value: inv.payment_status.toUpperCase() },
      ],
      columns: ["SKU", "Description", "Qty", "Unit Price", "Line Total"],
      rows: lines.map((l) => [
        l.sku || "—",
        l.description,
        l.quantity,
        formatCurrency(Number(l.unit_price)),
        formatCurrency(Number(l.line_total)),
      ]),
      totals: [
        { label: "Subtotal", value: formatCurrency(Number(inv.subtotal)) },
        { label: "Discount", value: formatCurrency(Number(inv.discount_total)) },
        { label: "Tax", value: formatCurrency(Number(inv.tax_total)) },
        { label: "Total", value: formatCurrency(Number(inv.total_amount)) },
      ],
      footerNote: inv.terms_and_conditions,
      filename: `${inv.invoice_number}.pdf`,
    });
  };

  const columns: ColumnDef<InvoiceRow>[] = [
    { accessorKey: "invoice_number", header: "Invoice #" },
    {
      accessorKey: "invoice_type",
      header: "Type",
      cell: ({ row }) => (
        <GlassBadge tone="accent">{row.original.invoice_type}</GlassBadge>
      ),
    },
    { accessorKey: "counterparty_name", header: "Customer / Party" },
    { accessorKey: "issue_date", header: "Issue Date" },
    {
      accessorKey: "total_amount",
      header: "Total",
      cell: ({ row }) => formatCurrency(Number(row.original.total_amount)),
    },
    {
      accessorKey: "payment_status",
      header: "Status",
      cell: ({ row }) => (
        <GlassBadge tone={row.original.payment_status === "paid" ? "success" : "warning"}>
          {row.original.payment_status}
        </GlassBadge>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <GlassButton size="sm" variant="ghost" onClick={() => handlePdf(row.original)}>
            <Download className="h-3.5 w-3.5" />
            PDF
          </GlassButton>
          <GlassButton size="sm" variant="ghost" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" />
          </GlassButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders & Invoice Generator"
        subtitle="Branded Sales, Purchase, Proforma & Credit Note invoices with auto-numbering, printing, and PDF export."
        actions={
          <GlassButton variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Generate Invoice
          </GlassButton>
        }
      />

      <GlassCard>
        <DataTable
          columns={columns}
          data={invoices}
          loading={loading}
          searchPlaceholder="Search invoice number or customer..."
        />
      </GlassCard>

      <GlassDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Generate Branded Invoice"
        maxWidth="lg"
      >
        <form onSubmit={handleGenerate} className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Invoice Type">
              <GlassSelect
                value={invoiceType}
                onChange={(e) =>
                  setInvoiceType(e.target.value as InvoiceRow["invoice_type"])
                }
                options={[
                  { value: "sales", label: "Sales Invoice" },
                  { value: "proforma", label: "Proforma Invoice" },
                  { value: "purchase", label: "Purchase Invoice" },
                  { value: "credit_note", label: "Refund / Credit Note" },
                ]}
              />
            </FormField>
            <FormField label="Issue Date">
              <GlassInput
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </FormField>
            <FormField label="Counterparty / Customer Name" required>
              <GlassInput
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Contact Info">
              <GlassInput
                value={counterpartyContact}
                onChange={(e) => setCounterpartyContact(e.target.value)}
              />
            </FormField>
            <FormField label="Item Description" required>
              <GlassInput
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                required
              />
            </FormField>
            <FormField label="SKU">
              <GlassInput
                value={itemSku}
                onChange={(e) => setItemSku(e.target.value)}
              />
            </FormField>
            <FormField label="Quantity">
              <GlassInput
                type="number"
                min={1}
                value={itemQty}
                onChange={(e) => setItemQty(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Unit Price">
              <GlassInput
                type="number"
                min={0}
                value={itemPrice}
                onChange={(e) => setItemPrice(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Due Date">
              <GlassInput
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Terms & Conditions">
            <GlassTextarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" size="sm" loading={saving}>
              Generate &amp; Number
            </GlassButton>
          </div>
        </form>
      </GlassDialog>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <BackendConnectionGuard moduleTitle="Orders & Invoice Generator">
      <OrdersInvoicesWorkspace />
    </BackendConnectionGuard>
  );
}

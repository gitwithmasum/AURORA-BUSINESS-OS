"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Download, Plus, RotateCcw, ShoppingCart, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils/format";
import { calculateSaleTotals } from "@/lib/operations/calculations";
import {
  exportDocumentPdf,
  exportRowsToCsv,
  exportRowsToExcel,
} from "@/lib/operations/exports";
import { BackendConnectionGuard } from "@/components/operations/BackendConnectionGuard";
import {
  ConfirmDialog,
  DataTable,
  FormField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassDialog,
  GlassInput,
  GlassSelect,
  GlassSwitch,
  KpiCard,
  PageHeader,
  useToast,
} from "@/components/ui";

interface SaleRow {
  id: string;
  customer_id: string | null;
  invoice_number: string;
  sale_date: string;
  channel: string;
  payment_method: string;
  payment_status: string;
  order_status: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  paid_amount: number;
}

interface SaleItemRow {
  id: string;
  sale_id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  line_total: number;
}

interface ProductOpt {
  id: string;
  sku: string;
  name: string;
  selling_price: number;
}

interface WarehouseOpt {
  id: string;
  name: string;
}

interface CustomerOpt {
  id: string;
  full_name: string;
}

interface DraftLine {
  product_id: string;
  warehouse_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
}

function SalesWorkspace() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = React.useState<"register" | "orders">("register");
  const [loading, setLoading] = React.useState(true);
  const [sales, setSales] = React.useState<SaleRow[]>([]);
  const [saleItems, setSaleItems] = React.useState<SaleItemRow[]>([]);
  const [products, setProducts] = React.useState<ProductOpt[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseOpt[]>([]);
  const [customers, setCustomers] = React.useState<CustomerOpt[]>([]);

  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [newSaleOpen, setNewSaleOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [actionTarget, setActionTarget] = React.useState<{
    sale: SaleRow;
    mode: "cancel" | "return";
  } | null>(null);

  // Quick Sale Builder
  const [customerId, setCustomerId] = React.useState("");
  const [saleDate, setSaleDate] = React.useState(
    new Date().toISOString().slice(0, 10)
  );
  const [channel, setChannel] = React.useState("Showroom");
  const [paymentMethod, setPaymentMethod] = React.useState("Cash");
  const [paymentStatus, setPaymentStatus] = React.useState<"paid" | "partial" | "unpaid">("paid");
  const [paidAmount, setPaidAmount] = React.useState(0);
  const [overrideNegative, setOverrideNegative] = React.useState(false);
  const [lines, setLines] = React.useState<DraftLine[]>([]);

  const loadSales = React.useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ organizationId: activeOrg.organizationId });
      if (startDate) qs.set("startDate", startDate);
      if (endDate) qs.set("endDate", endDate);
      const res = await fetch(`/api/sales?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to load sales", tone: "error" });
        return;
      }
      setSales(json.sales ?? []);
      setSaleItems(json.saleItems ?? []);
      setProducts(json.products ?? []);
      setWarehouses(json.warehouses ?? []);
      setCustomers(json.customers ?? []);

      if (lines.length === 0 && json.products?.[0] && json.warehouses?.[0]) {
        setLines([
          {
            product_id: json.products[0].id,
            warehouse_id: json.warehouses[0].id,
            quantity: 1,
            unit_price: Number(json.products[0].selling_price),
            discount: 0,
            tax: 0,
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [activeOrg, startDate, endDate, lines.length, toast]);

  React.useEffect(() => {
    void loadSales();
  }, [loadSales]);

  const totals = React.useMemo(
    () =>
      calculateSaleTotals(
        lines.map((l) => ({
          quantity: l.quantity,
          unitPrice: l.unit_price,
          discount: l.discount,
          tax: l.tax,
        }))
      ),
    [lines]
  );

  const handleCompleteSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg || lines.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: activeOrg.organizationId,
          customerId: customerId || null,
          saleDate,
          channel,
          paymentMethod,
          paymentStatus,
          paidAmount: paymentStatus === "partial" ? Number(paidAmount) : null,
          overrideNegative,
          items: lines,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Sale failed", tone: "error" });
        return;
      }
      toast({
        title: `Sale completed (${json.completed?.invoice_number})`,
        description: "Inventory deducted, payment recorded, and invoice generated.",
        tone: "success",
      });
      setNewSaleOpen(false);
      await loadSales();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrReturn = async () => {
    if (!activeOrg || !actionTarget) return;
    const res = await fetch("/api/sales", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: activeOrg.organizationId,
        saleId: actionTarget.sale.id,
        mode: actionTarget.mode,
        reason: `Processed via Sales Register (${actionTarget.mode})`,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: json.error || "Operation failed", tone: "error" });
      return;
    }
    toast({
      title:
        actionTarget.mode === "cancel"
          ? "Order cancelled & stock restored"
          : "Return & credit note processed",
      tone: "success",
    });
    setActionTarget(null);
    await loadSales();
  };

  // Completed sales exclude cancelled and returned orders
  const completedSales = sales.filter((s) => s.order_status === "completed");
  const totalRevenue = completedSales.reduce((s, r) => s + Number(r.grand_total), 0);
  const totalPaid = completedSales.reduce((s, r) => s + Number(r.paid_amount), 0);

  // Daily Sales Register flattened rows
  const registerRows = React.useMemo(() => {
    const map = new Map(sales.map((s) => [s.id, s]));
    return saleItems
      .map((it) => {
        const s = map.get(it.sale_id);
        if (!s) return null;
        const custName =
          customers.find((c) => c.id === s.customer_id)?.full_name ?? "Walk-in";
        return {
          id: it.id,
          date: s.sale_date,
          invoiceNumber: s.invoice_number,
          customer: custName,
          product: it.product_name_snapshot,
          sku: it.sku_snapshot,
          quantity: Number(it.quantity),
          sellingPrice: Number(it.unit_price),
          discount: Number(it.discount_amount),
          subtotal: Number(it.quantity) * Number(it.unit_price),
          total: Number(it.line_total),
          paymentMethod: s.payment_method,
          paymentStatus: s.payment_status,
          channel: s.channel,
          orderStatus: s.order_status,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [sales, saleItems, customers]);

  const registerColumns: ColumnDef<(typeof registerRows)[number]>[] = [
    { accessorKey: "date", header: "Date" },
    { accessorKey: "invoiceNumber", header: "Invoice" },
    { accessorKey: "customer", header: "Customer" },
    { accessorKey: "product", header: "Product" },
    { accessorKey: "sku", header: "SKU" },
    { accessorKey: "quantity", header: "Qty" },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => formatCurrency(row.original.total),
    },
    { accessorKey: "paymentMethod", header: "Method" },
    {
      accessorKey: "orderStatus",
      header: "Status",
      cell: ({ row }) => (
        <GlassBadge
          tone={
            row.original.orderStatus === "completed"
              ? "success"
              : row.original.orderStatus === "cancelled"
                ? "danger"
                : "warning"
          }
        >
          {row.original.orderStatus}
        </GlassBadge>
      ),
    },
  ];

  const orderColumns: ColumnDef<SaleRow>[] = [
    { accessorKey: "invoice_number", header: "Invoice" },
    { accessorKey: "sale_date", header: "Date" },
    { accessorKey: "channel", header: "Channel" },
    { accessorKey: "payment_method", header: "Payment" },
    {
      accessorKey: "grand_total",
      header: "Total",
      cell: ({ row }) => formatCurrency(Number(row.original.grand_total)),
    },
    {
      accessorKey: "order_status",
      header: "Status",
      cell: ({ row }) => (
        <GlassBadge
          tone={
            row.original.order_status === "completed"
              ? "success"
              : row.original.order_status === "cancelled"
                ? "danger"
                : "warning"
          }
        >
          {row.original.order_status}
        </GlassBadge>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.order_status === "completed" ? (
          <div className="flex gap-1">
            <GlassButton
              size="sm"
              variant="ghost"
              title="Process Return / Refund"
              onClick={() =>
                setActionTarget({ sale: row.original, mode: "return" })
              }
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </GlassButton>
            <GlassButton
              size="sm"
              variant="ghost"
              title="Cancel Order"
              onClick={() =>
                setActionTarget({ sale: row.original, mode: "cancel" })
              }
            >
              <Ban className="h-3.5 w-3.5 text-[var(--aurora-danger)]" />
            </GlassButton>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales & Daily Sales Register"
        subtitle="Atomic multi-product sales, stock deduction, returns/cancellations & register exports."
        actions={
          <>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() =>
                exportRowsToCsv("aurora-sales-register.csv", registerRows)
              }
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </GlassButton>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() =>
                exportRowsToExcel("aurora-sales-register.xlsx", "SalesRegister", registerRows)
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
                  title: "DAILY SALES REGISTER",
                  businessName: activeOrg?.organizationName ?? "Aurora BusinessHub",
                  meta: [
                    {
                      label: "Period",
                      value: `${startDate || "All"} to ${endDate || "Today"}`,
                    },
                  ],
                  columns: ["Date", "Invoice", "Customer", "Product", "Qty", "Total", "Status"],
                  rows: registerRows.map((r) => [
                    r.date,
                    r.invoiceNumber,
                    r.customer,
                    r.product,
                    r.quantity,
                    formatCurrency(r.total),
                    r.orderStatus,
                  ]),
                  filename: "aurora-sales-register.pdf",
                })
              }
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={() => setNewSaleOpen(true)}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              New Quick Sale
            </GlassButton>
          </>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-3">
        <KpiCard
          label="Completed Orders"
          value={String(completedSales.length)}
          hint="Cancelled orders excluded"
        />
        <KpiCard label="Completed Sales Revenue" value={formatCurrency(totalRevenue)} />
        <KpiCard label="Cash Receipts Collected" value={formatCurrency(totalPaid)} />
      </div>

      <GlassCard padding="sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1.5">
            <GlassButton
              size="sm"
              variant={tab === "register" ? "primary" : "ghost"}
              onClick={() => setTab("register")}
            >
              Daily Sales Register
            </GlassButton>
            <GlassButton
              size="sm"
              variant={tab === "orders" ? "primary" : "ghost"}
              onClick={() => setTab("orders")}
            >
              Sales Orders &amp; Returns
            </GlassButton>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span>From:</span>
            <GlassInput
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 w-36 text-xs"
            />
            <span>To:</span>
            <GlassInput
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 w-36 text-xs"
            />
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        {tab === "register" ? (
          <DataTable
            columns={registerColumns}
            data={registerRows}
            loading={loading}
            searchPlaceholder="Search invoice, customer, product, SKU..."
          />
        ) : (
          <DataTable
            columns={orderColumns}
            data={sales}
            loading={loading}
            searchPlaceholder="Search invoice or channel..."
          />
        )}
      </GlassCard>

      <GlassDialog
        open={newSaleOpen}
        onOpenChange={setNewSaleOpen}
        title="Quick Sale Entry"
        description="Atomically records sale, line items, stock deduction, payment, and invoice."
        maxWidth="xl"
      >
        <form onSubmit={handleCompleteSale} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Customer">
              <GlassSelect
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                options={[
                  { value: "", label: "Walk-in Customer" },
                  ...customers.map((c) => ({ value: c.id, label: c.full_name })),
                ]}
              />
            </FormField>
            <FormField label="Sale Date">
              <GlassInput
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </FormField>
            <FormField label="Sales Channel">
              <GlassSelect
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                options={[
                  { value: "Showroom", label: "Showroom" },
                  { value: "Facebook Shop", label: "Facebook Shop" },
                  { value: "Website", label: "Website" },
                  { value: "WhatsApp", label: "WhatsApp" },
                ]}
              />
            </FormField>
            <FormField label="Payment Method">
              <GlassSelect
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={[
                  { value: "Cash", label: "Cash" },
                  { value: "bKash", label: "bKash" },
                  { value: "Card", label: "Card" },
                  { value: "Bank Transfer", label: "Bank Transfer" },
                ]}
              />
            </FormField>
            <FormField label="Payment Status">
              <GlassSelect
                value={paymentStatus}
                onChange={(e) =>
                  setPaymentStatus(e.target.value as "paid" | "partial" | "unpaid")
                }
                options={[
                  { value: "paid", label: "Paid" },
                  { value: "partial", label: "Partial" },
                  { value: "unpaid", label: "Unpaid" },
                ]}
              />
            </FormField>
            {paymentStatus === "partial" && (
              <FormField label="Paid Amount">
                <GlassInput
                  type="number"
                  min={0}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                />
              </FormField>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--aurora-text-strong)]">
                Line Items
              </span>
              <GlassButton
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (!products[0] || !warehouses[0]) return;
                  setLines((prev) => [
                    ...prev,
                    {
                      product_id: products[0].id,
                      warehouse_id: warehouses[0].id,
                      quantity: 1,
                      unit_price: Number(products[0].selling_price),
                      discount: 0,
                      tax: 0,
                    },
                  ]);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Line
              </GlassButton>
            </div>

            {lines.map((line, idx) => (
              <div
                key={idx}
                className="aurora-glass-subtle grid gap-2 rounded-2xl p-3 sm:grid-cols-12"
              >
                <div className="sm:col-span-4">
                  <GlassSelect
                    value={line.product_id}
                    onChange={(e) => {
                      const p = products.find((x) => x.id === e.target.value);
                      setLines((prev) =>
                        prev.map((row, i) =>
                          i === idx
                            ? {
                                ...row,
                                product_id: e.target.value,
                                unit_price: p ? Number(p.selling_price) : row.unit_price,
                              }
                            : row
                        )
                      );
                    }}
                    options={products.map((p) => ({
                      value: p.id,
                      label: `${p.sku} — ${p.name}`,
                    }))}
                  />
                </div>
                <div className="sm:col-span-3">
                  <GlassSelect
                    value={line.warehouse_id}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, warehouse_id: e.target.value } : row
                        )
                      )
                    }
                    options={warehouses.map((w) => ({
                      value: w.id,
                      label: w.name,
                    }))}
                  />
                </div>
                <div className="sm:col-span-1">
                  <GlassInput
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, quantity: Number(e.target.value) || 1 } : row
                        )
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <GlassInput
                    type="number"
                    min={0}
                    value={line.unit_price}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, unit_price: Number(e.target.value) || 0 } : row
                        )
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-1">
                  <GlassInput
                    type="number"
                    min={0}
                    placeholder="Disc"
                    value={line.discount}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, discount: Number(e.target.value) || 0 } : row
                        )
                      )
                    }
                  />
                </div>
                <div className="flex items-center justify-end sm:col-span-1">
                  <GlassButton
                    size="icon"
                    variant="ghost"
                    disabled={lines.length <= 1}
                    onClick={() =>
                      setLines((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[var(--aurora-danger)]" />
                  </GlassButton>
                </div>
              </div>
            ))}
          </div>

          <GlassSwitch
            checked={overrideNegative}
            onCheckedChange={setOverrideNegative}
            label="Authorized Negative Stock Override"
          />

          <div className="aurora-glass-subtle flex flex-wrap items-center justify-between rounded-2xl p-3.5 text-xs">
            <span>
              Subtotal: {formatCurrency(totals.subtotal)} · Discount:{" "}
              {formatCurrency(totals.discountTotal)}
            </span>
            <strong className="text-sm text-[var(--aurora-text-strong)]">
              Grand Total: {formatCurrency(totals.grandTotal)}
            </strong>
          </div>

          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setNewSaleOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" size="sm" loading={submitting}>
              Complete Sale
            </GlassButton>
          </div>
        </form>
      </GlassDialog>

      <ConfirmDialog
        open={Boolean(actionTarget)}
        onOpenChange={(o) => !o && setActionTarget(null)}
        title={
          actionTarget?.mode === "cancel"
            ? "Cancel Sale Order?"
            : "Process Sales Return?"
        }
        description={`This will atomically restock items for ${actionTarget?.sale.invoice_number} and record any refund adjustment.`}
        confirmLabel={actionTarget?.mode === "cancel" ? "Cancel Order" : "Confirm Return"}
        onConfirm={() => void handleCancelOrReturn()}
      />
    </div>
  );
}

export default function SalesPage() {
  return (
    <BackendConnectionGuard moduleTitle="Sales & Daily Sales Register">
      <SalesWorkspace />
    </BackendConnectionGuard>
  );
}

"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Edit3, Eye, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils/format";
import { exportRowsToCsv } from "@/lib/operations/exports";
import { BackendConnectionGuard } from "@/components/operations/BackendConnectionGuard";
import {
  ConfirmDialog,
  DataTable,
  Drawer,
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

interface CustomerRow {
  id: string;
  customer_code: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  customer_type: "retail" | "wholesale";
  segment: "new" | "regular" | "vip" | "inactive" | "wholesale";
  total_orders: number;
  total_purchase_value: number;
  outstanding_balance: number;
  last_purchase_at: string | null;
  follow_up_at: string | null;
  notes: string;
  created_at: string;
}

interface CustomerSaleRow {
  id: string;
  customer_id: string | null;
  invoice_number: string;
  sale_date: string;
  grand_total: number;
  order_status: string;
  payment_status: string;
}

function CustomersWorkspace() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [sales, setSales] = React.useState<CustomerSaleRow[]>([]);
  const [segmentFilter, setSegmentFilter] = React.useState("all");

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = React.useState<CustomerRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CustomerRow | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [customerCode, setCustomerCode] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [customerType, setCustomerType] = React.useState<"retail" | "wholesale">("retail");
  const [segment, setSegment] = React.useState<"new" | "regular" | "vip" | "inactive" | "wholesale">("new");
  const [followUpAt, setFollowUpAt] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const loadData = React.useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/customers?organizationId=${activeOrg.organizationId}`
      );
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to load customers", tone: "error" });
        return;
      }
      setCustomers(json.customers ?? []);
      setSales(json.customerSales ?? []);
    } finally {
      setLoading(false);
    }
  }, [activeOrg, toast]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditingId(null);
    setCustomerCode(`CUS-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
    setFullName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setCity("");
    setCustomerType("retail");
    setSegment("new");
    setFollowUpAt("");
    setNotes("");
  };

  const openEdit = (c: CustomerRow) => {
    setEditingId(c.id);
    setCustomerCode(c.customer_code);
    setFullName(c.full_name);
    setPhone(c.phone);
    setEmail(c.email);
    setAddress(c.address);
    setCity(c.city);
    setCustomerType(c.customer_type);
    setSegment(c.segment);
    setFollowUpAt(c.follow_up_at ?? "");
    setNotes(c.notes);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? undefined,
          organizationId: activeOrg.organizationId,
          customerCode,
          fullName,
          phone,
          email,
          address,
          city,
          customerType,
          segment,
          followUpAt: followUpAt || null,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to save customer", tone: "error" });
        return;
      }
      toast({ title: editingId ? "Customer updated" : "Customer added", tone: "success" });
      setModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeOrg || !deleteTarget) return;
    const res = await fetch(
      `/api/customers?organizationId=${activeOrg.organizationId}&id=${deleteTarget.id}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast({ title: "Customer deleted", tone: "success" });
      setDeleteTarget(null);
      await loadData();
    }
  };

  const filtered = React.useMemo(
    () =>
      segmentFilter === "all"
        ? customers
        : customers.filter((c) => c.segment === segmentFilter),
    [customers, segmentFilter]
  );

  const totalClv = customers.reduce((s, c) => s + Number(c.total_purchase_value), 0);
  const vipCount = customers.filter((c) => c.segment === "vip").length;
  const repeatCount = customers.filter((c) => c.total_orders >= 2).length;
  const outstandingTotal = customers.reduce((s, c) => s + Number(c.outstanding_balance), 0);

  const columns: ColumnDef<CustomerRow>[] = [
    {
      accessorKey: "full_name",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-[var(--aurora-text-strong)]">
            {row.original.full_name}
          </div>
          <div className="text-[11px] text-[var(--aurora-text-muted)]">
            {row.original.customer_code} · {row.original.phone || row.original.email || "—"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "segment",
      header: "Segment",
      cell: ({ row }) => (
        <GlassBadge tone={row.original.segment === "vip" ? "success" : "info"}>
          {row.original.segment}
        </GlassBadge>
      ),
    },
    { accessorKey: "total_orders", header: "Orders" },
    {
      accessorKey: "total_purchase_value",
      header: "CLV",
      cell: ({ row }) => formatCurrency(Number(row.original.total_purchase_value)),
    },
    {
      accessorKey: "outstanding_balance",
      header: "Outstanding",
      cell: ({ row }) => formatCurrency(Number(row.original.outstanding_balance)),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <GlassButton size="sm" variant="ghost" onClick={() => setDetailCustomer(row.original)}>
            <Eye className="h-3.5 w-3.5" />
          </GlassButton>
          <GlassButton size="sm" variant="ghost" onClick={() => openEdit(row.original)}>
            <Edit3 className="h-3.5 w-3.5" />
          </GlassButton>
          <GlassButton size="sm" variant="ghost" onClick={() => setDeleteTarget(row.original)}>
            <Trash2 className="h-3.5 w-3.5 text-[var(--aurora-danger)]" />
          </GlassButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customer CRM"
        subtitle="Customer profiles, VIP/Wholesale segmentation, CLV, repeat buyers & follow-up reminders."
        actions={
          <>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => exportRowsToCsv("aurora-customers.csv", filtered)}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Customer
            </GlassButton>
          </>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Customers" value={String(customers.length)} />
        <KpiCard label="VIP Customers" value={String(vipCount)} />
        <KpiCard label="Repeat Buyers" value={String(repeatCount)} />
        <KpiCard
          label="Cumulative CLV / Receivable"
          value={formatCurrency(totalClv)}
          hint={`Outstanding: ${formatCurrency(outstandingTotal)}`}
        />
      </div>

      <GlassCard overflow="visible" className="relative z-20 overflow-visible">
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          searchPlaceholder="Search customer name, phone, city..."
          toolbarExtra={
            <FilterDropdown
              label="Segment"
              value={segmentFilter}
              onChange={setSegmentFilter}
              options={[
                { value: "all", label: "All Segments" },
                { value: "new", label: "New" },
                { value: "regular", label: "Regular" },
                { value: "vip", label: "VIP" },
                { value: "wholesale", label: "Wholesale" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          }
        />
      </GlassCard>

      <GlassDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingId ? "Edit Customer" : "Add Customer"}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Customer Code" required>
              <GlassInput value={customerCode} onChange={(e) => setCustomerCode(e.target.value)} required />
            </FormField>
            <FormField label="Full Name" required>
              <GlassInput value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </FormField>
            <FormField label="Phone">
              <GlassInput value={phone} onChange={(e) => setPhone(e.target.value)} />
            </FormField>
            <FormField label="Email">
              <GlassInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormField>
            <FormField label="City">
              <GlassInput value={city} onChange={(e) => setCity(e.target.value)} />
            </FormField>
            <FormField label="Follow-Up Reminder Date">
              <GlassInput type="date" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} />
            </FormField>
            <FormField label="Customer Type">
              <GlassSelect
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as "retail" | "wholesale")}
                options={[
                  { value: "retail", label: "Retail" },
                  { value: "wholesale", label: "Wholesale" },
                ]}
              />
            </FormField>
            <FormField label="Segment">
              <GlassSelect
                value={segment}
                onChange={(e) => setSegment(e.target.value as CustomerRow["segment"])}
                options={[
                  { value: "new", label: "New Customer" },
                  { value: "regular", label: "Regular Customer" },
                  { value: "vip", label: "VIP Customer" },
                  { value: "wholesale", label: "Wholesale Customer" },
                  { value: "inactive", label: "Inactive Customer" },
                ]}
              />
            </FormField>
          </div>
          <FormField label="Address">
            <GlassInput value={address} onChange={(e) => setAddress(e.target.value)} />
          </FormField>
          <FormField label="Notes">
            <GlassTextarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</GlassButton>
            <GlassButton type="submit" variant="primary" size="sm" loading={saving}>Save Customer</GlassButton>
          </div>
        </form>
      </GlassDialog>

      <Drawer
        open={Boolean(detailCustomer)}
        onOpenChange={(o) => !o && setDetailCustomer(null)}
        title={detailCustomer?.full_name ?? "Customer"}
        description="Customer lifetime value & purchase history"
      >
        {detailCustomer && (
          <div className="space-y-4">
            <div className="aurora-glass-subtle rounded-2xl p-4 text-xs space-y-1.5">
              <div><strong>Code:</strong> {detailCustomer.customer_code}</div>
              <div><strong>Contact:</strong> {detailCustomer.phone || "—"} · {detailCustomer.email || "—"}</div>
              <div><strong>CLV:</strong> {formatCurrency(Number(detailCustomer.total_purchase_value))} ({detailCustomer.total_orders} orders)</div>
              <div><strong>Follow-up:</strong> {detailCustomer.follow_up_at || "None"}</div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[var(--aurora-text-strong)]">Order History</div>
              {sales.filter((s) => s.customer_id === detailCustomer.id).map((s) => (
                <div key={s.id} className="aurora-glass-subtle flex items-center justify-between rounded-xl px-3 py-2 text-xs">
                  <div>
                    <div className="font-semibold text-[var(--aurora-text-strong)]">{s.invoice_number}</div>
                    <div className="text-[11px] text-[var(--aurora-text-muted)]">{s.sale_date} · {s.order_status}</div>
                  </div>
                  <strong>{formatCurrency(Number(s.grand_total))}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Customer?"
        description={`Delete "${deleteTarget?.full_name}"?`}
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

export default function CustomersPage() {
  return (
    <BackendConnectionGuard moduleTitle="Customer CRM">
      <CustomersWorkspace />
    </BackendConnectionGuard>
  );
}

"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Download, PackageCheck, Plus, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/auth/rbac";
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

interface PoRow {
  id: string;
  supplier_id: string;
  po_number: string;
  status: string;
  purchase_date: string;
  expected_delivery: string | null;
  currency: string;
  shipping_cost: number;
  additional_costs: number;
  total_amount: number;
  payment_terms: string;
  notes: string;
}

interface PoItemRow {
  id: string;
  po_id: string;
  product_id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
}

interface SupplierOpt {
  id: string;
  name: string;
  currency: string;
}

interface ProductOpt {
  id: string;
  sku: string;
  name: string;
  purchase_cost: number;
}

interface WarehouseOpt {
  id: string;
  name: string;
}

function PurchasesWorkspace() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [pos, setPos] = React.useState<PoRow[]>([]);
  const [poItems, setPoItems] = React.useState<PoItemRow[]>([]);
  const [suppliers, setSuppliers] = React.useState<SupplierOpt[]>([]);
  const [products, setProducts] = React.useState<ProductOpt[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseOpt[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [receivePo, setReceivePo] = React.useState<PoRow | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Create PO form
  const [supplierId, setSupplierId] = React.useState("");
  const [purchaseDate, setPurchaseDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [expectedDelivery, setExpectedDelivery] = React.useState("");
  const [currency, setCurrency] = React.useState("SAR");
  const [exchangeRate, setExchangeRate] = React.useState(32);
  const [shippingCost, setShippingCost] = React.useState(0);
  const [additionalCosts, setAdditionalCosts] = React.useState(0);
  const [paymentTerms, setPaymentTerms] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [prodId, setProdId] = React.useState("");
  const [qty, setQty] = React.useState(10);
  const [unitPrice, setUnitPrice] = React.useState(0);

  // Receiving modal state
  const [recvWarehouseId, setRecvWarehouseId] = React.useState("");
  const [recvBatch, setRecvBatch] = React.useState("BATCH-01");
  const [recvQtyMap, setRecvQtyMap] = React.useState<Record<string, number>>({});

  const canApprove = activeOrg
    ? hasPermission(activeOrg.roleKey, "purchases.write") &&
      ["owner", "admin", "manager"].includes(activeOrg.roleKey)
    : false;

  const loadData = React.useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/purchase-orders?organizationId=${activeOrg.organizationId}`
      );
      const json = await res.json();
      if (res.ok) {
        setPos(json.purchaseOrders ?? []);
        setPoItems(json.poItems ?? []);
        setSuppliers(json.suppliers ?? []);
        setProducts(json.products ?? []);
        setWarehouses(json.warehouses ?? []);
        if (!supplierId && json.suppliers?.[0]?.id) setSupplierId(json.suppliers[0].id);
        if (!prodId && json.products?.[0]?.id) {
          setProdId(json.products[0].id);
          setUnitPrice(Number(json.products[0].purchase_cost));
        }
        if (!recvWarehouseId && json.warehouses?.[0]?.id) {
          setRecvWarehouseId(json.warehouses[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [activeOrg, supplierId, prodId, recvWarehouseId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    const prod = products.find((p) => p.id === prodId);
    if (!prod || !supplierId) {
      toast({ title: "Select a supplier and product first.", tone: "warning" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: activeOrg.organizationId,
          supplierId,
          purchaseDate,
          expectedDelivery: expectedDelivery || null,
          currency,
          exchangeRate: Number(exchangeRate) || 1,
          shippingCost: Number(shippingCost) || 0,
          additionalCosts: Number(additionalCosts) || 0,
          paymentTerms,
          notes,
          items: [
            {
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              quantity: Number(qty) || 1,
              unitPrice: Number(unitPrice) || 0,
            },
          ],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to create PO", tone: "error" });
        return;
      }
      toast({
        title: `Created ${json.purchaseOrder?.po_number} (Draft)`,
        tone: "success",
      });
      setCreateOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleTransition = async (poId: string, nextStatus: string) => {
    if (!activeOrg) return;
    const res = await fetch("/api/purchase-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "status",
        organizationId: activeOrg.organizationId,
        poId,
        nextStatus,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: json.error || "Status update failed", tone: "error" });
      return;
    }
    toast({ title: `PO moved to ${nextStatus}`, tone: "success" });
    await loadData();
  };

  const openReceivingModal = (po: PoRow) => {
    const items = poItems.filter((i) => i.po_id === po.id);
    const init: Record<string, number> = {};
    for (const it of items) {
      init[it.id] = Math.max(0, Number(it.quantity_ordered) - Number(it.quantity_received));
    }
    setRecvQtyMap(init);
    setReceivePo(po);
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg || !receivePo) return;
    const items = poItems
      .filter((i) => i.po_id === receivePo.id)
      .map((i) => ({
        po_item_id: i.id,
        quantity: Number(recvQtyMap[i.id] ?? 0),
        batch_number: recvBatch,
      }))
      .filter((x) => x.quantity > 0);

    if (items.length === 0) {
      toast({ title: "Enter at least one positive quantity to receive.", tone: "warning" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "receive",
          organizationId: activeOrg.organizationId,
          poId: receivePo.id,
          warehouseId: recvWarehouseId,
          additionalCosts: 0,
          items,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Receiving failed", tone: "error" });
        return;
      }
      toast({
        title: `Stock received (${json.received?.purchase_number})`,
        description: `PO status: ${json.received?.po_status}`,
        tone: "success",
      });
      setReceivePo(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = (po: PoRow) => {
    const sup = suppliers.find((s) => s.id === po.supplier_id)?.name ?? "Supplier";
    const lines = poItems.filter((i) => i.po_id === po.id);
    exportDocumentPdf({
      title: "PURCHASE ORDER",
      subtitle: po.po_number,
      businessName: activeOrg?.organizationName ?? "Aurora BusinessHub",
      meta: [
        { label: "Supplier", value: sup },
        { label: "Purchase Date", value: po.purchase_date },
        { label: "Status", value: po.status.toUpperCase() },
      ],
      columns: ["SKU", "Product", "Ordered", "Received", "Unit Price"],
      rows: lines.map((l) => [
        l.sku_snapshot,
        l.product_name_snapshot,
        l.quantity_ordered,
        l.quantity_received,
        `${l.unit_price} ${po.currency}`,
      ]),
      totals: [
        { label: "Total Amount", value: `${po.total_amount} ${po.currency}` },
      ],
      filename: `${po.po_number}.pdf`,
    });
  };

  const columns: ColumnDef<PoRow>[] = [
    { accessorKey: "po_number", header: "PO #" },
    {
      accessorKey: "supplier_id",
      header: "Supplier",
      cell: ({ row }) =>
        suppliers.find((s) => s.id === row.original.supplier_id)?.name ?? "Supplier",
    },
    {
      accessorKey: "status",
      header: "Workflow Status",
      cell: ({ row }) => (
        <GlassBadge
          tone={
            row.original.status === "received"
              ? "success"
              : row.original.status === "cancelled"
                ? "danger"
                : "info"
          }
        >
          {row.original.status}
        </GlassBadge>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Total",
      cell: ({ row }) => `${row.original.total_amount} ${row.original.currency}`,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const st = row.original.status;
        return (
          <div className="flex flex-wrap items-center gap-1">
            {st === "draft" && (
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={() => void handleTransition(row.original.id, "review")}
              >
                <Send className="h-3.5 w-3.5" />
                Review
              </GlassButton>
            )}
            {(st === "draft" || st === "review") && canApprove && (
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={() => void handleTransition(row.original.id, "approved")}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aurora-success)]" />
                Approve
              </GlassButton>
            )}
            {st === "approved" && (
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={() => void handleTransition(row.original.id, "ordered")}
              >
                Mark Ordered
              </GlassButton>
            )}
            {["approved", "ordered", "partially_received"].includes(st) && (
              <GlassButton
                size="sm"
                variant="secondary"
                onClick={() => openReceivingModal(row.original)}
              >
                <PackageCheck className="h-3.5 w-3.5" />
                Receive
              </GlassButton>
            )}
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => handleExportPdf(row.original)}
            >
              <Download className="h-3.5 w-3.5" />
            </GlassButton>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchases & Purchase Order Generator"
        subtitle="Draft → Review → Authorized Approval → Ordered → Partial/Full Receiving with automatic inventory updates & PDF export."
        actions={
          <GlassButton variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Create Purchase Order
          </GlassButton>
        }
      />

      <GlassCard>
        <DataTable
          columns={columns}
          data={pos}
          loading={loading}
          searchPlaceholder="Search PO number or status..."
        />
      </GlassCard>

      <GlassDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Purchase Order (Draft)"
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePo} className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Supplier" required>
              <GlassSelect
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              />
            </FormField>
            <FormField label="Product" required>
              <GlassSelect
                value={prodId}
                onChange={(e) => {
                  const p = products.find((x) => x.id === e.target.value);
                  setProdId(e.target.value);
                  if (p) setUnitPrice(Number(p.purchase_cost));
                }}
                options={products.map((p) => ({
                  value: p.id,
                  label: `${p.sku} — ${p.name}`,
                }))}
              />
            </FormField>
            <FormField label="Quantity">
              <GlassInput
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Unit Price">
              <GlassInput
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Currency">
              <GlassSelect
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: "SAR", label: "SAR" },
                  { value: "USD", label: "USD" },
                  { value: "BDT", label: "BDT" },
                ]}
              />
            </FormField>
            <FormField label="FX Rate to Base Currency">
              <GlassInput
                type="number"
                min={0.01}
                step="0.01"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Shipping Cost">
              <GlassInput
                type="number"
                min={0}
                value={shippingCost}
                onChange={(e) => setShippingCost(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Additional Costs">
              <GlassInput
                type="number"
                min={0}
                value={additionalCosts}
                onChange={(e) => setAdditionalCosts(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Purchase Date">
              <GlassInput
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </FormField>
            <FormField label="Expected Delivery">
              <GlassInput
                type="date"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Payment Terms">
            <GlassInput
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g. 50% Advance / 50% on Receipt"
            />
          </FormField>
          <FormField label="Notes">
            <GlassTextarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" size="sm" loading={saving}>
              Save Draft PO
            </GlassButton>
          </div>
        </form>
      </GlassDialog>

      <GlassDialog
        open={Boolean(receivePo)}
        onOpenChange={(o) => !o && setReceivePo(null)}
        title={`Receive Stock for ${receivePo?.po_number ?? ""}`}
        description="Supports partial or full receiving; atomically updates inventory and movement logs."
        maxWidth="lg"
      >
        {receivePo && (
          <form onSubmit={handleReceive} className="space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Destination Warehouse" required>
                <GlassSelect
                  value={recvWarehouseId}
                  onChange={(e) => setRecvWarehouseId(e.target.value)}
                  options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                />
              </FormField>
              <FormField label="Batch Number">
                <GlassInput
                  value={recvBatch}
                  onChange={(e) => setRecvBatch(e.target.value)}
                />
              </FormField>
            </div>
            <div className="space-y-2">
              {poItems
                .filter((i) => i.po_id === receivePo.id)
                .map((it) => {
                  const remaining = Math.max(
                    0,
                    Number(it.quantity_ordered) - Number(it.quantity_received)
                  );
                  return (
                    <div
                      key={it.id}
                      className="aurora-glass-subtle flex items-center justify-between gap-3 rounded-2xl p-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[var(--aurora-text-strong)]">
                          {it.product_name_snapshot} ({it.sku_snapshot})
                        </div>
                        <div className="text-[var(--aurora-text-muted)]">
                          Ordered: {it.quantity_ordered} · Received: {it.quantity_received} · Remaining: {remaining}
                        </div>
                      </div>
                      <GlassInput
                        type="number"
                        min={0}
                        max={remaining}
                        value={recvQtyMap[it.id] ?? 0}
                        onChange={(e) =>
                          setRecvQtyMap((prev) => ({
                            ...prev,
                            [it.id]: Number(e.target.value) || 0,
                          }))
                        }
                        className="h-9 w-24"
                      />
                    </div>
                  );
                })}
            </div>
            <div className="flex justify-end gap-2">
              <GlassButton variant="ghost" size="sm" onClick={() => setReceivePo(null)}>
                Cancel
              </GlassButton>
              <GlassButton type="submit" variant="primary" size="sm" loading={saving}>
                Confirm Receiving
              </GlassButton>
            </div>
          </form>
        )}
      </GlassDialog>
    </div>
  );
}

export default function PurchasesPage() {
  return (
    <BackendConnectionGuard moduleTitle="Purchases & Purchase Orders">
      <PurchasesWorkspace />
    </BackendConnectionGuard>
  );
}

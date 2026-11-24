"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeftRight, Download, Plus, Upload, Warehouse } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils/format";
import {
  exportRowsToCsv,
  exportRowsToExcel,
  parseSpreadsheetFile,
} from "@/lib/operations/exports";
import { BackendConnectionGuard } from "@/components/operations/BackendConnectionGuard";
import {
  DataTable,
  FormField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  GlassDialog,
  GlassInput,
  GlassSelect,
  GlassSwitch,
  KpiCard,
  PageHeader,
  useToast,
} from "@/components/ui";

interface InventoryRow {
  id: string;
  product_id: string;
  warehouse_id: string;
  batch_number: string;
  quantity_on_hand: number;
  unit_landed_cost: number;
}

interface WarehouseRow {
  id: string;
  name: string;
  code: string;
}

interface ProductSummary {
  id: string;
  sku: string;
  name: string;
  min_stock: number;
  purchase_cost: number;
}

interface MovementRow {
  id: string;
  product_id: string;
  warehouse_id: string;
  batch_number: string;
  movement_type: string;
  quantity_delta: number;
  quantity_after: number;
  notes: string;
  created_at: string;
}

function InventoryWorkspace() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [inventory, setInventory] = React.useState<InventoryRow[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseRow[]>([]);
  const [products, setProducts] = React.useState<ProductSummary[]>([]);
  const [movements, setMovements] = React.useState<MovementRow[]>([]);

  const [moveOpen, setMoveOpen] = React.useState(false);
  const [whOpen, setWhOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [movementType, setMovementType] = React.useState<
    "stock_in" | "stock_out" | "adjustment" | "transfer_out"
  >("stock_in");
  const [productId, setProductId] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState("");
  const [targetWarehouseId, setTargetWarehouseId] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [batchNumber, setBatchNumber] = React.useState("DEFAULT");
  const [unitCost, setUnitCost] = React.useState(0);
  const [notes, setNotes] = React.useState("");
  const [overrideNegative, setOverrideNegative] = React.useState(false);

  const [whName, setWhName] = React.useState("");
  const [whCode, setWhCode] = React.useState("");
  const [whAddress, setWhAddress] = React.useState("");

  const loadData = React.useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/inventory?organizationId=${activeOrg.organizationId}`
      );
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to load inventory", tone: "error" });
        return;
      }
      setInventory(json.inventory ?? []);
      setWarehouses(json.warehouses ?? []);
      setProducts(json.products ?? []);
      setMovements(json.movements ?? []);
      if (!productId && json.products?.[0]?.id) setProductId(json.products[0].id);
      if (!warehouseId && json.warehouses?.[0]?.id) setWarehouseId(json.warehouses[0].id);
    } finally {
      setLoading(false);
    }
  }, [activeOrg, productId, warehouseId, toast]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "movement",
          organizationId: activeOrg.organizationId,
          productId,
          warehouseId,
          movementType,
          quantity: Number(quantity),
          batchNumber,
          unitCost: Number(unitCost) || 0,
          targetWarehouseId:
            movementType === "transfer_out" ? targetWarehouseId || null : null,
          notes,
          overrideNegative,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Movement failed", tone: "error" });
        return;
      }
      toast({
        title: "Stock updated atomically",
        description: `New quantity on hand: ${json.result?.quantity_after}`,
        tone: "success",
      });
      setMoveOpen(false);
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "warehouse",
          organizationId: activeOrg.organizationId,
          name: whName,
          code: whCode,
          address: whAddress,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Warehouse creation failed", tone: "error" });
        return;
      }
      toast({ title: `Warehouse "${whName}" created`, tone: "success" });
      setWhOpen(false);
      setWhName("");
      setWhCode("");
      setWhAddress("");
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeOrg) return;
    const { rows, duplicates } = await parseSpreadsheetFile(file);
    if (duplicates.length > 0) {
      toast({
        title: "Duplicate SKUs detected in spreadsheet",
        description: `Duplicates: ${duplicates.slice(0, 5).join(", ")}`,
        tone: "error",
      });
      return;
    }

    let imported = 0;
    for (const r of rows) {
      const sku = String(r.sku ?? r.SKU ?? "").trim();
      const qty = Number(r.quantity ?? r.Quantity ?? 0);
      const prod = products.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
      if (!prod || !warehouseId || qty <= 0) continue;
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "movement",
          organizationId: activeOrg.organizationId,
          productId: prod.id,
          warehouseId,
          movementType: "stock_in",
          quantity: qty,
          batchNumber: String(r.batch ?? "DEFAULT"),
          notes: "Bulk CSV/Excel import",
        }),
      });
      if (res.ok) imported += 1;
    }
    toast({
      title: `Bulk stock-in processed (${imported} rows matched)`,
      tone: imported > 0 ? "success" : "warning",
    });
    await loadData();
  };

  const enrichedInventory = React.useMemo(
    () =>
      inventory.map((row) => {
        const prod = products.find((p) => p.id === row.product_id);
        const wh = warehouses.find((w) => w.id === row.warehouse_id);
        const qty = Number(row.quantity_on_hand);
        const min = Number(prod?.min_stock ?? 0);
        const status =
          qty <= 0 ? "Out of Stock" : qty <= min ? "Low Stock" : "Healthy";
        return {
          ...row,
          sku: prod?.sku ?? "—",
          productName: prod?.name ?? "Product",
          warehouseName: wh?.name ?? "Warehouse",
          valuation: qty * Number(row.unit_landed_cost || prod?.purchase_cost || 0),
          status,
        };
      }),
    [inventory, products, warehouses]
  );

  const totalUnits = enrichedInventory.reduce((s, r) => s + Number(r.quantity_on_hand), 0);
  const totalValuation = enrichedInventory.reduce((s, r) => s + r.valuation, 0);
  const lowCount = enrichedInventory.filter((r) => r.status === "Low Stock").length;
  const outCount = enrichedInventory.filter((r) => r.status === "Out of Stock").length;

  const invColumns: ColumnDef<(typeof enrichedInventory)[number]>[] = [
    { accessorKey: "sku", header: "SKU" },
    { accessorKey: "productName", header: "Product" },
    { accessorKey: "warehouseName", header: "Warehouse" },
    { accessorKey: "batch_number", header: "Batch" },
    { accessorKey: "quantity_on_hand", header: "On Hand" },
    {
      accessorKey: "valuation",
      header: "Valuation",
      cell: ({ row }) => formatCurrency(row.original.valuation),
    },
    {
      accessorKey: "status",
      header: "Alert Status",
      cell: ({ row }) => (
        <GlassBadge
          tone={
            row.original.status === "Out of Stock"
              ? "danger"
              : row.original.status === "Low Stock"
                ? "warning"
                : "success"
          }
        >
          {row.original.status}
        </GlassBadge>
      ),
    },
  ];

  const movColumns: ColumnDef<MovementRow>[] = [
    {
      accessorKey: "created_at",
      header: "Timestamp",
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
    {
      accessorKey: "product_id",
      header: "Product",
      cell: ({ row }) =>
        products.find((p) => p.id === row.original.product_id)?.name ?? "Product",
    },
    {
      accessorKey: "movement_type",
      header: "Type",
      cell: ({ row }) => <GlassBadge tone="info">{row.original.movement_type}</GlassBadge>,
    },
    { accessorKey: "quantity_delta", header: "Delta" },
    { accessorKey: "quantity_after", header: "After" },
    { accessorKey: "notes", header: "Notes" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory & Warehouse Management"
        subtitle="Transactional stock movements, batch tracking, valuation, non-negative stock guard, and bulk import/export."
        actions={
          <>
            <label className="aurora-glass inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[14px] px-3 text-xs font-medium text-[var(--aurora-text-strong)]">
              <Upload className="h-3.5 w-3.5" />
              Bulk Import
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleBulkImport}
              />
            </label>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() =>
                exportRowsToCsv("aurora-inventory.csv", enrichedInventory)
              }
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </GlassButton>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() =>
                exportRowsToExcel("aurora-inventory.xlsx", "Inventory", enrichedInventory)
              }
            >
              <Download className="h-3.5 w-3.5" />
              Excel
            </GlassButton>
            <GlassButton variant="secondary" size="sm" onClick={() => setWhOpen(true)}>
              <Warehouse className="h-3.5 w-3.5" />
              New Warehouse
            </GlassButton>
            <GlassButton variant="primary" size="sm" onClick={() => setMoveOpen(true)}>
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Stock Movement
            </GlassButton>
          </>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Units on Hand" value={totalUnits.toLocaleString()} />
        <KpiCard label="Inventory Valuation" value={formatCurrency(totalValuation)} />
        <KpiCard
          label="Low Stock Alerts"
          value={String(lowCount)}
          trend={lowCount > 0 ? "down" : "up"}
        />
        <KpiCard
          label="Out of Stock"
          value={String(outCount)}
          trend={outCount > 0 ? "down" : "up"}
        />
      </div>

      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle>Warehouse Stock &amp; Batch Ledger</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <DataTable
            columns={invColumns}
            data={enrichedInventory}
            loading={loading}
            searchPlaceholder="Search SKU, product, batch, warehouse..."
          />
        </GlassCardContent>
      </GlassCard>

      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle>Immutable Movement History</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <DataTable
            columns={movColumns}
            data={movements}
            loading={loading}
            searchPlaceholder="Filter movement history..."
          />
        </GlassCardContent>
      </GlassCard>

      <GlassDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        title="Record Stock Movement"
        description="Executes inside a PostgreSQL transaction with automatic movement logging."
      >
        <form onSubmit={handleMovement} className="space-y-3.5">
          <FormField label="Movement Type">
            <GlassSelect
              value={movementType}
              onChange={(e) =>
                setMovementType(
                  e.target.value as "stock_in" | "stock_out" | "adjustment" | "transfer_out"
                )
              }
              options={[
                { value: "stock_in", label: "Stock In" },
                { value: "stock_out", label: "Stock Out" },
                { value: "adjustment", label: "Stock Adjustment (Set Exact Qty)" },
                { value: "transfer_out", label: "Warehouse Transfer" },
              ]}
            />
          </FormField>
          <FormField label="Product" required>
            <GlassSelect
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              options={products.map((p) => ({
                value: p.id,
                label: `${p.sku} — ${p.name}`,
              }))}
            />
          </FormField>
          <FormField label={movementType === "transfer_out" ? "Source Warehouse" : "Warehouse"} required>
            <GlassSelect
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            />
          </FormField>
          {movementType === "transfer_out" && (
            <FormField label="Destination Warehouse" required>
              <GlassSelect
                value={targetWarehouseId}
                onChange={(e) => setTargetWarehouseId(e.target.value)}
                options={[
                  { value: "", label: "Select destination..." },
                  ...warehouses
                    .filter((w) => w.id !== warehouseId)
                    .map((w) => ({ value: w.id, label: w.name })),
                ]}
              />
            </FormField>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Quantity" required>
              <GlassInput
                type="number"
                min={0}
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
            </FormField>
            <FormField label="Batch Number">
              <GlassInput
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
              />
            </FormField>
            <FormField label="Unit Cost">
              <GlassInput
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
              />
            </FormField>
          </div>
          <FormField label="Notes">
            <GlassInput value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          <GlassSwitch
            checked={overrideNegative}
            onCheckedChange={setOverrideNegative}
            label="Authorize Negative Stock Override"
            description="Only succeeds if enabled in Business Settings and user is Owner/Admin/Manager."
          />
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setMoveOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" size="sm" loading={submitting}>
              Commit Movement
            </GlassButton>
          </div>
        </form>
      </GlassDialog>

      <GlassDialog
        open={whOpen}
        onOpenChange={setWhOpen}
        title="Add Warehouse"
      >
        <form onSubmit={handleCreateWarehouse} className="space-y-3.5">
          <FormField label="Warehouse Name" required>
            <GlassInput
              value={whName}
              onChange={(e) => setWhName(e.target.value)}
              required
            />
          </FormField>
          <FormField label="Warehouse Code" required>
            <GlassInput
              value={whCode}
              onChange={(e) => setWhCode(e.target.value)}
              placeholder="WH-02"
              required
            />
          </FormField>
          <FormField label="Address">
            <GlassInput
              value={whAddress}
              onChange={(e) => setWhAddress(e.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setWhOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" size="sm" loading={submitting}>
              <Plus className="h-3.5 w-3.5" />
              Create Warehouse
            </GlassButton>
          </div>
        </form>
      </GlassDialog>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <BackendConnectionGuard moduleTitle="Inventory Management">
      <InventoryWorkspace />
    </BackendConnectionGuard>
  );
}

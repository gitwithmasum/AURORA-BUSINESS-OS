"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Edit3, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils/format";
import { validateStorageUpload } from "@/lib/storage/buckets";
import { BackendConnectionGuard } from "@/components/operations/BackendConnectionGuard";
import {
  ConfirmDialog,
  DataTable,
  FilterDropdown,
  FormField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassDialog,
  GlassInput,
  GlassSelect,
  GlassSwitch,
  GlassTextarea,
  PageHeader,
  useToast,
} from "@/components/ui";

interface ProductRow {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category_id: string;
  brand_id: string | null;
  default_supplier_id: string | null;
  supplier_invoice_ref: string;
  image_path: string | null;
  description: string;
  unit: string;
  purchase_cost: number;
  selling_price: number;
  min_stock: number;
  status: "active" | "draft" | "archived";
  notes: string;
}

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
}

interface AttributeDef {
  id: string;
  category_id: string;
  key: string;
  label: string;
  data_type: "text" | "number" | "select" | "boolean" | "date";
  options: string[];
  unit: string | null;
  is_required: boolean;
}

interface BrandRow {
  id: string;
  name: string;
}

interface SupplierRow {
  id: string;
  name: string;
  supplier_code: string;
}

interface AttrValueRow {
  product_id: string;
  attribute_id: string;
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
}

function ProductsWorkspace() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [categories, setCategories] = React.useState<CategoryRow[]>([]);
  const [attributes, setAttributes] = React.useState<AttributeDef[]>([]);
  const [brands, setBrands] = React.useState<BrandRow[]>([]);
  const [suppliers, setSuppliers] = React.useState<SupplierRow[]>([]);
  const [attrValues, setAttrValues] = React.useState<AttrValueRow[]>([]);

  const [catFilter, setCatFilter] = React.useState("all");
  const [brandFilter, setBrandFilter] = React.useState("all");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ProductRow | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [sku, setSku] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [name, setName] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [brandId, setBrandId] = React.useState("");
  const [supplierId, setSupplierId] = React.useState("");
  const [supplierInvoiceRef, setSupplierInvoiceRef] = React.useState("");
  const [imagePath, setImagePath] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState("");
  const [unit, setUnit] = React.useState("pcs");
  const [purchaseCost, setPurchaseCost] = React.useState(0);
  const [sellingPrice, setSellingPrice] = React.useState(0);
  const [minStock, setMinStock] = React.useState(5);
  const [status, setStatus] = React.useState<"active" | "draft" | "archived">("active");
  const [notes, setNotes] = React.useState("");
  const [attrMap, setAttrMap] = React.useState<Record<string, string | number | boolean>>({});

  const loadData = React.useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/products?organizationId=${activeOrg.organizationId}`
      );
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to load products", tone: "error" });
        return;
      }
      setProducts(json.products ?? []);
      setCategories(json.categories ?? []);
      setAttributes(json.attributes ?? []);
      setBrands(json.brands ?? []);
      setSuppliers(json.suppliers ?? []);
      setAttrValues(json.attributeValues ?? []);
      if (!categoryId && json.categories?.[0]?.id) {
        setCategoryId(json.categories[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [activeOrg, categoryId, toast]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditingId(null);
    setSku("");
    setBarcode("");
    setName("");
    setCategoryId(categories[0]?.id ?? "");
    setBrandId("");
    setSupplierId("");
    setSupplierInvoiceRef("");
    setImagePath(null);
    setDescription("");
    setUnit("pcs");
    setPurchaseCost(0);
    setSellingPrice(0);
    setMinStock(5);
    setStatus("active");
    setNotes("");
    setAttrMap({});
  };

  const openEdit = (p: ProductRow) => {
    setEditingId(p.id);
    setSku(p.sku);
    setBarcode(p.barcode ?? "");
    setName(p.name);
    setCategoryId(p.category_id);
    setBrandId(p.brand_id ?? "");
    setSupplierId(p.default_supplier_id ?? "");
    setSupplierInvoiceRef(p.supplier_invoice_ref ?? "");
    setImagePath(p.image_path);
    setDescription(p.description ?? "");
    setUnit(p.unit ?? "pcs");
    setPurchaseCost(Number(p.purchase_cost));
    setSellingPrice(Number(p.selling_price));
    setMinStock(Number(p.min_stock));
    setStatus(p.status);
    setNotes(p.notes ?? "");

    const existingMap: Record<string, string | number | boolean> = {};
    const pAttrs = attrValues.filter((v) => v.product_id === p.id);
    for (const val of pAttrs) {
      const def = attributes.find((a) => a.id === val.attribute_id);
      if (!def) continue;
      if (def.data_type === "number" && val.value_number != null) {
        existingMap[def.key] = val.value_number;
      } else if (def.data_type === "boolean" && val.value_boolean != null) {
        existingMap[def.key] = val.value_boolean;
      } else if (val.value_text != null) {
        existingMap[def.key] = val.value_text;
      }
    }
    setAttrMap(existingMap);
    setModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeOrg) return;
    const check = validateStorageUpload("product-images", {
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
    fd.append("bucket", "product-images");
    fd.append("file", file);
    const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: json.error || "Image upload failed", tone: "error" });
      return;
    }
    setImagePath(json.path);
    toast({ title: "Product image uploaded", tone: "success" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setSaving(true);
    try {
      const payload = {
        id: editingId ?? undefined,
        organizationId: activeOrg.organizationId,
        sku,
        barcode,
        name,
        categoryId,
        brandId: brandId || null,
        defaultSupplierId: supplierId || null,
        supplierInvoiceRef,
        imagePath,
        description,
        unit,
        purchaseCost: Number(purchaseCost) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        minStock: Number(minStock) || 0,
        status,
        notes,
        attributes: attrMap,
      };
      const res = await fetch("/api/products", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to save product", tone: "error" });
        return;
      }
      toast({
        title: editingId ? "Product updated" : "Product created",
        tone: "success",
      });
      setModalOpen(false);
      resetForm();
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeOrg || !deleteTarget) return;
    const res = await fetch(
      `/api/products?organizationId=${activeOrg.organizationId}&id=${deleteTarget.id}`,
      { method: "DELETE" }
    );
    const json = await res.json();
    if (!res.ok) {
      toast({ title: json.error || "Delete failed", tone: "error" });
      return;
    }
    toast({ title: "Product deleted", tone: "success" });
    setDeleteTarget(null);
    await loadData();
  };

  const filtered = React.useMemo(
    () =>
      products.filter((p) => {
        if (catFilter !== "all" && p.category_id !== catFilter) return false;
        if (brandFilter !== "all" && p.brand_id !== brandFilter) return false;
        return true;
      }),
    [products, catFilter, brandFilter]
  );

  const activeCategoryAttrs = React.useMemo(
    () => attributes.filter((a) => a.category_id === categoryId),
    [attributes, categoryId]
  );

  const columns = React.useMemo<ColumnDef<ProductRow>[]>(
    () => [
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => (
          <span className="font-semibold text-[var(--aurora-text-strong)]">
            {row.original.sku}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-[var(--aurora-text-strong)]">
              {row.original.name}
            </div>
            <div className="text-[11px] text-[var(--aurora-text-muted)]">
              {categories.find((c) => c.id === row.original.category_id)?.name ?? "Category"} ·{" "}
              {brands.find((b) => b.id === row.original.brand_id)?.name ?? "Unbranded"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "purchase_cost",
        header: "Purchase Cost",
        cell: ({ row }) => formatCurrency(Number(row.original.purchase_cost)),
      },
      {
        accessorKey: "selling_price",
        header: "Selling Price",
        cell: ({ row }) => (
          <span className="font-semibold text-[var(--aurora-text-strong)]">
            {formatCurrency(Number(row.original.selling_price))}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <GlassBadge
            tone={row.original.status === "active" ? "success" : "neutral"}
          >
            {row.original.status}
          </GlassBadge>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => openEdit(row.original)}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </GlassButton>
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5 text-[var(--aurora-danger)]" />
            </GlassButton>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, brands, attrValues, attributes]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Product Catalog & Dynamic Attributes"
        subtitle="Universal shared product schema with dynamic Perfume, Electronics, Fashion & custom attributes."
        badges={<GlassBadge tone="accent">{products.length} Products</GlassBadge>}
        actions={
          <GlassButton
            variant="primary"
            size="sm"
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </GlassButton>
        }
      />

      <GlassCard>
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          searchPlaceholder="Search SKU or product name..."
          toolbarExtra={
            <>
              <FilterDropdown
                label="Category"
                value={catFilter}
                onChange={setCatFilter}
                options={[
                  { value: "all", label: "All Categories" },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
              <FilterDropdown
                label="Brand"
                value={brandFilter}
                onChange={setBrandFilter}
                options={[
                  { value: "all", label: "All Brands" },
                  ...brands.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            </>
          }
        />
      </GlassCard>

      <GlassDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingId ? "Edit Product" : "Create Product"}
        description="Dynamic attributes automatically adapt when you switch the product category."
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3.5 sm:grid-cols-3">
            <FormField label="Product Name" required className="sm:col-span-2">
              <GlassInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </FormField>
            <FormField label="SKU" required>
              <GlassInput
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Category" required>
              <GlassSelect
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
            </FormField>
            <FormField label="Brand">
              <GlassSelect
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                options={[
                  { value: "", label: "Select brand..." },
                  ...brands.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            </FormField>
            <FormField label="Default Supplier">
              <GlassSelect
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                options={[
                  { value: "", label: "Select supplier..." },
                  ...suppliers.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            </FormField>
            <FormField label="Purchase Cost" required>
              <GlassInput
                type="number"
                min={0}
                step="0.01"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(Number(e.target.value))}
                required
              />
            </FormField>
            <FormField label="Selling Price" required>
              <GlassInput
                type="number"
                min={0}
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                required
              />
            </FormField>
            <FormField label="Min Stock">
              <GlassInput
                type="number"
                min={0}
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Barcode">
              <GlassInput
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
            </FormField>
            <FormField label="Unit">
              <GlassInput
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </FormField>
            <FormField label="Supplier Invoice Ref">
              <GlassInput
                value={supplierInvoiceRef}
                onChange={(e) => setSupplierInvoiceRef(e.target.value)}
              />
            </FormField>
            <FormField label="Status">
              <GlassSelect
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "active" | "draft" | "archived")
                }
                options={[
                  { value: "active", label: "Active" },
                  { value: "draft", label: "Draft" },
                  { value: "archived", label: "Archived" },
                ]}
              />
            </FormField>
            <FormField label="Product Image" className="sm:col-span-2">
              <label className="aurora-glass-subtle flex h-10 cursor-pointer items-center gap-2 rounded-[16px] border border-dashed border-[var(--aurora-glass-border-strong)] px-3.5 text-xs">
                <Upload className="h-3.5 w-3.5 text-[var(--aurora-accent)]" />
                <span className="truncate">
                  {imagePath ? `Uploaded: ${imagePath}` : "Upload PNG/JPEG/WebP (max 5MB)"}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </FormField>
          </div>

          {activeCategoryAttrs.length > 0 && (
            <div className="aurora-glass-subtle space-y-3 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--aurora-text-strong)]">
                <Sparkles className="h-3.5 w-3.5 text-[var(--aurora-accent)]" />
                Category Attributes ({activeCategoryAttrs.length})
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeCategoryAttrs.map((attr) => {
                  const val = attrMap[attr.key];
                  if (attr.data_type === "boolean") {
                    return (
                      <GlassSwitch
                        key={attr.id}
                        checked={Boolean(val)}
                        onCheckedChange={(checked) =>
                          setAttrMap((prev) => ({ ...prev, [attr.key]: checked }))
                        }
                        label={attr.label}
                      />
                    );
                  }
                  if (attr.data_type === "select" && Array.isArray(attr.options)) {
                    return (
                      <FormField
                        key={attr.id}
                        label={attr.label}
                        required={attr.is_required}
                      >
                        <GlassSelect
                          value={String(val ?? "")}
                          onChange={(e) =>
                            setAttrMap((prev) => ({
                              ...prev,
                              [attr.key]: e.target.value,
                            }))
                          }
                          options={[
                            { value: "", label: `Select ${attr.label}...` },
                            ...attr.options.map((o) => ({ value: o, label: o })),
                          ]}
                        />
                      </FormField>
                    );
                  }
                  return (
                    <FormField
                      key={attr.id}
                      label={attr.unit ? `${attr.label} (${attr.unit})` : attr.label}
                      required={attr.is_required}
                    >
                      <GlassInput
                        type={attr.data_type === "number" ? "number" : "text"}
                        value={val != null ? String(val) : ""}
                        onChange={(e) =>
                          setAttrMap((prev) => ({
                            ...prev,
                            [attr.key]:
                              attr.data_type === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                          }))
                        }
                      />
                    </FormField>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Description">
              <GlassTextarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>
            <FormField label="Internal Notes">
              <GlassTextarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" size="sm" loading={saving}>
              {editingId ? "Update Product" : "Create Product"}
            </GlassButton>
          </div>
        </form>
      </GlassDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Product?"
        description={`Delete "${deleteTarget?.name}" (${deleteTarget?.sku})? This cannot be undone if no transactions reference it.`}
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <BackendConnectionGuard moduleTitle="Product Management">
      <ProductsWorkspace />
    </BackendConnectionGuard>
  );
}

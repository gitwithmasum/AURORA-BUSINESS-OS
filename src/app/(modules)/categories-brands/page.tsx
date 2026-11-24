"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { validateStorageUpload } from "@/lib/storage/buckets";
import { BackendConnectionGuard } from "@/components/operations/BackendConnectionGuard";
import { DynamicCategoryManager } from "@/components/settings/DynamicCategoryManager";
import {
  ConfirmDialog,
  DataTable,
  FormField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
  GlassDialog,
  GlassInput,
  GlassTextarea,
  PageHeader,
  useToast,
} from "@/components/ui";

interface BrandRow {
  id: string;
  name: string;
  country_of_origin: string | null;
  description: string;
  logo_path: string | null;
}

function CategoriesBrandsWorkspace() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  const [brands, setBrands] = React.useState<BrandRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [brandModalOpen, setBrandModalOpen] = React.useState(false);
  const [catModalOpen, setCatModalOpen] = React.useState(false);
  const [deleteBrand, setDeleteBrand] = React.useState<BrandRow | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [brandName, setBrandName] = React.useState("");
  const [brandCountry, setBrandCountry] = React.useState("");
  const [brandDesc, setBrandDesc] = React.useState("");
  const [brandLogo, setBrandLogo] = React.useState<string | null>(null);

  const [catName, setCatName] = React.useState("");
  const [catDesc, setCatDesc] = React.useState("");

  const loadBrands = React.useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/brands?organizationId=${activeOrg.organizationId}`
      );
      const json = await res.json();
      if (res.ok) setBrands(json.brands ?? []);
    } finally {
      setLoading(false);
    }
  }, [activeOrg]);

  React.useEffect(() => {
    void loadBrands();
  }, [loadBrands]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (res.ok) {
      setBrandLogo(json.path);
      toast({ title: "Brand logo uploaded", tone: "success" });
    } else {
      toast({ title: json.error || "Upload failed", tone: "error" });
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setSaving(true);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: activeOrg.organizationId,
          name: brandName,
          countryOfOrigin: brandCountry,
          description: brandDesc,
          logoPath: brandLogo,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to create brand", tone: "error" });
        return;
      }
      toast({ title: `Brand "${brandName}" created`, tone: "success" });
      setBrandModalOpen(false);
      setBrandName("");
      setBrandCountry("");
      setBrandDesc("");
      setBrandLogo(null);
      await loadBrands();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "category",
          organizationId: activeOrg.organizationId,
          name: catName,
          description: catDesc,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to create category", tone: "error" });
        return;
      }
      toast({ title: `Category "${catName}" created`, tone: "success" });
      setCatModalOpen(false);
      setCatName("");
      setCatDesc("");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!activeOrg || !deleteBrand) return;
    const res = await fetch(
      `/api/brands?organizationId=${activeOrg.organizationId}&id=${deleteBrand.id}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast({ title: "Brand deleted", tone: "success" });
      setDeleteBrand(null);
      await loadBrands();
    }
  };

  const brandColumns = React.useMemo<ColumnDef<BrandRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Brand",
        cell: ({ row }) => (
          <span className="font-semibold text-[var(--aurora-text-strong)]">
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: "country_of_origin",
        header: "Country",
        cell: ({ row }) => row.original.country_of_origin || "—",
      },
      {
        accessorKey: "logo_path",
        header: "Logo",
        cell: ({ row }) =>
          row.original.logo_path ? (
            <GlassBadge tone="success">Uploaded</GlassBadge>
          ) : (
            <GlassBadge tone="neutral">None</GlassBadge>
          ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <GlassButton
            size="sm"
            variant="ghost"
            onClick={() => setDeleteBrand(row.original)}
          >
            <Trash2 className="h-3.5 w-3.5 text-[var(--aurora-danger)]" />
          </GlassButton>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories & Brands"
        subtitle="Manage product categories, custom attributes, and fragrance/retail brands."
        actions={
          <>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => setCatModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              New Category
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={() => setBrandModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Brand
            </GlassButton>
          </>
        }
      />

      <GlassCard>
        <GlassCardHeader>
          <div>
            <GlassCardTitle>Brand Registry</GlassCardTitle>
            <GlassCardDescription>
              Brands mapped across products and suppliers
            </GlassCardDescription>
          </div>
          <GlassBadge tone="accent">{brands.length} Brands</GlassBadge>
        </GlassCardHeader>
        <GlassCardContent>
          <DataTable
            columns={brandColumns}
            data={brands}
            loading={loading}
            searchPlaceholder="Search brands..."
          />
        </GlassCardContent>
      </GlassCard>

      <DynamicCategoryManager />

      <GlassDialog
        open={brandModalOpen}
        onOpenChange={setBrandModalOpen}
        title="Add Brand"
      >
        <form onSubmit={handleCreateBrand} className="space-y-3.5">
          <FormField label="Brand Name" required>
            <GlassInput
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Lattafa"
              required
            />
          </FormField>
          <FormField label="Country of Origin">
            <GlassInput
              value={brandCountry}
              onChange={(e) => setBrandCountry(e.target.value)}
              placeholder="e.g. UAE / France"
            />
          </FormField>
          <FormField label="Brand Logo">
            <label className="aurora-glass-subtle flex h-10 cursor-pointer items-center gap-2 rounded-[16px] border border-dashed border-[var(--aurora-glass-border-strong)] px-3.5 text-xs">
              <Upload className="h-3.5 w-3.5 text-[var(--aurora-accent)]" />
              <span className="truncate">
                {brandLogo ? brandLogo : "Upload PNG/JPEG/WebP"}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </label>
          </FormField>
          <FormField label="Description">
            <GlassTextarea
              value={brandDesc}
              onChange={(e) => setBrandDesc(e.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setBrandModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" size="sm" loading={saving}>
              Save Brand
            </GlassButton>
          </div>
        </form>
      </GlassDialog>

      <GlassDialog
        open={catModalOpen}
        onOpenChange={setCatModalOpen}
        title="Create Custom Category"
      >
        <form onSubmit={handleCreateCategory} className="space-y-3.5">
          <FormField label="Category Name" required>
            <GlassInput
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
            />
          </FormField>
          <FormField label="Description">
            <GlassTextarea
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setCatModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" size="sm" loading={saving}>
              Create Category
            </GlassButton>
          </div>
        </form>
      </GlassDialog>

      <ConfirmDialog
        open={Boolean(deleteBrand)}
        onOpenChange={(open) => !open && setDeleteBrand(null)}
        title="Delete Brand?"
        description={`Remove "${deleteBrand?.name}" from this organization?`}
        confirmLabel="Delete"
        onConfirm={() => void handleDeleteBrand()}
      />
    </div>
  );
}

export default function CategoriesBrandsPage() {
  return (
    <BackendConnectionGuard moduleTitle="Categories & Brands">
      <CategoriesBrandsWorkspace />
    </BackendConnectionGuard>
  );
}

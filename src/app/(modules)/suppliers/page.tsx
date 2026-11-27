"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Download,
  Edit3,
  Eye,
  GitCompare,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { validateStorageUpload } from "@/lib/storage/buckets";
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
  GlassSwitch,
  GlassTextarea,
  PageHeader,
  SearchInput,
  useToast,
} from "@/components/ui";

interface SupplierRow {
  id: string;
  supplier_code: string;
  name: string;
  country: string;
  city: string;
  address: string;
  contact_person: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  registration_reference: string;
  brands_supplied: string[];
  product_categories: string[];
  moq: number;
  wholesale_price_hint: number | null;
  retail_price_hint: number | null;
  currency: string;
  lead_time_days: number;
  payment_terms: string;
  export_capable: boolean;
  verification_status: "unverified" | "pending_review" | "verified";
  partnership_status: "prospect" | "active" | "paused" | "archived";
  rating: number | null;
  remarks: string;
  is_demo: boolean;
}

interface PriceQuoteRow {
  id: string;
  supplier_id: string;
  product_label: string;
  currency: string;
  wholesale_price: number;
  quoted_at: string;
}

interface SupplierDocRow {
  id: string;
  supplier_id: string;
  title: string;
  storage_path: string;
  created_at: string;
}

function SuppliersWorkspace() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [suppliers, setSuppliers] = React.useState<SupplierRow[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [priceHistory, setPriceHistory] = React.useState<PriceQuoteRow[]>([]);
  const [documents, setDocuments] = React.useState<SupplierDocRow[]>([]);

  const [search, setSearch] = React.useState("");
  const [countryFilter, setCountryFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [page, setPage] = React.useState(1);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [compareOpen, setCompareOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [detailSupplier, setDetailSupplier] = React.useState<SupplierRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<SupplierRow | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Form states
  const [supplierCode, setSupplierCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [country, setCountry] = React.useState("Saudi Arabia");
  const [city, setCity] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [contactPerson, setContactPerson] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [regRef, setRegRef] = React.useState("");
  const [brandsText, setBrandsText] = React.useState("");
  const [categoriesText, setCategoriesText] = React.useState("Perfume & Fragrance");
  const [moq, setMoq] = React.useState(12);
  const [wholesaleHint, setWholesaleHint] = React.useState("");
  const [retailHint, setRetailHint] = React.useState("");
  const [currency, setCurrency] = React.useState("SAR");
  const [leadTimeDays, setLeadTimeDays] = React.useState(14);
  const [paymentTerms, setPaymentTerms] = React.useState("");
  const [exportCapable, setExportCapable] = React.useState(true);
  const [verificationStatus, setVerificationStatus] =
    React.useState<"unverified" | "pending_review" | "verified">("unverified");
  const [partnershipStatus, setPartnershipStatus] =
    React.useState<"prospect" | "active" | "paused" | "archived">("prospect");
  const [rating, setRating] = React.useState("4.5");
  const [remarks, setRemarks] = React.useState("");

  // Price quote quick form inside drawer
  const [quoteProduct, setQuoteProduct] = React.useState("");
  const [quotePrice, setQuotePrice] = React.useState("");

  const loadSuppliers = React.useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        organizationId: activeOrg.organizationId,
        page: String(page),
        pageSize: "25",
      });
      if (search) qs.set("search", search);
      if (countryFilter) qs.set("country", countryFilter);
      if (statusFilter) qs.set("status", statusFilter);

      const res = await fetch(`/api/suppliers?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to load suppliers", tone: "error" });
        return;
      }
      setSuppliers(json.suppliers ?? []);
      setTotalCount(json.totalCount ?? 0);
      setPriceHistory(json.priceHistory ?? []);
      setDocuments(json.documents ?? []);
    } finally {
      setLoading(false);
    }
  }, [activeOrg, page, search, countryFilter, statusFilter, toast]);

  React.useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const resetForm = () => {
    setEditingId(null);
    setSupplierCode(`SUP-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
    setName("");
    setCountry("Saudi Arabia");
    setCity("");
    setAddress("");
    setContactPerson("");
    setPhone("");
    setWhatsapp("");
    setEmail("");
    setWebsite("");
    setRegRef("");
    setBrandsText("");
    setCategoriesText("Perfume & Fragrance");
    setMoq(12);
    setWholesaleHint("");
    setRetailHint("");
    setCurrency("SAR");
    setLeadTimeDays(14);
    setPaymentTerms("");
    setExportCapable(true);
    setVerificationStatus("unverified");
    setPartnershipStatus("prospect");
    setRating("4.5");
    setRemarks("");
  };

  const openEdit = (s: SupplierRow) => {
    setEditingId(s.id);
    setSupplierCode(s.supplier_code);
    setName(s.name);
    setCountry(s.country);
    setCity(s.city);
    setAddress(s.address);
    setContactPerson(s.contact_person);
    setPhone(s.phone);
    setWhatsapp(s.whatsapp);
    setEmail(s.email);
    setWebsite(s.website);
    setRegRef(s.registration_reference);
    setBrandsText((s.brands_supplied ?? []).join(", "));
    setCategoriesText((s.product_categories ?? []).join(", "));
    setMoq(s.moq);
    setWholesaleHint(s.wholesale_price_hint != null ? String(s.wholesale_price_hint) : "");
    setRetailHint(s.retail_price_hint != null ? String(s.retail_price_hint) : "");
    setCurrency(s.currency);
    setLeadTimeDays(s.lead_time_days);
    setPaymentTerms(s.payment_terms);
    setExportCapable(s.export_capable);
    setVerificationStatus(s.verification_status);
    setPartnershipStatus(s.partnership_status);
    setRating(s.rating != null ? String(s.rating) : "");
    setRemarks(s.remarks);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setSaving(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? undefined,
          organizationId: activeOrg.organizationId,
          supplierCode,
          name,
          country,
          city,
          address,
          contactPerson,
          phone,
          whatsapp,
          email,
          website,
          registrationReference: regRef,
          brandsSupplied: brandsText.split(",").map((x) => x.trim()).filter(Boolean),
          productCategories: categoriesText.split(",").map((x) => x.trim()).filter(Boolean),
          moq: Number(moq) || 1,
          wholesalePriceHint: wholesaleHint ? Number(wholesaleHint) : null,
          retailPriceHint: retailHint ? Number(retailHint) : null,
          currency,
          leadTimeDays: Number(leadTimeDays) || 0,
          paymentTerms,
          exportCapable,
          verificationStatus,
          partnershipStatus,
          rating: rating ? Number(rating) : null,
          remarks,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to save supplier", tone: "error" });
        return;
      }
      toast({ title: editingId ? "Supplier updated" : "Supplier added", tone: "success" });
      setModalOpen(false);
      await loadSuppliers();
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDemo = async () => {
    if (!activeOrg) return;
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "seed_demo",
        organizationId: activeOrg.organizationId,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: json.error || "Failed to seed demo suppliers", tone: "error" });
      return;
    }
    toast({
      title: `Seeded ${json.seeded} clearly labeled demo suppliers`,
      tone: "info",
    });
    await loadSuppliers();
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeOrg || !detailSupplier) return;
    const check = validateStorageUpload("supplier-documents", {
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
    fd.append("bucket", "supplier-documents");
    fd.append("file", file);
    const upRes = await fetch("/api/storage/upload", { method: "POST", body: fd });
    const upJson = await upRes.json();
    if (!upRes.ok) {
      toast({ title: upJson.error || "Upload failed", tone: "error" });
      return;
    }
    await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "document",
        organizationId: activeOrg.organizationId,
        supplierId: detailSupplier.id,
        title: file.name,
        storagePath: upJson.path,
      }),
    });
    toast({ title: "Supplier document uploaded", tone: "success" });
    await loadSuppliers();
  };

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg || !detailSupplier) return;
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "price_quote",
        organizationId: activeOrg.organizationId,
        supplierId: detailSupplier.id,
        productLabel: quoteProduct,
        currency: detailSupplier.currency,
        wholesalePrice: Number(quotePrice) || 0,
      }),
    });
    if (res.ok) {
      toast({ title: "Price quote logged", tone: "success" });
      setQuoteProduct("");
      setQuotePrice("");
      await loadSuppliers();
    }
  };

  const handleDelete = async () => {
    if (!activeOrg || !deleteTarget) return;
    const res = await fetch(
      `/api/suppliers?organizationId=${activeOrg.organizationId}&id=${deleteTarget.id}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast({ title: "Supplier deleted", tone: "success" });
      setDeleteTarget(null);
      await loadSuppliers();
    }
  };

  const columns: ColumnDef<SupplierRow>[] = [
    {
      accessorKey: "name",
      header: "Supplier",
      cell: ({ row }) => (
        <div>
          <div className="flex items-center gap-1.5 font-semibold text-[var(--aurora-text-strong)]">
            {row.original.name}
            {row.original.is_demo && <GlassBadge tone="warning">Demo</GlassBadge>}
          </div>
          <div className="text-[11px] text-[var(--aurora-text-muted)]">
            {row.original.supplier_code} · {row.original.city}, {row.original.country}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "brands_supplied",
      header: "Brands",
      cell: ({ row }) => (
        <span className="text-xs">
          {(row.original.brands_supplied ?? []).slice(0, 3).join(", ") || "—"}
        </span>
      ),
    },
    {
      accessorKey: "moq",
      header: "MOQ / Lead",
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.moq} units · {row.original.lead_time_days}d
        </span>
      ),
    },
    {
      accessorKey: "verification_status",
      header: "Verification",
      cell: ({ row }) => (
        <GlassBadge
          tone={
            row.original.verification_status === "verified"
              ? "success"
              : row.original.verification_status === "pending_review"
                ? "warning"
                : "neutral"
          }
        >
          {row.original.verification_status}
        </GlassBadge>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <GlassButton size="sm" variant="ghost" onClick={() => setDetailSupplier(row.original)}>
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
        title="Supplier Database"
        subtitle="Scalable procurement directory (100+ suppliers) with brand mapping, price history, verification & document storage."
        badges={<GlassBadge tone="accent">{totalCount} Suppliers</GlassBadge>}
        actions={
          <>
            <GlassButton variant="secondary" size="sm" onClick={handleSeedDemo}>
              <Sparkles className="h-3.5 w-3.5" />
              Seed Demo Suppliers
            </GlassButton>
            <GlassButton variant="secondary" size="sm" onClick={() => setCompareOpen(true)}>
              <GitCompare className="h-3.5 w-3.5" />
              Compare
            </GlassButton>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => exportRowsToCsv("aurora-suppliers.csv", suppliers)}
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
              Add Supplier
            </GlassButton>
          </>
        }
      />

      <GlassCard padding="sm" overflow="visible" className="relative z-20 overflow-visible">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="w-full sm:max-w-sm">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Server search by name, code, city..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              label="Country"
              value={countryFilter}
              onChange={(v) => {
                setCountryFilter(v);
                setPage(1);
              }}
              options={[
                { value: "", label: "All Countries" },
                { value: "Saudi Arabia", label: "Saudi Arabia" },
                { value: "UAE", label: "UAE" },
                { value: "Bangladesh", label: "Bangladesh" },
                { value: "France", label: "France" },
              ]}
            />
            <FilterDropdown
              label="Status"
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
              options={[
                { value: "", label: "All Statuses" },
                { value: "active", label: "Active" },
                { value: "prospect", label: "Prospect" },
                { value: "paused", label: "Paused" },
              ]}
            />
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <DataTable
          columns={columns}
          data={suppliers}
          loading={loading}
          pageSize={25}
          searchPlaceholder="Filter current page..."
        />
        {totalCount > 25 && (
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--aurora-text-muted)]">
            <span>
              Server page {page} · {totalCount} total suppliers
            </span>
            <div className="flex gap-2">
              <GlassButton
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev Page
              </GlassButton>
              <GlassButton
                size="sm"
                variant="secondary"
                disabled={page * 25 >= totalCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Next Page
              </GlassButton>
            </div>
          </div>
        )}
      </GlassCard>

      <GlassDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingId ? "Edit Supplier" : "Add Verified / Prospect Supplier"}
        maxWidth="xl"
      >
        <form onSubmit={handleSave} className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Supplier Code" required>
              <GlassInput value={supplierCode} onChange={(e) => setSupplierCode(e.target.value)} required />
            </FormField>
            <FormField label="Supplier Name" required className="sm:col-span-2">
              <GlassInput value={name} onChange={(e) => setName(e.target.value)} required />
            </FormField>
            <FormField label="Country">
              <GlassInput value={country} onChange={(e) => setCountry(e.target.value)} />
            </FormField>
            <FormField label="City">
              <GlassInput value={city} onChange={(e) => setCity(e.target.value)} />
            </FormField>
            <FormField label="Contact Person">
              <GlassInput value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </FormField>
            <FormField label="Phone">
              <GlassInput value={phone} onChange={(e) => setPhone(e.target.value)} />
            </FormField>
            <FormField label="WhatsApp">
              <GlassInput value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </FormField>
            <FormField label="Email">
              <GlassInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormField>
            <FormField label="Website">
              <GlassInput value={website} onChange={(e) => setWebsite(e.target.value)} />
            </FormField>
            <FormField label="Business Reg Ref">
              <GlassInput value={regRef} onChange={(e) => setRegRef(e.target.value)} />
            </FormField>
            <FormField label="Currency">
              <GlassSelect
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: "SAR", label: "SAR" },
                  { value: "USD", label: "USD" },
                  { value: "AED", label: "AED" },
                  { value: "BDT", label: "BDT" },
                ]}
              />
            </FormField>
            <FormField label="Brands (comma-separated)" className="sm:col-span-2">
              <GlassInput value={brandsText} onChange={(e) => setBrandsText(e.target.value)} placeholder="Lattafa, Afnan, Rasasi" />
            </FormField>
            <FormField label="Categories (comma-separated)">
              <GlassInput value={categoriesText} onChange={(e) => setCategoriesText(e.target.value)} />
            </FormField>
            <FormField label="MOQ">
              <GlassInput type="number" min={1} value={moq} onChange={(e) => setMoq(Number(e.target.value))} />
            </FormField>
            <FormField label="Lead Time (Days)">
              <GlassInput type="number" min={0} value={leadTimeDays} onChange={(e) => setLeadTimeDays(Number(e.target.value))} />
            </FormField>
            <FormField label="Payment Terms">
              <GlassInput value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
            </FormField>
            <FormField label="Wholesale Price Hint">
              <GlassInput type="number" min={0} step="0.01" value={wholesaleHint} onChange={(e) => setWholesaleHint(e.target.value)} />
            </FormField>
            <FormField label="Retail Price Hint">
              <GlassInput type="number" min={0} step="0.01" value={retailHint} onChange={(e) => setRetailHint(e.target.value)} />
            </FormField>
            <FormField label="Rating (0-5)">
              <GlassInput type="number" min={0} max={5} step="0.1" value={rating} onChange={(e) => setRating(e.target.value)} />
            </FormField>
            <FormField label="Verification Status">
              <GlassSelect
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value as "unverified" | "pending_review" | "verified")}
                options={[
                  { value: "unverified", label: "Unverified" },
                  { value: "pending_review", label: "Pending Review" },
                  { value: "verified", label: "Verified" },
                ]}
              />
            </FormField>
            <FormField label="Partnership Status">
              <GlassSelect
                value={partnershipStatus}
                onChange={(e) => setPartnershipStatus(e.target.value as "prospect" | "active" | "paused" | "archived")}
                options={[
                  { value: "prospect", label: "Prospect" },
                  { value: "active", label: "Active" },
                  { value: "paused", label: "Paused" },
                  { value: "archived", label: "Archived" },
                ]}
              />
            </FormField>
            <div className="flex items-end pb-1">
              <GlassSwitch checked={exportCapable} onCheckedChange={setExportCapable} label="Export Capable" />
            </div>
          </div>
          <FormField label="Business Address">
            <GlassInput value={address} onChange={(e) => setAddress(e.target.value)} />
          </FormField>
          <FormField label="Remarks">
            <GlassTextarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</GlassButton>
            <GlassButton type="submit" variant="primary" size="sm" loading={saving}>Save Supplier</GlassButton>
          </div>
        </form>
      </GlassDialog>

      <GlassDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        title="Supplier Comparison Matrix"
        maxWidth="xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--aurora-glass-border)] text-[var(--aurora-text-muted)]">
                <th className="py-2 pr-3">Supplier</th>
                <th className="py-2 pr-3">Country</th>
                <th className="py-2 pr-3">MOQ</th>
                <th className="py-2 pr-3">Lead Time</th>
                <th className="py-2 pr-3">Payment Terms</th>
                <th className="py-2 pr-3">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--aurora-glass-border)]">
              {suppliers.slice(0, 6).map((s) => (
                <tr key={s.id}>
                  <td className="py-2.5 pr-3 font-semibold text-[var(--aurora-text-strong)]">{s.name}</td>
                  <td className="py-2.5 pr-3">{s.country}</td>
                  <td className="py-2.5 pr-3">{s.moq}</td>
                  <td className="py-2.5 pr-3">{s.lead_time_days}d</td>
                  <td className="py-2.5 pr-3">{s.payment_terms || "—"}</td>
                  <td className="py-2.5 pr-3">{s.verification_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassDialog>

      <Drawer
        open={Boolean(detailSupplier)}
        onOpenChange={(o) => !o && setDetailSupplier(null)}
        title={detailSupplier?.name ?? "Supplier"}
        description="Price history, verification checklist & supplier documents"
      >
        {detailSupplier && (
          <div className="space-y-4">
            <div className="aurora-glass-subtle rounded-2xl p-3.5 text-xs space-y-1">
              <div><strong>Contact:</strong> {detailSupplier.contact_person || "—"} · {detailSupplier.phone || "—"}</div>
              <div><strong>Brands:</strong> {(detailSupplier.brands_supplied ?? []).join(", ") || "—"}</div>
              <div><strong>Payment:</strong> {detailSupplier.payment_terms || "—"}</div>
            </div>

            <form onSubmit={handleAddQuote} className="aurora-glass-subtle space-y-2.5 rounded-2xl p-3.5">
              <div className="text-xs font-semibold text-[var(--aurora-text-strong)]">Log Price Quote</div>
              <GlassInput placeholder="Product / Perfume name" value={quoteProduct} onChange={(e) => setQuoteProduct(e.target.value)} required />
              <div className="flex gap-2">
                <GlassInput type="number" min={0} step="0.01" placeholder={`Wholesale (${detailSupplier.currency})`} value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} required />
                <GlassButton type="submit" variant="primary" size="sm">Log</GlassButton>
              </div>
            </form>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-[var(--aurora-text-strong)]">Price History</div>
              {priceHistory.filter((q) => q.supplier_id === detailSupplier.id).map((q) => (
                <div key={q.id} className="aurora-glass-subtle flex justify-between rounded-xl px-3 py-2 text-xs">
                  <span>{q.product_label}</span>
                  <strong>{q.wholesale_price} {q.currency}</strong>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--aurora-text-strong)]">Supplier Documents</span>
                <label className="cursor-pointer text-xs text-[var(--aurora-accent)] underline">
                  <Upload className="mr-1 inline h-3 w-3" />
                  Upload
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx" className="hidden" onChange={handleDocUpload} />
                </label>
              </div>
              {documents.filter((d) => d.supplier_id === detailSupplier.id).map((d) => (
                <div key={d.id} className="aurora-glass-subtle rounded-xl px-3 py-2 text-xs">
                  {d.title}
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Supplier?"
        description={`Delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <BackendConnectionGuard moduleTitle="Supplier Database">
      <SuppliersWorkspace />
    </BackendConnectionGuard>
  );
}

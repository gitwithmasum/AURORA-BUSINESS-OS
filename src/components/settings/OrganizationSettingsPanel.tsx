"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS, hasPermission, type RoleKey } from "@/lib/auth/rbac";
import { validateStorageUpload } from "@/lib/storage/buckets";
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
  GlassSwitch,
  useToast,
} from "@/components/ui";

export function OrganizationSettingsPanel() {
  const { supabaseConfigured, user, activeOrg, refreshAuth } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [businessName, setBusinessName] = React.useState("");
  const [businessType, setBusinessType] = React.useState("Retail & Import");
  const [country, setCountry] = React.useState("Bangladesh");
  const [currency, setCurrency] = React.useState("BDT");
  const [timezone, setTimezone] = React.useState("Asia/Dhaka");
  const [addressLine, setAddressLine] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [inventoryModel, setInventoryModel] = React.useState<"fifo" | "weighted_average" | "specific_batch">("weighted_average");
  const [allowNegativeStock, setAllowNegativeStock] = React.useState(false);
  const [vatRegistered, setVatRegistered] = React.useState(false);
  const [defaultSalesTaxPct, setDefaultSalesTaxPct] = React.useState(0);

  const canManage = activeOrg
    ? hasPermission(activeOrg.roleKey, "settings.manage", activeOrg.customPermissions)
    : false;

  React.useEffect(() => {
    if (!activeOrg) return;
    setLoading(true);
    fetch(`/api/settings?organizationId=${activeOrg.organizationId}`)
      .then((r) => r.json())
      .then((json) => {
        const s = json.settings;
        if (!s) return;
        setBusinessName(s.business_name ?? "");
        setBusinessType(s.business_type ?? "Retail & Import");
        setCountry(s.country ?? "Bangladesh");
        setCurrency(s.currency ?? "BDT");
        setTimezone(s.timezone ?? "Asia/Dhaka");
        setAddressLine(s.address_line ?? "");
        setContactEmail(s.contact_email ?? "");
        setContactPhone(s.contact_phone ?? "");
        setInventoryModel(s.inventory_model ?? "weighted_average");
        setAllowNegativeStock(Boolean(s.allow_negative_stock));
        setVatRegistered(Boolean(s.tax_configuration?.vat_registered));
        setDefaultSalesTaxPct(Number(s.tax_configuration?.default_sales_tax_pct ?? 0));
      })
      .finally(() => setLoading(false));
  }, [activeOrg]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) {
      toast({
        title: "No active organization",
        description: "Complete Business Onboarding with Supabase connected to persist settings.",
        tone: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: activeOrg.organizationId,
          businessName,
          businessType,
          primaryCategorySlug: activeOrg.categorySlug,
          country,
          currency,
          timezone,
          addressLine,
          city: "",
          contactEmail,
          contactPhone,
          inventoryModel,
          financialYearStartMonth: 7,
          allowNegativeStock,
          vatRegistered,
          defaultSalesTaxPct: Number(defaultSalesTaxPct) || 0,
          taxAssumptionsNote: "Configured in organization settings.",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to update settings", tone: "error" });
        return;
      }
      await refreshAuth();
      toast({ title: "Organization settings saved to PostgreSQL", tone: "success" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeOrg) return;
    const check = validateStorageUpload("business-logos", {
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
    fd.append("bucket", "business-logos");
    fd.append("file", file);
    const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: json.error || "Upload failed", tone: "error" });
      return;
    }
    toast({
      title: "Logo uploaded to Supabase Storage",
      description: json.path,
      tone: "success",
    });
  };

  if (!supabaseConfigured || !user || !activeOrg) {
    return (
      <GlassCard>
        <GlassCardHeader>
          <div>
            <GlassCardTitle>Organization Profile &amp; Security</GlassCardTitle>
            <GlassCardDescription>
              Multi-tenant business configuration, tax rules, and RBAC enforcement.
            </GlassCardDescription>
          </div>
          <GlassBadge tone="warning">
            {!supabaseConfigured
              ? "Supabase Not Configured"
              : !user
                ? "Sign In Required"
                : "No Organization"}
          </GlassBadge>
        </GlassCardHeader>
        <GlassCardContent className="space-y-3">
          <div className="aurora-glass-subtle flex items-start gap-2.5 rounded-2xl p-4 text-xs text-[var(--aurora-text-muted)]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--aurora-warning)]" />
            <span>
              Real organization settings are backed by PostgreSQL RLS (`business_settings`). Configure <code>.env.local</code>, sign in, and create your organization in the Onboarding Wizard.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {!user && (
              <Link href="/auth/login">
                <GlassButton variant="primary" size="sm">
                  Sign In
                </GlassButton>
              </Link>
            )}
            <Link href="/onboarding">
              <GlassButton variant="secondary" size="sm">
                <Building2 className="h-3.5 w-3.5" />
                Open Onboarding Wizard
              </GlassButton>
            </Link>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <GlassCardHeader>
        <div>
          <div className="flex items-center gap-2">
            <GlassCardTitle>{activeOrg.organizationName}</GlassCardTitle>
            <GlassBadge tone="success" dot>
              RLS Isolated
            </GlassBadge>
            <GlassBadge tone="accent">
              Role: {ROLE_LABELS[activeOrg.roleKey as RoleKey]}
            </GlassBadge>
          </div>
          <GlassCardDescription>
            Organization-level configuration persisted in PostgreSQL (`business_settings`).
          </GlassCardDescription>
        </div>
        <ShieldCheck className="h-4 w-4 text-[var(--aurora-success)]" />
      </GlassCardHeader>

      <GlassCardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <FormField label="Business Name" required>
              <GlassInput
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={!canManage || loading}
              />
            </FormField>
            <FormField label="Business Type">
              <GlassInput
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                disabled={!canManage || loading}
              />
            </FormField>
            <FormField label="Country">
              <GlassInput
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={!canManage || loading}
              />
            </FormField>
            <FormField label="Currency">
              <GlassSelect
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={!canManage || loading}
                options={[
                  { value: "BDT", label: "BDT" },
                  { value: "SAR", label: "SAR" },
                  { value: "USD", label: "USD" },
                  { value: "AED", label: "AED" },
                ]}
              />
            </FormField>
            <FormField label="Timezone">
              <GlassInput
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={!canManage || loading}
              />
            </FormField>
            <FormField label="Inventory Costing Model">
              <GlassSelect
                value={inventoryModel}
                onChange={(e) =>
                  setInventoryModel(
                    e.target.value as "fifo" | "weighted_average" | "specific_batch"
                  )
                }
                disabled={!canManage || loading}
                options={[
                  { value: "weighted_average", label: "Weighted Average Cost" },
                  { value: "fifo", label: "FIFO" },
                  { value: "specific_batch", label: "Specific Batch Cost" },
                ]}
              />
            </FormField>
            <FormField label="Contact Email">
              <GlassInput
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={!canManage || loading}
              />
            </FormField>
            <FormField label="Contact Phone">
              <GlassInput
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={!canManage || loading}
              />
            </FormField>
            <FormField label="Business Address" className="sm:col-span-2">
              <GlassInput
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                disabled={!canManage || loading}
              />
            </FormField>
            <FormField label="Default Sales Tax (%)">
              <GlassInput
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={defaultSalesTaxPct}
                onChange={(e) => setDefaultSalesTaxPct(Number(e.target.value))}
                disabled={!canManage || loading}
              />
            </FormField>
            <FormField label="Upload Organization Logo">
              <label className="aurora-glass-subtle flex h-10 cursor-pointer items-center gap-2 rounded-[16px] border border-dashed border-[var(--aurora-glass-border-strong)] px-3.5 text-xs">
                <Upload className="h-3.5 w-3.5 text-[var(--aurora-accent)]" />
                <span>Upload to business-logos</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  disabled={!canManage}
                  onChange={handleLogoUpload}
                />
              </label>
            </FormField>
          </div>

          <div className="space-y-2.5 pt-1">
            <GlassSwitch
              checked={vatRegistered}
              onCheckedChange={setVatRegistered}
              disabled={!canManage || loading}
              label="VAT Registered Business"
              description="Enables configurable VAT fields on invoices and financial tax summaries."
            />
            <GlassSwitch
              checked={allowNegativeStock}
              onCheckedChange={setAllowNegativeStock}
              disabled={!canManage || loading}
              label="Allow Negative Inventory Override"
              description="Disabled by default so sales never silently create negative stock."
            />
          </div>

          <div className="flex items-center justify-between border-t border-[var(--aurora-glass-border)] pt-3">
            <Link href="/onboarding">
              <GlassButton variant="secondary" size="sm">
                + Create Another Organization
              </GlassButton>
            </Link>
            <GlassButton
              type="submit"
              variant="primary"
              size="sm"
              loading={saving}
              disabled={!canManage}
            >
              Save Organization Settings
            </GlassButton>
          </div>
        </form>
      </GlassCardContent>
    </GlassCard>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Sparkles,
  Upload,
} from "lucide-react";
import { BUSINESS_CATEGORY_SCHEMAS } from "@/config/business-categories";
import { useAuth } from "@/context/AuthContext";
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
  PageHeader,
  useToast,
} from "@/components/ui";

export default function OnboardingWizardPage() {
  const router = useRouter();
  const { supabaseConfigured, user, refreshAuth, setActiveOrgId } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [businessName, setBusinessName] = React.useState("");
  const [categorySlug, setCategorySlug] = React.useState("perfume-fragrance");
  const [country, setCountry] = React.useState("Bangladesh");
  const [currency, setCurrency] = React.useState("BDT");
  const [timezone, setTimezone] = React.useState("Asia/Dhaka");
  const [addressLine, setAddressLine] = React.useState("");
  const [city, setCity] = React.useState("Dhaka");
  const [contactEmail, setContactEmail] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [logoFile, setLogoFile] = React.useState<File | null>(null);

  const selectedSchema =
    BUSINESS_CATEGORY_SCHEMAS.find((c) => c.slug === categorySlug) ??
    BUSINESS_CATEGORY_SCHEMAS[0];

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateStorageUpload("business-logos", {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!check.valid) {
      toast({ title: check.reason, tone: "error" });
      return;
    }
    setLogoFile(file);
  };

  const handleProvision = async () => {
    setErrorMsg(null);
    if (!supabaseConfigured || !user) {
      setErrorMsg(
        "Live Supabase authentication is required to provision an organization in PostgreSQL."
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          categorySlug,
          country,
          currency,
          timezone,
          addressLine,
          city,
          contactEmail,
          contactPhone,
          logoPath: null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "Organization setup failed.");
        return;
      }

      const orgId = json.created?.organization_id as string | undefined;

      if (orgId && logoFile) {
        const fd = new FormData();
        fd.append("organizationId", orgId);
        fd.append("bucket", "business-logos");
        fd.append("file", logoFile);
        await fetch("/api/storage/upload", { method: "POST", body: fd });
      }

      await refreshAuth();
      if (orgId) setActiveOrgId(orgId);

      toast({
        title: "Organization provisioned!",
        description: `${businessName} workspace and dynamic ${selectedSchema.name} schema created.`,
        tone: "success",
      });
      router.push("/settings");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="Business Onboarding Wizard"
        subtitle="Configure your independent organization, currency, timezone, and dynamic product attribute schema."
        leading={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--aurora-accent)] text-[var(--aurora-accent-contrast)]">
            <Building2 className="h-5 w-5" />
          </div>
        }
        badges={
          <>
            <GlassBadge tone="accent">Step {step} of 3</GlassBadge>
            <GlassBadge tone={user ? "success" : "warning"}>
              {user ? user.email : "Sign-in Required"}
            </GlassBadge>
          </>
        }
        actions={
          <Link href="/">
            <GlassButton variant="secondary" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              Overview
            </GlassButton>
          </Link>
        }
      />

      {(!supabaseConfigured || !user) && (
        <GlassCard padding="sm">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[var(--aurora-warning)]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {!supabaseConfigured
                  ? "Supabase credentials (.env.local) are not configured yet. You can preview the wizard steps, and live database provisioning will activate once connected."
                  : "Please sign in first so this organization is bound to your authenticated user via RLS."}
              </span>
            </div>
            {!user && (
              <Link href="/auth/login?next=/onboarding">
                <GlassButton variant="primary" size="sm">
                  Sign In
                </GlassButton>
              </Link>
            )}
          </div>
        </GlassCard>
      )}

      <GlassCard variant="elevated">
        <GlassCardHeader>
          <div>
            <GlassCardTitle>
              {step === 1 && "1. Business Identity & Category"}
              {step === 2 && "2. Location, Contact & Brand Logo"}
              {step === 3 && "3. Dynamic Attribute Engine & Provisioning"}
            </GlassCardTitle>
            <GlassCardDescription>
              {step === 1 &&
                "Select your primary industry—AURORA configures a shared product schema with category-specific attributes."}
              {step === 2 &&
                "Used on invoices, purchase orders, and organization-scoped storage."}
              {step === 3 &&
                "Review the dynamic attributes and security isolation before creating your organization."}
            </GlassCardDescription>
          </div>
        </GlassCardHeader>

        <GlassCardContent className="space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--aurora-danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--aurora-danger)_14%,transparent)] p-3 text-xs text-[var(--aurora-danger)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Business Name" required className="sm:col-span-2">
                <GlassInput
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Aurora Scents & Imports"
                />
              </FormField>

              <FormField label="Business Category" required className="sm:col-span-2">
                <GlassSelect
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  options={BUSINESS_CATEGORY_SCHEMAS.map((c) => ({
                    value: c.slug,
                    label: c.name,
                  }))}
                />
              </FormField>

              <FormField label="Country" required>
                <GlassInput
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </FormField>

              <FormField label="Default Currency" required>
                <GlassSelect
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  options={[
                    { value: "BDT", label: "BDT (৳ Bangladeshi Taka)" },
                    { value: "SAR", label: "SAR (Saudi Riyal)" },
                    { value: "USD", label: "USD ($ US Dollar)" },
                    { value: "AED", label: "AED (UAE Dirham)" },
                    { value: "EUR", label: "EUR (€ Euro)" },
                  ]}
                />
              </FormField>

              <FormField label="Timezone" required className="sm:col-span-2">
                <GlassSelect
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  options={[
                    { value: "Asia/Dhaka", label: "Asia/Dhaka (UTC+06:00)" },
                    { value: "Asia/Riyadh", label: "Asia/Riyadh (UTC+03:00)" },
                    { value: "Asia/Dubai", label: "Asia/Dubai (UTC+04:00)" },
                    { value: "UTC", label: "UTC" },
                  ]}
                />
              </FormField>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Business Address" className="sm:col-span-2">
                <GlassInput
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="Street, Building, Floor"
                />
              </FormField>
              <FormField label="City">
                <GlassInput
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </FormField>
              <FormField label="Contact Phone">
                <GlassInput
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+880 1XXX-XXXXXX"
                />
              </FormField>
              <FormField label="Contact Email" className="sm:col-span-2">
                <GlassInput
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@yourbusiness.com"
                />
              </FormField>
              <FormField
                label="Business Logo"
                hint="PNG, JPEG, WebP, or SVG up to 3 MB (stored in private org-isolated bucket)"
                className="sm:col-span-2"
              >
                <label className="aurora-glass-subtle flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-[var(--aurora-glass-border-strong)] px-4 py-3 text-xs">
                  <span className="flex items-center gap-2 text-[var(--aurora-text-strong)]">
                    <Upload className="h-4 w-4 text-[var(--aurora-accent)]" />
                    {logoFile ? logoFile.name : "Choose logo file..."}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoSelect}
                  />
                </label>
              </FormField>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="aurora-glass-subtle rounded-2xl p-4 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--aurora-text-muted)]">Organization</span>
                  <strong className="text-[var(--aurora-text-strong)]">
                    {businessName || "(Not entered)"}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--aurora-text-muted)]">Category</span>
                  <strong className="text-[var(--aurora-text-strong)]">
                    {selectedSchema.name}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--aurora-text-muted)]">Locale</span>
                  <strong className="text-[var(--aurora-text-strong)]">
                    {country} · {currency} · {timezone}
                  </strong>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--aurora-text-strong)]">
                  <Sparkles className="h-4 w-4 text-[var(--aurora-accent)]" />
                  Dynamic Product Attributes Included ({selectedSchema.attributes.length})
                </div>
                {selectedSchema.attributes.length === 0 ? (
                  <p className="text-xs text-[var(--aurora-text-muted)]">
                    Custom Business starts with an open schema so you can define custom attributes in Categories &amp; Brands.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSchema.attributes.map((attr) => (
                      <GlassBadge key={attr.key} tone="info">
                        {attr.label} ({attr.dataType})
                      </GlassBadge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[var(--aurora-glass-border)] pt-4">
            <GlassButton
              variant="ghost"
              size="sm"
              disabled={step === 1}
              onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </GlassButton>

            {step < 3 ? (
              <GlassButton
                variant="primary"
                size="sm"
                onClick={() => {
                  if (step === 1 && businessName.trim().length < 2) {
                    toast({
                      title: "Enter a business name (at least 2 characters)",
                      tone: "warning",
                    });
                    return;
                  }
                  setStep((s) => (s === 1 ? 2 : 3));
                }}
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </GlassButton>
            ) : (
              <GlassButton
                variant="primary"
                size="sm"
                loading={submitting}
                onClick={() => void handleProvision()}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Provision Organization
              </GlassButton>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

"use client";

import * as React from "react";
import { Plus, Sliders, Tag } from "lucide-react";
import { BUSINESS_CATEGORY_SCHEMAS } from "@/config/business-categories";
import { useAuth } from "@/context/AuthContext";
import {
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
  GlassSelect,
  GlassSwitch,
  useToast,
} from "@/components/ui";

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string;
}

interface AttributeRow {
  id: string;
  category_id: string;
  key: string;
  label: string;
  data_type: string;
  unit: string | null;
  is_required: boolean;
}

export function DynamicCategoryManager() {
  const { activeOrg, user } = useAuth();
  const { toast } = useToast();

  const [categories, setCategories] = React.useState<CategoryRow[]>([]);
  const [attributes, setAttributes] = React.useState<AttributeRow[]>([]);
  const [selectedSlug, setSelectedSlug] = React.useState<string>("perfume-fragrance");
  const [attrDialogOpen, setAttrDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [newKey, setNewKey] = React.useState("");
  const [newLabel, setNewLabel] = React.useState("");
  const [newType, setNewType] = React.useState<"text" | "number" | "select" | "boolean" | "date">("text");
  const [newUnit, setNewUnit] = React.useState("");
  const [newOptions, setNewOptions] = React.useState("");
  const [newRequired, setNewRequired] = React.useState(false);

  const loadFromDb = React.useCallback(async () => {
    if (!activeOrg) return;
    const res = await fetch(
      `/api/categories?organizationId=${activeOrg.organizationId}`
    );
    if (!res.ok) return;
    const json = await res.json();
    setCategories(json.categories ?? []);
    setAttributes(json.attributes ?? []);
    if (json.categories?.[0]?.slug) {
      setSelectedSlug(json.categories[0].slug);
    }
  }, [activeOrg]);

  React.useEffect(() => {
    void loadFromDb();
  }, [loadFromDb]);

  const activeDbCategory = categories.find((c) => c.slug === selectedSlug);
  const activePreset = BUSINESS_CATEGORY_SCHEMAS.find(
    (c) => c.slug === selectedSlug
  );

  const displayedAttributes = activeOrg && activeDbCategory
    ? attributes.filter((a) => a.category_id === activeDbCategory.id)
    : (activePreset?.attributes ?? []).map((a) => ({
        id: a.key,
        category_id: selectedSlug,
        key: a.key,
        label: a.label,
        data_type: a.dataType,
        unit: a.unit ?? null,
        is_required: Boolean(a.required),
      }));

  const handleCreateAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg || !activeDbCategory) {
      toast({
        title: "Live organization required",
        description:
          "Sign in and provision an organization to persist custom attributes to PostgreSQL.",
        tone: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "attribute",
          organizationId: activeOrg.organizationId,
          categoryId: activeDbCategory.id,
          key: newKey,
          label: newLabel,
          dataType: newType,
          unit: newUnit || null,
          options:
            newType === "select"
              ? newOptions
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [],
          isRequired: newRequired,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to add attribute", tone: "error" });
        return;
      }

      toast({ title: `Added attribute "${newLabel}"`, tone: "success" });
      setAttrDialogOpen(false);
      setNewKey("");
      setNewLabel("");
      setNewUnit("");
      setNewOptions("");
      await loadFromDb();
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard>
      <GlassCardHeader>
        <div>
          <div className="flex items-center gap-2">
            <GlassCardTitle>Dynamic Business Category &amp; Attribute Engine</GlassCardTitle>
            <GlassBadge tone={activeOrg ? "success" : "warning"}>
              {activeOrg ? "PostgreSQL Active" : "Schema Preset Preview"}
            </GlassBadge>
          </div>
          <GlassCardDescription>
            Shared product architecture supporting 10 business categories plus custom attributes.
          </GlassCardDescription>
        </div>
        <GlassButton
          variant="primary"
          size="sm"
          onClick={() => setAttrDialogOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Custom Attribute
        </GlassButton>
      </GlassCardHeader>

      <GlassCardContent className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-1.5">
          {(activeOrg && categories.length > 0
            ? categories
            : BUSINESS_CATEGORY_SCHEMAS
          ).map((cat) => {
            const active = cat.slug === selectedSlug;
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => setSelectedSlug(cat.slug)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-2xl px-3.5 py-2.5 text-left text-xs transition-all ${
                  active
                    ? "aurora-active-glow bg-[var(--aurora-glass-bg-elevated)] font-semibold text-[var(--aurora-text-strong)]"
                    : "aurora-glass-subtle text-[var(--aurora-text)] hover:bg-[var(--aurora-glass-bg)]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-[var(--aurora-accent)]" />
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div className="aurora-glass-subtle rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[var(--aurora-text-strong)]">
                {activeDbCategory?.name ?? activePreset?.name}
              </div>
              <GlassBadge tone="accent">
                {displayedAttributes.length} Attributes
              </GlassBadge>
            </div>
            <p className="mt-1 text-xs text-[var(--aurora-text-muted)]">
              {activeDbCategory?.description ?? activePreset?.description}
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {displayedAttributes.map((attr) => (
              <div
                key={attr.id}
                className="aurora-glass-subtle flex items-center justify-between rounded-2xl px-3.5 py-2.5"
              >
                <div>
                  <div className="text-xs font-semibold text-[var(--aurora-text-strong)]">
                    {attr.label}
                  </div>
                  <div className="text-[11px] text-[var(--aurora-text-muted)]">
                    <code>{attr.key}</code> · {attr.data_type}
                    {attr.unit ? ` (${attr.unit})` : ""}
                  </div>
                </div>
                {attr.is_required && <GlassBadge tone="warning">Required</GlassBadge>}
              </div>
            ))}
          </div>
        </div>
      </GlassCardContent>

      <GlassDialog
        open={attrDialogOpen}
        onOpenChange={setAttrDialogOpen}
        title="Define Custom Product Attribute"
        description={
          user && activeOrg
            ? `Adds a typed attribute to ${activeDbCategory?.name ?? selectedSlug} in PostgreSQL.`
            : "Connect Supabase and complete onboarding to save custom attributes."
        }
        maxWidth="md"
      >
        <form onSubmit={handleCreateAttribute} className="space-y-3.5">
          <FormField label="Attribute Label" required>
            <GlassInput
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Bottle Material"
              required
            />
          </FormField>
          <FormField
            label="Machine Key"
            hint="Lowercase letters, numbers, and underscores only"
            required
          >
            <GlassInput
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="e.g. bottle_material"
              required
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Data Type">
              <GlassSelect
                value={newType}
                onChange={(e) =>
                  setNewType(
                    e.target.value as "text" | "number" | "select" | "boolean" | "date"
                  )
                }
                options={[
                  { value: "text", label: "Text" },
                  { value: "number", label: "Number" },
                  { value: "select", label: "Select Options" },
                  { value: "boolean", label: "Yes / No" },
                  { value: "date", label: "Date" },
                ]}
              />
            </FormField>
            <FormField label="Unit (optional)">
              <GlassInput
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="ml, kg, months"
              />
            </FormField>
          </div>
          {newType === "select" && (
            <FormField label="Select Options (comma-separated)">
              <GlassInput
                value={newOptions}
                onChange={(e) => setNewOptions(e.target.value)}
                placeholder="Glass, Crystal, Aluminum"
              />
            </FormField>
          )}
          <GlassSwitch
            checked={newRequired}
            onCheckedChange={setNewRequired}
            label="Required field on new products"
          />
          <div className="flex justify-end gap-2 pt-2">
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => setAttrDialogOpen(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" size="sm" loading={saving}>
              <Sliders className="h-3.5 w-3.5" />
              Save Attribute
            </GlassButton>
          </div>
        </form>
      </GlassDialog>
    </GlassCard>
  );
}

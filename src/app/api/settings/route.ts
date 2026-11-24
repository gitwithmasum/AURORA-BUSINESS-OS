import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { businessSettingsUpdateSchema } from "@/lib/validators/part2";
import { logActivity } from "@/lib/audit/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "dashboard.read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("business_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ settings: data });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = businessSettingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const auth = await requireOrgPermission(v.organizationId, "settings.manage");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("business_settings")
    .update({
      business_name: v.businessName,
      business_type: v.businessType,
      primary_category_slug: v.primaryCategorySlug,
      country: v.country,
      currency: v.currency,
      timezone: v.timezone,
      address_line: v.addressLine,
      city: v.city,
      contact_email: v.contactEmail,
      contact_phone: v.contactPhone,
      inventory_model: v.inventoryModel,
      financial_year_start_month: v.financialYearStartMonth,
      allow_negative_stock: v.allowNegativeStock,
      tax_configuration: {
        vat_registered: v.vatRegistered,
        default_sales_tax_pct: v.defaultSalesTaxPct,
        assumptions_note: v.taxAssumptionsNote,
      },
    })
    .eq("organization_id", v.organizationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(auth.supabase, {
    organizationId: v.organizationId,
    actorUserId: auth.context.user.id,
    eventType: "settings.updated",
    entityType: "business_settings",
    entityId: data.id,
    metadata: {
      business_name: v.businessName,
      currency: v.currency,
      primary_category_slug: v.primaryCategorySlug,
    },
  });

  return NextResponse.json({ settings: data });
}

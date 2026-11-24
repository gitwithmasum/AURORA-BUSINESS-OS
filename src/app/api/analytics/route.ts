import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { loadOrganizationAnalyticsDataset } from "@/lib/analytics/loader";
import {
  computeBusinessAnalytics,
  computeMonthlyBusinessSummary,
  computePerfumeIntelligence,
  computeStockAlerts,
  DEFAULT_STOCK_ALERT_CONFIG,
} from "@/lib/analytics/engine";

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

  const [dataset, alertSettingsRes] = await Promise.all([
    loadOrganizationAnalyticsDataset(auth.supabase, organizationId),
    auth.supabase
      .from("stock_alert_settings")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  const filters = {
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    categoryId: searchParams.get("categoryId") || undefined,
    brandId: searchParams.get("brandId") || undefined,
    productId: searchParams.get("productId") || undefined,
    supplierId: searchParams.get("supplierId") || undefined,
    channel: searchParams.get("channel") || undefined,
  };

  const targetMonth =
    searchParams.get("month") || new Date().toISOString().slice(0, 7);

  const s = alertSettingsRes.data;
  const alertConfig = s
    ? {
        overstockMultiplier: Number(s.overstock_multiplier),
        fastMovingWindowDays: Number(s.fast_moving_window_days),
        fastMovingMinUnits: Number(s.fast_moving_min_units),
        slowMovingWindowDays: Number(s.slow_moving_window_days),
        expiryWarningDays: Number(s.expiry_warning_days),
        defaultLeadTimeDays: Number(s.default_lead_time_days),
        safetyStockDays: Number(s.safety_stock_days),
      }
    : DEFAULT_STOCK_ALERT_CONFIG;

  const analytics = computeBusinessAnalytics(dataset, filters);
  const monthly = computeMonthlyBusinessSummary(dataset, targetMonth);
  const stockAlerts = computeStockAlerts(
    dataset.products,
    dataset.inventory,
    dataset.sales,
    dataset.saleItems,
    alertConfig
  );
  const perfume = computePerfumeIntelligence(dataset);

  return NextResponse.json({
    analytics,
    monthly,
    stockAlerts,
    alertConfig,
    perfume,
    dimensions: {
      categories: dataset.categories,
      brands: dataset.brands,
      products: dataset.products.map((p) => ({ id: p.id, name: p.name, sku: p.sku })),
      suppliers: dataset.suppliers.map((sup) => ({ id: sup.id, name: sup.name })),
    },
  });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const organizationId = String(body?.organizationId || "");
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "inventory.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("stock_alert_settings")
    .upsert(
      {
        organization_id: organizationId,
        overstock_multiplier: Number(body?.overstockMultiplier ?? 5),
        fast_moving_window_days: Number(body?.fastMovingWindowDays ?? 30),
        fast_moving_min_units: Number(body?.fastMovingMinUnits ?? 20),
        slow_moving_window_days: Number(body?.slowMovingWindowDays ?? 60),
        expiry_warning_days: Number(body?.expiryWarningDays ?? 45),
        default_lead_time_days: Number(body?.defaultLeadTimeDays ?? 14),
        safety_stock_days: Number(body?.safetyStockDays ?? 7),
        email_alerts_enabled: Boolean(body?.emailAlertsEnabled ?? false),
        updated_by: auth.context.user.id,
      },
      { onConflict: "organization_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ settings: data });
}

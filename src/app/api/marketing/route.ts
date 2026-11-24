import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { marketingCampaignCreateSchema } from "@/lib/validators/part4";
import { calculateMarketingRoi } from "@/lib/finance/calculations";

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

  const [campRes, metRes] = await Promise.all([
    auth.supabase
      .from("marketing_campaigns")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    auth.supabase
      .from("marketing_metrics")
      .select("*")
      .eq("organization_id", organizationId)
      .order("metric_date", { ascending: false }),
  ]);

  return NextResponse.json({
    campaigns: campRes.data ?? [],
    metrics: metRes.data ?? [],
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = marketingCampaignCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const auth = await requireOrgPermission(v.organizationId, "finance.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: camp, error: cErr } = await auth.supabase
    .from("marketing_campaigns")
    .insert({
      organization_id: v.organizationId,
      name: v.name,
      platform: v.platform,
      objective: v.objective,
      start_date: v.startDate,
      end_date: v.endDate,
      budget: v.budget,
      status: "active",
      created_by: auth.context.user.id,
    })
    .select()
    .single();

  if (cErr || !camp) {
    return NextResponse.json(
      { error: cErr?.message || "Failed to save campaign." },
      { status: 400 }
    );
  }

  const { data: metric, error: mErr } = await auth.supabase
    .from("marketing_metrics")
    .insert({
      organization_id: v.organizationId,
      campaign_id: camp.id,
      metric_date: v.startDate,
      actual_spend: v.actualSpend,
      impressions: v.impressions,
      reach: v.reach,
      clicks: v.clicks,
      leads: v.leads,
      orders: v.orders,
      revenue: v.revenue,
      product_costs: v.productCosts,
      other_variable_costs: v.otherVariableCosts,
    })
    .select()
    .single();

  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 400 });
  }

  const roi = calculateMarketingRoi({
    actualSpend: v.actualSpend,
    impressions: v.impressions,
    clicks: v.clicks,
    leads: v.leads,
    orders: v.orders,
    revenue: v.revenue,
    productCosts: v.productCosts,
    otherVariableCosts: v.otherVariableCosts,
  });

  return NextResponse.json({ campaign: camp, metric, roi }, { status: 201 });
}

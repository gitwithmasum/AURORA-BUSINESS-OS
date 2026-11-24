import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { calculateImportCostScenario } from "@/lib/finance/calculations";
import {
  importScenarioCreateSchema,
  taxConfigSchema,
} from "@/lib/validators/part4";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "purchases.read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [scenRes, itemsRes, taxRes] = await Promise.all([
    auth.supabase
      .from("import_scenarios")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(100),
    auth.supabase
      .from("import_cost_items")
      .select("*")
      .eq("organization_id", organizationId),
    auth.supabase
      .from("tax_configurations")
      .select("*")
      .eq("organization_id", organizationId)
      .order("effective_date", { ascending: false }),
  ]);

  return NextResponse.json({
    scenarios: scenRes.data ?? [],
    items: itemsRes.data ?? [],
    taxConfigurations: taxRes.data ?? [],
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const kind = body?.kind as "tax_config" | "import_scenario" | undefined;

  if (kind === "tax_config") {
    const parsed = taxConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const v = parsed.data;
    const auth = await requireOrgPermission(v.organizationId, "purchases.write");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data, error } = await auth.supabase
      .from("tax_configurations")
      .insert({
        organization_id: v.organizationId,
        name: v.name,
        hs_code: v.hsCode,
        product_description: v.productDescription,
        country_of_origin: v.countryOfOrigin,
        effective_date: v.effectiveDate,
        customs_duty_pct: v.customsDutyPct,
        regulatory_duty_pct: v.regulatoryDutyPct,
        supplementary_duty_pct: v.supplementaryDutyPct,
        vat_pct: v.vatPct,
        advance_tax_pct: v.advanceTaxPct,
        other_tax_pct: v.otherTaxPct,
        assumptions_note: v.assumptionsNote,
        is_verified_by_user: v.isVerifiedByUser,
        created_by: auth.context.user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ taxConfiguration: data }, { status: 201 });
  }

  const parsed = importScenarioCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const auth = await requireOrgPermission(v.organizationId, "purchases.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const calc = calculateImportCostScenario(v);

  const { data: scenario, error: scErr } = await auth.supabase
    .from("import_scenarios")
    .insert({
      organization_id: v.organizationId,
      title: v.title,
      scenario_mode: v.scenarioMode,
      origin_country: v.originCountry,
      destination_country: v.destinationCountry,
      fx_currency: v.fxCurrency,
      exchange_rate: v.exchangeRate,
      allocation_method: v.allocationMethod,
      tax_config_id: v.taxConfigId,
      supplier_fees: v.supplierFeesForeign,
      origin_handling: v.originHandlingForeign,
      freight_cost: v.freightCostForeign,
      insurance: v.insuranceForeign,
      assessable_value_bdt: v.customsAssessableValueBdt,
      estimated_customs_duty_bdt: calc.estimatedCustomsDutyBdt,
      estimated_taxes_bdt: calc.estimatedTaxesBdt,
      clearing_forwarding_bdt: v.clearingForwardingBdt,
      local_transport_bdt: v.localTransportBdt,
      other_expenses_bdt: v.otherExpensesBdt,
      total_purchase_foreign: calc.purchaseCostForeign,
      total_purchase_bdt: calc.purchaseCostBdt,
      total_import_cost_bdt: calc.totalImportCostBdt,
      total_landed_cost_bdt: calc.totalLandedCostBdt,
      snapshot_json: calc,
      is_estimate: true,
      created_by: auth.context.user.id,
    })
    .select()
    .single();

  if (scErr || !scenario) {
    return NextResponse.json(
      { error: scErr?.message || "Failed to save import scenario." },
      { status: 400 }
    );
  }

  const itemRows = calc.items.map((it) => ({
    organization_id: v.organizationId,
    scenario_id: scenario.id,
    sku: it.sku,
    product_name: it.productName,
    brand_name: it.brandName,
    quantity: it.quantity,
    unit_price_foreign: it.unitPurchasePriceForeign,
    purchase_cost_bdt: it.purchaseCostBdt,
    allocated_import_cost_bdt: it.allocatedImportCostBdt,
    landed_cost_bdt: it.landedCostBdt,
    landed_cost_per_unit_bdt: it.landedCostPerUnitBdt,
    recommended_selling_price_bdt: it.recommendedSellingPriceBdt,
    expected_gross_profit_bdt: it.expectedGrossProfitBdt,
    expected_margin_pct: it.expectedMarginPct,
  }));

  await auth.supabase.from("import_cost_items").insert(itemRows);

  return NextResponse.json({ scenario, calculation: calc }, { status: 201 });
}

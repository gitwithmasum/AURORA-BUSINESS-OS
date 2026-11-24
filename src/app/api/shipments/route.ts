import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { calculateShippingEstimate } from "@/lib/finance/calculations";
import { shipmentCreateSchema } from "@/lib/validators/part4";

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

  const { data, error } = await auth.supabase
    .from("shipments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ shipments: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = shipmentCreateSchema.safeParse(body);
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

  const calc = calculateShippingEstimate(v);

  const { data, error } = await auth.supabase
    .from("shipments")
    .insert({
      organization_id: v.organizationId,
      title: v.title,
      origin_country: v.originCountry,
      destination_country: v.destinationCountry,
      shipping_method: v.shippingMethod,
      carrier_name: v.carrierName,
      packages_count: v.packagesCount,
      gross_weight_kg: v.grossWeightKg,
      length_cm: v.lengthCm,
      width_cm: v.widthCm,
      height_cm: v.heightCm,
      volumetric_weight_kg: calc.volumetricWeightKg,
      chargeable_weight_kg: calc.chargeableWeightKg,
      freight_rate_per_kg: v.freightRatePerKg,
      insurance: v.insurance,
      handling_fee: v.handlingFee,
      dg_surcharge: v.dgSurcharge,
      other_charges: v.otherCharges,
      total_shipping_cost: calc.totalShippingCost,
      unit_count: v.unitCount,
      cost_per_unit: calc.costPerUnit,
      estimated_delivery_days: calc.estimatedDeliveryDays,
      dg_review_required: calc.dgReviewRequired,
      dg_carrier_confirmed: calc.dgCarrierConfirmed,
      notes: v.notes,
      created_by: auth.context.user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ shipment: data, calculation: calc }, { status: 201 });
}

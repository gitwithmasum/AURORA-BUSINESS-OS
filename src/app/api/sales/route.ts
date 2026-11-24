import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { completeSaleSchema } from "@/lib/validators/part3";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "sales.read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let salesQuery = auth.supabase
    .from("sales")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (startDate) salesQuery = salesQuery.gte("sale_date", startDate);
  if (endDate) salesQuery = salesQuery.lte("sale_date", endDate);

  const [salesRes, itemsRes, returnsRes, productsRes, warehousesRes, customersRes] =
    await Promise.all([
      salesQuery,
      auth.supabase
        .from("sale_items")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(500),
      auth.supabase
        .from("sales_returns")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100),
      auth.supabase
        .from("products")
        .select("id, sku, name, selling_price, purchase_cost")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .order("name"),
      auth.supabase
        .from("warehouses")
        .select("id, name, code")
        .eq("organization_id", organizationId)
        .order("name"),
      auth.supabase
        .from("customers")
        .select("id, full_name, customer_code")
        .eq("organization_id", organizationId)
        .order("full_name"),
    ]);

  if (salesRes.error) {
    return NextResponse.json({ error: salesRes.error.message }, { status: 400 });
  }

  return NextResponse.json({
    sales: salesRes.data ?? [],
    saleItems: itemsRes.data ?? [],
    returns: returnsRes.data ?? [],
    products: productsRes.data ?? [],
    warehouses: warehousesRes.data ?? [],
    customers: customersRes.data ?? [],
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = completeSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const auth = await requireOrgPermission(v.organizationId, "sales.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase.rpc("complete_sale_txn", {
    p_organization_id: v.organizationId,
    p_customer_id: v.customerId,
    p_sale_date: v.saleDate || new Date().toISOString().slice(0, 10),
    p_channel: v.channel,
    p_payment_method: v.paymentMethod,
    p_payment_status: v.paymentStatus,
    p_paid_amount: v.paidAmount,
    p_notes: v.notes,
    p_items: v.items,
    p_override_negative: v.overrideNegative,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ completed: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const organizationId = String(body?.organizationId || "");
  const saleId = String(body?.saleId || "");
  const mode = body?.mode === "cancel" ? "cancel" : "return";
  const reason = String(body?.reason || "");

  if (!organizationId || !saleId) {
    return NextResponse.json({ error: "organizationId and saleId required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "sales.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase.rpc("cancel_or_return_sale_txn", {
    p_organization_id: organizationId,
    p_sale_id: saleId,
    p_mode: mode,
    p_reason: reason,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ updated: data });
}

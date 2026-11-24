import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { createPurchaseOrderSchema, receivePoSchema } from "@/lib/validators/part3";
import { calculatePurchaseOrderTotal, generateDocumentNumber } from "@/lib/operations/calculations";

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

  const [poRes, poItemsRes, purchasesRes, supRes, prodRes, whRes] =
    await Promise.all([
      auth.supabase
        .from("purchase_orders")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      auth.supabase
        .from("purchase_order_items")
        .select("*")
        .eq("organization_id", organizationId),
      auth.supabase
        .from("purchases")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      auth.supabase
        .from("suppliers")
        .select("id, name, supplier_code, address, currency, payment_terms")
        .eq("organization_id", organizationId)
        .order("name"),
      auth.supabase
        .from("products")
        .select("id, sku, name, purchase_cost")
        .eq("organization_id", organizationId)
        .order("name"),
      auth.supabase
        .from("warehouses")
        .select("id, name, code")
        .eq("organization_id", organizationId)
        .order("name"),
    ]);

  if (poRes.error) {
    return NextResponse.json({ error: poRes.error.message }, { status: 400 });
  }

  return NextResponse.json({
    purchaseOrders: poRes.data ?? [],
    poItems: poItemsRes.data ?? [],
    purchases: purchasesRes.data ?? [],
    suppliers: supRes.data ?? [],
    products: prodRes.data ?? [],
    warehouses: whRes.data ?? [],
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createPurchaseOrderSchema.safeParse(body);
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

  const poNumber = generateDocumentNumber("PO");
  const totalAmount = calculatePurchaseOrderTotal({
    items: v.items,
    shippingCost: v.shippingCost,
    additionalCosts: v.additionalCosts,
  });

  const { data: po, error: poErr } = await auth.supabase
    .from("purchase_orders")
    .insert({
      organization_id: v.organizationId,
      supplier_id: v.supplierId,
      po_number: poNumber,
      status: "draft",
      purchase_date: v.purchaseDate,
      expected_delivery: v.expectedDelivery || null,
      currency: v.currency,
      exchange_rate: v.exchangeRate,
      shipping_cost: v.shippingCost,
      additional_costs: v.additionalCosts,
      total_amount: totalAmount,
      payment_terms: v.paymentTerms,
      notes: v.notes,
      created_by: auth.context.user.id,
    })
    .select()
    .single();

  if (poErr || !po) {
    return NextResponse.json({ error: poErr?.message || "Failed to create PO." }, { status: 400 });
  }

  const itemRows = v.items.map((it) => ({
    organization_id: v.organizationId,
    po_id: po.id,
    product_id: it.productId,
    product_name_snapshot: it.productName,
    sku_snapshot: it.sku,
    brand_snapshot: it.brand,
    quantity_ordered: it.quantity,
    unit_price: it.unitPrice,
    line_total: Number((it.quantity * it.unitPrice).toFixed(2)),
  }));

  const { error: itemsErr } = await auth.supabase
    .from("purchase_order_items")
    .insert(itemRows);

  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message }, { status: 400 });
  }

  return NextResponse.json({ purchaseOrder: po }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const action = body?.action as "status" | "receive" | undefined;

  if (action === "receive") {
    const parsed = receivePoSchema.safeParse(body);
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

    const { data, error } = await auth.supabase.rpc("receive_purchase_order_txn", {
      p_organization_id: v.organizationId,
      p_po_id: v.poId,
      p_warehouse_id: v.warehouseId,
      p_items: v.items,
      p_additional_costs: v.additionalCosts,
      p_notes: v.notes,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ received: data });
  }

  const organizationId = String(body?.organizationId || "");
  const poId = String(body?.poId || "");
  const nextStatus = String(body?.nextStatus || "");
  if (!organizationId || !poId || !nextStatus) {
    return NextResponse.json({ error: "organizationId, poId, and nextStatus required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "purchases.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase.rpc("approve_purchase_order_txn", {
    p_organization_id: organizationId,
    p_po_id: poId,
    p_next_status: nextStatus,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ updated: data });
}

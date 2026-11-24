import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { inventoryMovementSchema, warehouseSchema } from "@/lib/validators/part3";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "inventory.read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [invRes, whRes, prodRes, movRes] = await Promise.all([
    auth.supabase
      .from("inventory")
      .select("*")
      .eq("organization_id", organizationId),
    auth.supabase
      .from("warehouses")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name"),
    auth.supabase
      .from("products")
      .select("id, sku, name, min_stock, purchase_cost, selling_price, unit")
      .eq("organization_id", organizationId)
      .order("name"),
    auth.supabase
      .from("inventory_movements")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (invRes.error) {
    return NextResponse.json({ error: invRes.error.message }, { status: 400 });
  }

  return NextResponse.json({
    inventory: invRes.data ?? [],
    warehouses: whRes.data ?? [],
    products: prodRes.data ?? [],
    movements: movRes.data ?? [],
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const kind = body?.kind as "warehouse" | "movement" | undefined;

  if (kind === "warehouse") {
    const parsed = warehouseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const v = parsed.data;
    const auth = await requireOrgPermission(v.organizationId, "inventory.write");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data, error } = await auth.supabase
      .from("warehouses")
      .insert({
        organization_id: v.organizationId,
        name: v.name,
        code: v.code.toUpperCase(),
        address: v.address,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ warehouse: data }, { status: 201 });
  }

  const parsed = inventoryMovementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const auth = await requireOrgPermission(v.organizationId, "inventory.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase.rpc(
    "perform_inventory_movement_txn",
    {
      p_organization_id: v.organizationId,
      p_product_id: v.productId,
      p_warehouse_id: v.warehouseId,
      p_movement_type: v.movementType,
      p_quantity: v.quantity,
      p_batch_number: v.batchNumber,
      p_unit_cost: v.unitCost,
      p_target_warehouse_id: v.targetWarehouseId,
      p_notes: v.notes,
      p_override_negative: v.overrideNegative,
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ result: data }, { status: 201 });
}

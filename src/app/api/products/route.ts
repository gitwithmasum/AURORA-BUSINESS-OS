import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireOrgPermission } from "@/lib/auth/session";
import { productSchema } from "@/lib/validators/part3";
import { logActivity } from "@/lib/audit/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "products.read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [productsRes, categoriesRes, attributesRes, brandsRes, suppliersRes, attrValsRes] =
    await Promise.all([
      auth.supabase
        .from("products")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      auth.supabase
        .from("business_categories")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name"),
      auth.supabase
        .from("custom_product_attributes")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order"),
      auth.supabase
        .from("brands")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name"),
      auth.supabase
        .from("suppliers")
        .select("id, name, supplier_code")
        .eq("organization_id", organizationId)
        .order("name"),
      auth.supabase
        .from("product_attribute_values")
        .select("*")
        .eq("organization_id", organizationId),
    ]);

  if (productsRes.error) {
    return NextResponse.json({ error: productsRes.error.message }, { status: 400 });
  }

  return NextResponse.json({
    products: productsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    attributes: attributesRes.data ?? [],
    brands: brandsRes.data ?? [],
    suppliers: suppliersRes.data ?? [],
    attributeValues: attrValsRes.data ?? [],
  });
}

async function upsertProductAttributes(
  supabase: SupabaseClient,
  organizationId: string,
  productId: string,
  categoryId: string,
  attributesMap: Record<string, string | number | boolean | null>
) {
  const keys = Object.keys(attributesMap);
  if (keys.length === 0) return;

  const { data: defs } = await supabase
    .from("custom_product_attributes")
    .select("id, key, data_type")
    .eq("organization_id", organizationId)
    .eq("category_id", categoryId)
    .in("key", keys);

  if (!defs || defs.length === 0) return;

  const rows = defs.map((def) => {
    const raw = attributesMap[def.key];
    return {
      organization_id: organizationId,
      product_id: productId,
      attribute_id: def.id,
      value_text:
        def.data_type === "number" || def.data_type === "boolean"
          ? null
          : raw == null
            ? null
            : String(raw),
      value_number:
        def.data_type === "number" && raw !== "" && raw !== null
          ? Number(raw)
          : null,
      value_boolean:
        def.data_type === "boolean" ? Boolean(raw) : null,
    };
  });

  await supabase
    .from("product_attribute_values")
    .upsert(rows, { onConflict: "product_id,attribute_id" });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const auth = await requireOrgPermission(v.organizationId, "products.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("products")
    .insert({
      organization_id: v.organizationId,
      sku: v.sku,
      barcode: v.barcode || null,
      name: v.name,
      category_id: v.categoryId,
      brand_id: v.brandId,
      default_supplier_id: v.defaultSupplierId,
      supplier_invoice_ref: v.supplierInvoiceRef,
      image_path: v.imagePath,
      description: v.description,
      unit: v.unit,
      purchase_cost: v.purchaseCost,
      selling_price: v.sellingPrice,
      min_stock: v.minStock,
      status: v.status,
      notes: v.notes,
      created_by: auth.context.user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await upsertProductAttributes(
    auth.supabase,
    v.organizationId,
    data.id,
    v.categoryId,
    v.attributes
  );

  await logActivity(auth.supabase, {
    organizationId: v.organizationId,
    actorUserId: auth.context.user.id,
    eventType: "product.created",
    entityType: "product",
    entityId: data.id,
    metadata: { sku: v.sku, name: v.name },
  });

  return NextResponse.json({ product: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const id = String(body?.id || "");
  const parsed = productSchema.safeParse(body);
  if (!id || !parsed.success) {
    return NextResponse.json({ error: "Valid product id and fields required." }, { status: 400 });
  }

  const v = parsed.data;
  const auth = await requireOrgPermission(v.organizationId, "products.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("products")
    .update({
      sku: v.sku,
      barcode: v.barcode || null,
      name: v.name,
      category_id: v.categoryId,
      brand_id: v.brandId,
      default_supplier_id: v.defaultSupplierId,
      supplier_invoice_ref: v.supplierInvoiceRef,
      image_path: v.imagePath,
      description: v.description,
      unit: v.unit,
      purchase_cost: v.purchaseCost,
      selling_price: v.sellingPrice,
      min_stock: v.minStock,
      status: v.status,
      notes: v.notes,
    })
    .eq("id", id)
    .eq("organization_id", v.organizationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await upsertProductAttributes(
    auth.supabase,
    v.organizationId,
    data.id,
    v.categoryId,
    v.attributes
  );

  await logActivity(auth.supabase, {
    organizationId: v.organizationId,
    actorUserId: auth.context.user.id,
    eventType: "product.updated",
    entityType: "product",
    entityId: data.id,
    metadata: { sku: v.sku, name: v.name },
  });

  return NextResponse.json({ product: data });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  const id = searchParams.get("id") || "";
  if (!organizationId || !id) {
    return NextResponse.json({ error: "organizationId and id are required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "products.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { error } = await auth.supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ deleted: true });
}

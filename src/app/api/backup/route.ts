import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { logActivity } from "@/lib/audit/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "settings.manage");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [
    settings,
    categories,
    attributes,
    brands,
    products,
    warehouses,
    inventory,
    suppliers,
    customers,
    sales,
    expenses,
    po,
    invoices,
  ] = await Promise.all([
    auth.supabase.from("business_settings").select("*").eq("organization_id", organizationId),
    auth.supabase.from("business_categories").select("*").eq("organization_id", organizationId),
    auth.supabase.from("custom_product_attributes").select("*").eq("organization_id", organizationId),
    auth.supabase.from("brands").select("*").eq("organization_id", organizationId),
    auth.supabase.from("products").select("*").eq("organization_id", organizationId),
    auth.supabase.from("warehouses").select("*").eq("organization_id", organizationId),
    auth.supabase.from("inventory").select("*").eq("organization_id", organizationId),
    auth.supabase.from("suppliers").select("*").eq("organization_id", organizationId),
    auth.supabase.from("customers").select("*").eq("organization_id", organizationId),
    auth.supabase.from("sales").select("*").eq("organization_id", organizationId),
    auth.supabase.from("expenses").select("*").eq("organization_id", organizationId),
    auth.supabase.from("purchase_orders").select("*").eq("organization_id", organizationId),
    auth.supabase.from("invoices").select("*").eq("organization_id", organizationId),
  ]);

  const backupPayload = {
    exportedAt: new Date().toISOString(),
    organizationId,
    exportedBy: auth.context.user.email,
    tables: {
      business_settings: settings.data ?? [],
      business_categories: categories.data ?? [],
      custom_product_attributes: attributes.data ?? [],
      brands: brands.data ?? [],
      products: products.data ?? [],
      warehouses: warehouses.data ?? [],
      inventory: inventory.data ?? [],
      suppliers: suppliers.data ?? [],
      customers: customers.data ?? [],
      sales: sales.data ?? [],
      expenses: expenses.data ?? [],
      purchase_orders: po.data ?? [],
      invoices: invoices.data ?? [],
    },
  };

  const totalRecords = Object.values(backupPayload.tables).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  await auth.supabase.from("backup_snapshots").insert({
    organization_id: organizationId,
    operation_type: "json_backup_export",
    entity_scope: "full_organization",
    record_count: totalRecords,
    validation_summary: { status: "complete" },
    actor_user_id: auth.context.user.id,
  });

  return NextResponse.json({ backup: backupPayload });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const organizationId = String(body?.organizationId || "");
  const entity = body?.entity as "products" | "customers" | "suppliers" | undefined;
  const rows = Array.isArray(body?.rows) ? (body.rows as Record<string, unknown>[]) : [];

  if (!organizationId || !entity || rows.length === 0) {
    return NextResponse.json(
      { error: "organizationId, entity, and non-empty rows array required." },
      { status: 400 }
    );
  }

  const auth = await requireOrgPermission(organizationId, "settings.manage");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const inserted: string[] = [];
  const skippedDuplicates: string[] = [];
  const errors: string[] = [];

  if (entity === "customers") {
    const { data: existing } = await auth.supabase
      .from("customers")
      .select("customer_code")
      .eq("organization_id", organizationId);
    const existingCodes = new Set((existing ?? []).map((e) => e.customer_code.toLowerCase()));

    for (const r of rows) {
      const code = String(r.customer_code ?? r.code ?? "").trim();
      const fullName = String(r.full_name ?? r.name ?? "").trim();
      if (!code || !fullName) {
        errors.push(`Missing customer_code or full_name in row: ${JSON.stringify(r)}`);
        continue;
      }
      if (existingCodes.has(code.toLowerCase())) {
        skippedDuplicates.push(code);
        continue;
      }
      const { error } = await auth.supabase.from("customers").insert({
        organization_id: organizationId,
        customer_code: code,
        full_name: fullName,
        phone: String(r.phone ?? ""),
        email: String(r.email ?? ""),
        city: String(r.city ?? ""),
      });
      if (error) errors.push(`${code}: ${error.message}`);
      else {
        existingCodes.add(code.toLowerCase());
        inserted.push(code);
      }
    }
  } else if (entity === "suppliers") {
    const { data: existing } = await auth.supabase
      .from("suppliers")
      .select("supplier_code")
      .eq("organization_id", organizationId);
    const existingCodes = new Set((existing ?? []).map((e) => e.supplier_code.toLowerCase()));

    for (const r of rows) {
      const code = String(r.supplier_code ?? r.code ?? "").trim();
      const name = String(r.name ?? "").trim();
      if (!code || !name) {
        errors.push(`Missing supplier_code or name in row`);
        continue;
      }
      if (existingCodes.has(code.toLowerCase())) {
        skippedDuplicates.push(code);
        continue;
      }
      const { error } = await auth.supabase.from("suppliers").insert({
        organization_id: organizationId,
        supplier_code: code,
        name,
        country: String(r.country ?? ""),
        city: String(r.city ?? ""),
        currency: String(r.currency ?? "SAR"),
      });
      if (error) errors.push(`${code}: ${error.message}`);
      else {
        existingCodes.add(code.toLowerCase());
        inserted.push(code);
      }
    }
  } else {
    const [{ data: existing }, { data: cats }] = await Promise.all([
      auth.supabase.from("products").select("sku").eq("organization_id", organizationId),
      auth.supabase.from("business_categories").select("id").eq("organization_id", organizationId).limit(1),
    ]);
    const defaultCatId = cats?.[0]?.id;
    const existingSkus = new Set((existing ?? []).map((e) => e.sku.toLowerCase()));

    for (const r of rows) {
      const sku = String(r.sku ?? "").trim();
      const name = String(r.name ?? "").trim();
      if (!sku || !name || !defaultCatId) {
        errors.push(`Missing sku, name, or category for product row`);
        continue;
      }
      if (existingSkus.has(sku.toLowerCase())) {
        skippedDuplicates.push(sku);
        continue;
      }
      const { error } = await auth.supabase.from("products").insert({
        organization_id: organizationId,
        category_id: defaultCatId,
        sku,
        name,
        purchase_cost: Number(r.purchase_cost ?? 0),
        selling_price: Number(r.selling_price ?? 0),
        min_stock: Number(r.min_stock ?? 5),
      });
      if (error) errors.push(`${sku}: ${error.message}`);
      else {
        existingSkus.add(sku.toLowerCase());
        inserted.push(sku);
      }
    }
  }

  await auth.supabase.from("backup_snapshots").insert({
    organization_id: organizationId,
    operation_type: "csv_import",
    entity_scope: entity,
    record_count: inserted.length,
    validation_summary: {
      insertedCount: inserted.length,
      skippedDuplicates,
      errors,
    },
    actor_user_id: auth.context.user.id,
  });

  await logActivity(auth.supabase, {
    organizationId,
    actorUserId: auth.context.user.id,
    eventType: "settings.updated",
    entityType: "backup_import",
    entityId: entity,
    metadata: { inserted: inserted.length, skippedDuplicates: skippedDuplicates.length },
  });

  return NextResponse.json({
    report: {
      insertedCount: inserted.length,
      skippedDuplicates,
      errors,
    },
  });
}

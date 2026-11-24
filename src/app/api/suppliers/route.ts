import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { supplierSchema } from "@/lib/validators/part3";
import { DEMO_SUPPLIER_SEEDS } from "@/lib/operations/calculations";
import { logActivity } from "@/lib/audit/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  const search = searchParams.get("search")?.trim() || "";
  const country = searchParams.get("country")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") || 25)));

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "suppliers.read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let query = auth.supabase
    .from("suppliers")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId);

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,supplier_code.ilike.%${search}%,city.ilike.%${search}%`
    );
  }
  if (country) {
    query = query.eq("country", country);
  }
  if (status) {
    query = query.eq("partnership_status", status);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [supRes, quotesRes, docsRes] = await Promise.all([
    query.order("created_at", { ascending: false }).range(from, to),
    auth.supabase
      .from("supplier_price_history")
      .select("*")
      .eq("organization_id", organizationId)
      .order("quoted_at", { ascending: false })
      .limit(100),
    auth.supabase
      .from("supplier_documents")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (supRes.error) {
    return NextResponse.json({ error: supRes.error.message }, { status: 400 });
  }

  return NextResponse.json({
    suppliers: supRes.data ?? [],
    totalCount: supRes.count ?? 0,
    page,
    pageSize,
    priceHistory: quotesRes.data ?? [],
    documents: docsRes.data ?? [],
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const kind = body?.kind as "seed_demo" | "price_quote" | "document" | undefined;

  if (kind === "seed_demo") {
    const organizationId = String(body?.organizationId || "");
    const auth = await requireOrgPermission(organizationId, "suppliers.write");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const rows = DEMO_SUPPLIER_SEEDS.map((s) => ({
      organization_id: organizationId,
      supplier_code: s.supplierCode,
      name: s.name,
      country: s.country,
      city: s.city,
      contact_person: s.contactPerson,
      brands_supplied: s.brandsSupplied,
      product_categories: s.productCategories,
      moq: s.moq,
      currency: s.currency,
      lead_time_days: s.leadTimeDays,
      payment_terms: s.paymentTerms,
      export_capable: s.exportCapable,
      verification_status: "unverified",
      partnership_status: "prospect",
      remarks: s.remarks,
      is_demo: true,
    }));

    const { error } = await auth.supabase
      .from("suppliers")
      .upsert(rows, { onConflict: "organization_id,supplier_code" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ seeded: rows.length }, { status: 201 });
  }

  if (kind === "price_quote") {
    const organizationId = String(body?.organizationId || "");
    const auth = await requireOrgPermission(organizationId, "suppliers.write");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data, error } = await auth.supabase
      .from("supplier_price_history")
      .insert({
        organization_id: organizationId,
        supplier_id: String(body?.supplierId),
        product_label: String(body?.productLabel || ""),
        currency: String(body?.currency || "SAR"),
        wholesale_price: Number(body?.wholesalePrice || 0),
        retail_price: body?.retailPrice != null ? Number(body.retailPrice) : null,
        notes: String(body?.notes || ""),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ quote: data }, { status: 201 });
  }

  if (kind === "document") {
    const organizationId = String(body?.organizationId || "");
    const auth = await requireOrgPermission(organizationId, "suppliers.write");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data, error } = await auth.supabase
      .from("supplier_documents")
      .insert({
        organization_id: organizationId,
        supplier_id: String(body?.supplierId),
        title: String(body?.title || "Supplier Document"),
        document_type: String(body?.documentType || "authorization"),
        storage_path: String(body?.storagePath || ""),
        uploaded_by: auth.context.user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ document: data }, { status: 201 });
  }

  const parsed = supplierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const auth = await requireOrgPermission(v.organizationId, "suppliers.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("suppliers")
    .insert({
      organization_id: v.organizationId,
      supplier_code: v.supplierCode,
      name: v.name,
      country: v.country,
      city: v.city,
      address: v.address,
      contact_person: v.contactPerson,
      phone: v.phone,
      whatsapp: v.whatsapp,
      email: v.email,
      website: v.website,
      registration_reference: v.registrationReference,
      brands_supplied: v.brandsSupplied,
      product_categories: v.productCategories,
      moq: v.moq,
      wholesale_price_hint: v.wholesalePriceHint,
      retail_price_hint: v.retailPriceHint,
      currency: v.currency,
      lead_time_days: v.leadTimeDays,
      payment_terms: v.paymentTerms,
      export_capable: v.exportCapable,
      verification_status: v.verificationStatus,
      partnership_status: v.partnershipStatus,
      rating: v.rating,
      remarks: v.remarks,
      is_demo: v.isDemo,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(auth.supabase, {
    organizationId: v.organizationId,
    actorUserId: auth.context.user.id,
    eventType: "supplier.created",
    entityType: "supplier",
    entityId: data.id,
    metadata: { name: v.name, country: v.country },
  });

  return NextResponse.json({ supplier: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const id = String(body?.id || "");
  const parsed = supplierSchema.safeParse(body);
  if (!id || !parsed.success) {
    return NextResponse.json({ error: "Valid supplier id and fields required." }, { status: 400 });
  }

  const v = parsed.data;
  const auth = await requireOrgPermission(v.organizationId, "suppliers.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("suppliers")
    .update({
      supplier_code: v.supplierCode,
      name: v.name,
      country: v.country,
      city: v.city,
      address: v.address,
      contact_person: v.contactPerson,
      phone: v.phone,
      whatsapp: v.whatsapp,
      email: v.email,
      website: v.website,
      registration_reference: v.registrationReference,
      brands_supplied: v.brandsSupplied,
      product_categories: v.productCategories,
      moq: v.moq,
      wholesale_price_hint: v.wholesalePriceHint,
      retail_price_hint: v.retailPriceHint,
      currency: v.currency,
      lead_time_days: v.leadTimeDays,
      payment_terms: v.paymentTerms,
      export_capable: v.exportCapable,
      verification_status: v.verificationStatus,
      partnership_status: v.partnershipStatus,
      rating: v.rating,
      remarks: v.remarks,
    })
    .eq("id", id)
    .eq("organization_id", v.organizationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(auth.supabase, {
    organizationId: v.organizationId,
    actorUserId: auth.context.user.id,
    eventType: "supplier.updated",
    entityType: "supplier",
    entityId: data.id,
    metadata: { name: v.name },
  });

  return NextResponse.json({ supplier: data });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  const id = searchParams.get("id") || "";
  if (!organizationId || !id) {
    return NextResponse.json({ error: "organizationId and id are required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "suppliers.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { error } = await auth.supabase
    .from("suppliers")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ deleted: true });
}

import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import {
  customAttributeCreateSchema,
  customCategoryCreateSchema,
} from "@/lib/validators/part2";
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

  const [{ data: categories, error: catErr }, { data: attributes, error: attrErr }] =
    await Promise.all([
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
    ]);

  if (catErr || attrErr) {
    return NextResponse.json(
      { error: catErr?.message || attrErr?.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    categories: categories ?? [],
    attributes: attributes ?? [],
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const kind = body?.kind as "category" | "attribute" | undefined;

  if (kind === "category") {
    const parsed = customCategoryCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const auth = await requireOrgPermission(
      parsed.data.organizationId,
      "categories.manage"
    );
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const slug = parsed.data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { data, error } = await auth.supabase
      .from("business_categories")
      .insert({
        organization_id: parsed.data.organizationId,
        slug: `${slug || "custom"}-${Date.now().toString(36).slice(-4)}`,
        name: parsed.data.name,
        description: parsed.data.description,
        is_system_preset: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logActivity(auth.supabase, {
      organizationId: parsed.data.organizationId,
      actorUserId: auth.context.user.id,
      eventType: "category.created",
      entityType: "business_category",
      entityId: data.id,
      metadata: { name: data.name },
    });

    return NextResponse.json({ category: data }, { status: 201 });
  }

  const parsed = customAttributeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const auth = await requireOrgPermission(v.organizationId, "categories.manage");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("custom_product_attributes")
    .insert({
      organization_id: v.organizationId,
      category_id: v.categoryId,
      key: v.key,
      label: v.label,
      data_type: v.dataType,
      options: v.options,
      unit: v.unit,
      is_required: v.isRequired,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(auth.supabase, {
    organizationId: v.organizationId,
    actorUserId: auth.context.user.id,
    eventType: "attribute.created",
    entityType: "custom_product_attribute",
    entityId: data.id,
    metadata: { key: v.key, label: v.label, dataType: v.dataType },
  });

  return NextResponse.json({ attribute: data }, { status: 201 });
}

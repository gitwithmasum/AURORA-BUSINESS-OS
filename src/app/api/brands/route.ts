import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { brandSchema } from "@/lib/validators/part3";
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

  const { data, error } = await auth.supabase
    .from("brands")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ brands: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = brandSchema.safeParse(body);
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
    .from("brands")
    .insert({
      organization_id: v.organizationId,
      name: v.name,
      country_of_origin: v.countryOfOrigin,
      description: v.description,
      logo_path: v.logoPath,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(auth.supabase, {
    organizationId: v.organizationId,
    actorUserId: auth.context.user.id,
    eventType: "product.created",
    entityType: "brand",
    entityId: data.id,
    metadata: { name: v.name },
  });

  return NextResponse.json({ brand: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const id = String(body?.id || "");
  const parsed = brandSchema.safeParse(body);
  if (!id || !parsed.success) {
    return NextResponse.json({ error: "Valid brand id and fields required." }, { status: 400 });
  }

  const v = parsed.data;
  const auth = await requireOrgPermission(v.organizationId, "products.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("brands")
    .update({
      name: v.name,
      country_of_origin: v.countryOfOrigin,
      description: v.description,
      logo_path: v.logoPath,
    })
    .eq("id", id)
    .eq("organization_id", v.organizationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ brand: data });
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
    .from("brands")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ deleted: true });
}

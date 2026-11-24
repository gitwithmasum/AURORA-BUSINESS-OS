import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { customerSchema } from "@/lib/validators/part3";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "customers.read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [custRes, salesRes] = await Promise.all([
    auth.supabase
      .from("customers")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    auth.supabase
      .from("sales")
      .select("id, customer_id, invoice_number, sale_date, grand_total, order_status, payment_status")
      .eq("organization_id", organizationId)
      .order("sale_date", { ascending: false })
      .limit(200),
  ]);

  if (custRes.error) {
    return NextResponse.json({ error: custRes.error.message }, { status: 400 });
  }

  return NextResponse.json({
    customers: custRes.data ?? [],
    customerSales: salesRes.data ?? [],
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const auth = await requireOrgPermission(v.organizationId, "customers.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("customers")
    .insert({
      organization_id: v.organizationId,
      customer_code: v.customerCode,
      full_name: v.fullName,
      phone: v.phone,
      email: v.email,
      address: v.address,
      city: v.city,
      customer_type: v.customerType,
      segment: v.segment,
      follow_up_at: v.followUpAt || null,
      notes: v.notes,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ customer: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const id = String(body?.id || "");
  const parsed = customerSchema.safeParse(body);
  if (!id || !parsed.success) {
    return NextResponse.json({ error: "Valid customer id and fields required." }, { status: 400 });
  }

  const v = parsed.data;
  const auth = await requireOrgPermission(v.organizationId, "customers.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("customers")
    .update({
      customer_code: v.customerCode,
      full_name: v.fullName,
      phone: v.phone,
      email: v.email,
      address: v.address,
      city: v.city,
      customer_type: v.customerType,
      segment: v.segment,
      follow_up_at: v.followUpAt || null,
      notes: v.notes,
    })
    .eq("id", id)
    .eq("organization_id", v.organizationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ customer: data });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  const id = searchParams.get("id") || "";
  if (!organizationId || !id) {
    return NextResponse.json({ error: "organizationId and id are required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "customers.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { error } = await auth.supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ deleted: true });
}

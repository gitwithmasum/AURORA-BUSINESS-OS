import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { createInvoiceSchema } from "@/lib/validators/part3";
import { calculateSaleTotals, generateDocumentNumber } from "@/lib/operations/calculations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "sales.read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [invRes, itemsRes, settingsRes] = await Promise.all([
    auth.supabase
      .from("invoices")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(200),
    auth.supabase
      .from("invoice_items")
      .select("*")
      .eq("organization_id", organizationId),
    auth.supabase
      .from("business_settings")
      .select("business_name, address_line, city, contact_email, contact_phone, currency")
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  if (invRes.error) {
    return NextResponse.json({ error: invRes.error.message }, { status: 400 });
  }

  return NextResponse.json({
    invoices: invRes.data ?? [],
    invoiceItems: itemsRes.data ?? [],
    businessSettings: settingsRes.data ?? null,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createInvoiceSchema.safeParse(body);
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

  const prefix =
    v.invoiceType === "proforma"
      ? "PRO"
      : v.invoiceType === "purchase"
        ? "PUR"
        : v.invoiceType === "credit_note"
          ? "CN"
          : "INV";

  const invoiceNumber = generateDocumentNumber(prefix);
  const totals = calculateSaleTotals(v.items);

  const { data: invoice, error: invErr } = await auth.supabase
    .from("invoices")
    .insert({
      organization_id: v.organizationId,
      invoice_type: v.invoiceType,
      invoice_number: invoiceNumber,
      counterparty_name: v.counterpartyName,
      counterparty_contact: v.counterpartyContact,
      issue_date: v.issueDate,
      due_date: v.dueDate || null,
      payment_status: v.paymentStatus,
      subtotal: totals.subtotal,
      discount_total: totals.discountTotal,
      tax_total: totals.taxTotal,
      total_amount: totals.grandTotal,
      notes: v.notes,
      terms_and_conditions: v.termsAndConditions,
      created_by: auth.context.user.id,
    })
    .select()
    .single();

  if (invErr || !invoice) {
    return NextResponse.json({ error: invErr?.message || "Failed to generate invoice." }, { status: 400 });
  }

  const itemRows = v.items.map((it) => ({
    organization_id: v.organizationId,
    invoice_id: invoice.id,
    description: it.description,
    sku: it.sku,
    quantity: it.quantity,
    unit_price: it.unitPrice,
    discount: it.discount,
    tax: it.tax,
    line_total: Number(
      Math.max(0, it.quantity * it.unitPrice - it.discount + it.tax).toFixed(2)
    ),
  }));

  const { error: itemsErr } = await auth.supabase
    .from("invoice_items")
    .insert(itemRows);

  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message }, { status: 400 });
  }

  return NextResponse.json({ invoice }, { status: 201 });
}

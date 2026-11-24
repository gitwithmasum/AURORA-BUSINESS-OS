import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { expenseSchema } from "@/lib/validators/part4";
import { logActivity } from "@/lib/audit/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "finance.read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [expRes, accRes] = await Promise.all([
    auth.supabase
      .from("expenses")
      .select("*")
      .eq("organization_id", organizationId)
      .order("expense_date", { ascending: false }),
    auth.supabase
      .from("financial_accounts")
      .select("id, account_name, account_type")
      .eq("organization_id", organizationId),
  ]);

  if (expRes.error) {
    return NextResponse.json({ error: expRes.error.message }, { status: 400 });
  }
  return NextResponse.json({
    expenses: expRes.data ?? [],
    accounts: accRes.data ?? [],
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const auth = await requireOrgPermission(v.organizationId, "finance.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const amountBase = Number((v.amount * v.exchangeRate).toFixed(2));
  const { data, error } = await auth.supabase
    .from("expenses")
    .insert({
      organization_id: v.organizationId,
      category: v.category,
      vendor_name: v.vendorName,
      expense_date: v.expenseDate,
      currency: v.currency,
      exchange_rate: v.exchangeRate,
      amount: v.amount,
      amount_base: amountBase,
      payment_status: v.paymentStatus,
      account_id: v.accountId,
      approval_status: "pending",
      receipt_path: v.receiptPath,
      notes: v.notes,
      created_by: auth.context.user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(auth.supabase, {
    organizationId: v.organizationId,
    actorUserId: auth.context.user.id,
    eventType: "settings.updated",
    entityType: "expense",
    entityId: data.id,
    metadata: { category: v.category, amount_base: amountBase },
  });

  return NextResponse.json({ expense: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const organizationId = String(body?.organizationId || "");
  const expenseId = String(body?.expenseId || "");
  const decision = body?.decision === "rejected" ? "rejected" : "approved";

  if (!organizationId || !expenseId) {
    return NextResponse.json({ error: "organizationId and expenseId required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "finance.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase.rpc("approve_expense_txn", {
    p_organization_id: organizationId,
    p_expense_id: expenseId,
    p_decision: decision,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ result: data });
}

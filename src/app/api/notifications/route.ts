import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "dashboard.read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [dbNotifs, unpaidInvoices, pendingPos, pendingOrders] = await Promise.all([
    auth.supabase
      .from("notifications")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(30),
    auth.supabase
      .from("invoices")
      .select("id, invoice_number, counterparty_name, total_amount")
      .eq("organization_id", organizationId)
      .eq("payment_status", "unpaid")
      .limit(5),
    auth.supabase
      .from("purchase_orders")
      .select("id, po_number, status")
      .eq("organization_id", organizationId)
      .in("status", ["draft", "review"])
      .limit(5),
    auth.supabase
      .from("sales")
      .select("id, invoice_number, order_status")
      .eq("organization_id", organizationId)
      .in("order_status", ["pending", "processing"])
      .limit(5),
  ]);

  const liveAlerts: {
    id: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    is_read: boolean;
    action_url: string;
    created_at: string;
  }[] = [];

  for (const inv of unpaidInvoices.data ?? []) {
    liveAlerts.push({
      id: `live-inv-${inv.id}`,
      type: "unpaid_invoice",
      severity: "warning",
      title: `Unpaid Invoice ${inv.invoice_number}`,
      message: `${inv.counterparty_name} — ${inv.total_amount}`,
      is_read: false,
      action_url: "/orders",
      created_at: new Date().toISOString(),
    });
  }

  for (const po of pendingPos.data ?? []) {
    liveAlerts.push({
      id: `live-po-${po.id}`,
      type: "po_update",
      severity: "info",
      title: `PO ${po.po_number} (${po.status})`,
      message: "Awaiting review/approval before ordering.",
      is_read: false,
      action_url: "/purchases",
      created_at: new Date().toISOString(),
    });
  }

  for (const ord of pendingOrders.data ?? []) {
    liveAlerts.push({
      id: `live-ord-${ord.id}`,
      type: "pending_order",
      severity: "info",
      title: `Order ${ord.invoice_number} (${ord.order_status})`,
      message: "Pending fulfillment.",
      is_read: false,
      action_url: "/sales",
      created_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    notifications: [...(dbNotifs.data ?? []), ...liveAlerts],
  });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const organizationId = String(body?.organizationId || "");
  const notificationId = body?.notificationId ? String(body.notificationId) : null;
  const markAllRead = Boolean(body?.markAllRead ?? false);

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "dashboard.read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (markAllRead) {
    await auth.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("organization_id", organizationId);
  } else if (notificationId && !notificationId.startsWith("live-")) {
    await auth.supabase
      .from("notifications")
      .update({ is_read: Boolean(body?.isRead ?? true) })
      .eq("id", notificationId)
      .eq("organization_id", organizationId);
  }

  return NextResponse.json({ updated: true });
}

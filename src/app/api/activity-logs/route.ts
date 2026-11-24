import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  const eventType = searchParams.get("eventType")?.trim() || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = 25;

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "audit.read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let query = auth.supabase
    .from("activity_logs")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId);

  if (eventType) {
    query = query.ilike("event_type", `%${eventType}%`);
  }

  const from = (page - 1) * pageSize;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    logs: data ?? [],
    totalCount: count ?? 0,
    page,
    pageSize,
  });
}

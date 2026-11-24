import { NextResponse } from "next/server";
import { getAuthenticatedSessionContext } from "@/lib/auth/session";

export async function GET(request: Request) {
  const session = await getAuthenticatedSessionContext();
  if (!session.configured) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }
  if (!session.user || !session.supabase) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");

  let query = session.supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", session.user.id);

  query = organizationId
    ? query.eq("organization_id", organizationId)
    : query.is("organization_id", null);

  const { data, error } = await query.maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ preferences: data });
}

export async function PUT(request: Request) {
  const session = await getAuthenticatedSessionContext();
  if (!session.configured) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }
  if (!session.user || !session.supabase) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "JSON body required." }, { status: 400 });
  }

  const { data, error } = await session.supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: session.user.id,
        organization_id: body.organizationId ?? null,
        theme: body.theme ?? "midnight-blue",
        language: body.language ?? "en",
        sidebar_collapsed: Boolean(body.sidebarCollapsed),
        dashboard_density: body.dashboardDensity ?? "expanded",
        dashboard_layout: Array.isArray(body.dashboardLayout)
          ? body.dashboardLayout
          : [],
      },
      { onConflict: "user_id,organization_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ preferences: data });
}

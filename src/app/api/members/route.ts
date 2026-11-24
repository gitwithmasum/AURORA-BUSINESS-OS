import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { memberRoleUpdateSchema } from "@/lib/validators/part2";
import { logActivity } from "@/lib/audit/logger";

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

  const { data, error } = await auth.supabase
    .from("organization_members")
    .select(
      `
      id,
      user_id,
      role_key,
      status,
      created_at,
      profiles:user_id (email, full_name)
    `
    )
    .eq("organization_id", organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ members: data ?? [] });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = memberRoleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const auth = await requireOrgPermission(v.organizationId, "members.manage");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (v.roleKey === "owner" && auth.context.roleKey !== "owner") {
    return NextResponse.json(
      { error: "Only an existing Owner can assign the Owner role." },
      { status: 403 }
    );
  }

  const { data: roleRow } = await auth.supabase
    .from("roles")
    .select("id")
    .eq("key", v.roleKey)
    .single();

  if (!roleRow) {
    return NextResponse.json({ error: "Role definition not found." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("organization_members")
    .update({ role_id: roleRow.id, role_key: v.roleKey })
    .eq("id", v.memberId)
    .eq("organization_id", v.organizationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(auth.supabase, {
    organizationId: v.organizationId,
    actorUserId: auth.context.user.id,
    eventType: "member.permission_changed",
    entityType: "organization_member",
    entityId: v.memberId,
    metadata: { new_role: v.roleKey },
  });

  return NextResponse.json({ member: data });
}

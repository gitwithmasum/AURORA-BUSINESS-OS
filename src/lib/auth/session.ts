import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { hasPermission, type PermissionKey, type RoleKey } from "@/lib/auth/rbac";

export interface AuthenticatedOrgContext {
  user: { id: string; email: string };
  organizationId: string;
  roleKey: RoleKey;
  customPermissions: string[];
}

export async function getAuthenticatedSessionContext() {
  if (!isSupabaseConfigured()) {
    return { configured: false as const, user: null, supabase: null };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { configured: false as const, user: null, supabase: null };
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { configured: true as const, user: null, supabase };
  }

  return {
    configured: true as const,
    user: { id: user.id, email: user.email ?? "" },
    supabase,
  };
}

export async function requireOrgPermission(
  organizationId: string,
  requiredPermission?: PermissionKey
): Promise<
  | {
      ok: true;
      supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
      context: AuthenticatedOrgContext;
    }
  | { ok: false; status: number; error: string }
> {
  const session = await getAuthenticatedSessionContext();
  if (!session.configured) {
    return {
      ok: false,
      status: 503,
      error: "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    };
  }
  if (!session.user || !session.supabase) {
    return { ok: false, status: 401, error: "Authentication required." };
  }

  const { data: membership, error } = await session.supabase
    .from("organization_members")
    .select("role_key, custom_permissions, status")
    .eq("organization_id", organizationId)
    .eq("user_id", session.user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !membership) {
    return {
      ok: false,
      status: 403,
      error: "Access denied: active membership in this organization is required.",
    };
  }

  const roleKey = membership.role_key as RoleKey;
  const customPerms = Array.isArray(membership.custom_permissions)
    ? (membership.custom_permissions as string[])
    : [];

  if (requiredPermission && !hasPermission(roleKey, requiredPermission, customPerms)) {
    return {
      ok: false,
      status: 403,
      error: `Permission denied: requires ${requiredPermission}.`,
    };
  }

  return {
    ok: true,
    supabase: session.supabase,
    context: {
      user: session.user,
      organizationId,
      roleKey,
      customPermissions: customPerms,
    },
  };
}

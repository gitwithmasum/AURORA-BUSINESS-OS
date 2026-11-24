import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditEventType =
  | "user.login"
  | "user.logout"
  | "user.profile_updated"
  | "organization.created"
  | "workspace.created"
  | "settings.updated"
  | "category.created"
  | "attribute.created"
  | "product.created"
  | "product.updated"
  | "supplier.created"
  | "supplier.updated"
  | "member.permission_changed"
  | "storage.uploaded";

export async function logActivity(
  supabase: SupabaseClient,
  params: {
    organizationId?: string | null;
    actorUserId: string;
    eventType: AuditEventType;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("activity_logs").insert({
    organization_id: params.organizationId ?? null,
    actor_user_id: params.actorUserId,
    event_type: params.eventType,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("[aurora-audit] Failed to write activity_logs:", error.message);
  }
}

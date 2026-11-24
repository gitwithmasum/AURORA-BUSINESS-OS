import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import {
  buildOrgStoragePath,
  STORAGE_BUCKETS,
  validateStorageUpload,
  type AuroraStorageBucket,
} from "@/lib/storage/buckets";
import { logActivity } from "@/lib/audit/logger";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Multipart form data required." }, { status: 400 });
  }

  const organizationId = String(formData.get("organizationId") || "");
  const bucket = String(formData.get("bucket") || "") as AuroraStorageBucket;
  const file = formData.get("file");

  if (!organizationId || !bucket || !(file instanceof File)) {
    return NextResponse.json(
      { error: "organizationId, bucket, and file are required." },
      { status: 400 }
    );
  }

  const rule = STORAGE_BUCKETS[bucket];
  if (!rule) {
    return NextResponse.json({ error: "Invalid storage bucket." }, { status: 400 });
  }

  const validation = validateStorageUpload(bucket, {
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, rule.requiredPermission);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const objectPath = buildOrgStoragePath(organizationId, file.name);
  const arrayBuffer = await file.arrayBuffer();

  const { data, error } = await auth.supabase.storage
    .from(bucket)
    .upload(objectPath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(auth.supabase, {
    organizationId,
    actorUserId: auth.context.user.id,
    eventType: "storage.uploaded",
    entityType: "storage_object",
    entityId: data.path,
    metadata: { bucket, size: file.size, mimeType: file.type },
  });

  return NextResponse.json({ bucket, path: data.path }, { status: 201 });
}

export type AuroraStorageBucket =
  | "product-images"
  | "business-logos"
  | "supplier-documents"
  | "invoices"
  | "purchase-documents"
  | "import-documents";

export interface BucketConstraint {
  bucket: AuroraStorageBucket;
  label: string;
  maxBytes: number;
  allowedMimeTypes: string[];
  requiredPermission:
    | "products.write"
    | "settings.manage"
    | "suppliers.write"
    | "sales.write"
    | "purchases.write";
}

export const STORAGE_BUCKETS: Record<AuroraStorageBucket, BucketConstraint> = {
  "product-images": {
    bucket: "product-images",
    label: "Product Images",
    maxBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    requiredPermission: "products.write",
  },
  "business-logos": {
    bucket: "business-logos",
    label: "Business Logos",
    maxBytes: 3 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
    requiredPermission: "settings.manage",
  },
  "supplier-documents": {
    bucket: "supplier-documents",
    label: "Supplier Documents",
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    requiredPermission: "suppliers.write",
  },
  invoices: {
    bucket: "invoices",
    label: "Invoices",
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"],
    requiredPermission: "sales.write",
  },
  "purchase-documents": {
    bucket: "purchase-documents",
    label: "Purchase Documents",
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg"],
    requiredPermission: "purchases.write",
  },
  "import-documents": {
    bucket: "import-documents",
    label: "Import Documents",
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    requiredPermission: "purchases.write",
  },
};

export function validateStorageUpload(
  bucket: AuroraStorageBucket,
  file: { name: string; size: number; type: string }
): { valid: true } | { valid: false; reason: string } {
  const rule = STORAGE_BUCKETS[bucket];
  if (!rule) {
    return { valid: false, reason: "Unsupported storage bucket." };
  }
  if (file.size <= 0 || file.size > rule.maxBytes) {
    const mb = (rule.maxBytes / (1024 * 1024)).toFixed(0);
    return { valid: false, reason: `File size must be between 1 byte and ${mb} MB.` };
  }
  if (!rule.allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      reason: `Unsupported file type (${file.type || "unknown"}). Allowed: ${rule.allowedMimeTypes.join(", ")}.`,
    };
  }
  return { valid: true };
}

export function buildOrgStoragePath(organizationId: string, filename: string): string {
  const clean = filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${organizationId}/${Date.now()}-${clean || "upload"}`;
}

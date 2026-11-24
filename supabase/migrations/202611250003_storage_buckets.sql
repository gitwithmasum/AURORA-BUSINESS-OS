-- ============================================================================
-- AURORA BUSINESS OS — Migration 0003: Secure Storage Buckets & RLS Policies
-- ============================================================================
-- Object path convention enforced by RLS:
--   <organization_id>/<filename-or-subpath>
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images', 'product-images', FALSE, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('business-logos', 'business-logos', FALSE, 3145728, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('supplier-documents', 'supplier-documents', FALSE, 10485760, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('invoices', 'invoices', FALSE, 10485760, ARRAY['application/pdf']),
  ('purchase-documents', 'purchase-documents', FALSE, 10485760, ARRAY['application/pdf', 'image/png', 'image/jpeg']),
  ('import-documents', 'import-documents', FALSE, 10485760, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Helper: extract UUID prefix from storage object name "<org_id>/..."
CREATE OR REPLACE FUNCTION public.storage_object_org_id(object_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_first TEXT;
BEGIN
  v_first := split_part(object_name, '/', 1);
  IF v_first ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN v_first::uuid;
  END IF;
  RETURN NULL;
END;
$$;

-- Read access for active organization members
CREATE POLICY "aurora_storage_select_org_member"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('product-images', 'business-logos', 'supplier-documents', 'invoices', 'purchase-documents', 'import-documents')
    AND public.is_org_member(public.storage_object_org_id(name))
  );

-- Upload access gated by bucket-specific permission
CREATE POLICY "aurora_storage_insert_authorized"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    public.storage_object_org_id(name) IS NOT NULL
    AND (
      (bucket_id = 'product-images' AND public.has_org_permission(public.storage_object_org_id(name), 'products.write'))
      OR (bucket_id = 'business-logos' AND public.has_org_permission(public.storage_object_org_id(name), 'settings.manage'))
      OR (bucket_id = 'supplier-documents' AND public.has_org_permission(public.storage_object_org_id(name), 'suppliers.write'))
      OR (bucket_id = 'invoices' AND public.has_org_permission(public.storage_object_org_id(name), 'sales.write'))
      OR (bucket_id IN ('purchase-documents', 'import-documents') AND public.has_org_permission(public.storage_object_org_id(name), 'purchases.write'))
    )
  );

-- Delete access gated by bucket-specific permission
CREATE POLICY "aurora_storage_delete_authorized"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    public.storage_object_org_id(name) IS NOT NULL
    AND (
      (bucket_id = 'product-images' AND public.has_org_permission(public.storage_object_org_id(name), 'products.write'))
      OR (bucket_id = 'business-logos' AND public.has_org_permission(public.storage_object_org_id(name), 'settings.manage'))
      OR (bucket_id = 'supplier-documents' AND public.has_org_permission(public.storage_object_org_id(name), 'suppliers.write'))
      OR (bucket_id = 'invoices' AND public.has_org_permission(public.storage_object_org_id(name), 'sales.write'))
      OR (bucket_id IN ('purchase-documents', 'import-documents') AND public.has_org_permission(public.storage_object_org_id(name), 'purchases.write'))
    )
  );

-- ============================================================================
-- AURORA BUSINESS OS — Live PostgreSQL RLS Isolation Verification Script
-- Run in Supabase SQL Editor or psql inside a rolled-back test transaction.
-- ============================================================================

BEGIN;

-- Verify RLS is enabled on every core tenant table
DO $$
DECLARE
  v_missing INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_missing
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'organizations', 'workspaces', 'profiles', 'organization_members',
      'business_settings', 'business_categories', 'custom_product_attributes',
      'brands', 'products', 'product_attribute_values', 'warehouses',
      'inventory', 'suppliers', 'customers', 'financial_accounts',
      'notifications', 'user_preferences', 'activity_logs'
    )
    AND rowsecurity = FALSE;

  IF v_missing > 0 THEN
    RAISE EXCEPTION 'RLS is NOT enabled on % core table(s)!', v_missing;
  END IF;
END $$;

-- Verify all 7 system roles exist
DO $$
DECLARE
  v_role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_role_count
  FROM public.roles
  WHERE key IN ('owner','admin','manager','accountant','inventory_manager','salesperson','viewer');

  IF v_role_count <> 7 THEN
    RAISE EXCEPTION 'Expected 7 RBAC roles, found %', v_role_count;
  END IF;
END $$;

ROLLBACK;

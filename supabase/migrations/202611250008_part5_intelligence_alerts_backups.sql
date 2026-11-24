-- ============================================================================
-- AURORA BUSINESS OS — Migration 0008: Part 05 Intelligence, Alerts & Backups
-- ============================================================================

-- 1. Configurable Stock Alert Thresholds & Notification Preferences
CREATE TABLE IF NOT EXISTS public.stock_alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  overstock_multiplier NUMERIC(6, 2) NOT NULL DEFAULT 5.0 CHECK (overstock_multiplier >= 1),
  fast_moving_window_days INTEGER NOT NULL DEFAULT 30 CHECK (fast_moving_window_days >= 1),
  fast_moving_min_units INTEGER NOT NULL DEFAULT 20 CHECK (fast_moving_min_units >= 1),
  slow_moving_window_days INTEGER NOT NULL DEFAULT 60 CHECK (slow_moving_window_days >= 1),
  expiry_warning_days INTEGER NOT NULL DEFAULT 45 CHECK (expiry_warning_days >= 1),
  default_lead_time_days INTEGER NOT NULL DEFAULT 14 CHECK (default_lead_time_days >= 1),
  safety_stock_days INTEGER NOT NULL DEFAULT 7 CHECK (safety_stock_days >= 0),
  email_alerts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_stock_alert_settings_updated_at
  BEFORE UPDATE ON public.stock_alert_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. AI Action Proposals (Human-in-the-Loop Approval Required)
CREATE TABLE IF NOT EXISTS public.ai_action_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  proposal_type TEXT NOT NULL CHECK (proposal_type IN ('reorder_po', 'price_review', 'ad_budget_review', 'stock_audit')),
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected')),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Backup & Import Audit Snapshots
CREATE TABLE IF NOT EXISTS public.backup_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('json_backup_export', 'csv_import', 'excel_import')),
  entity_scope TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  validation_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable RLS & Organization Isolation
ALTER TABLE public.stock_alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_alert_settings_select" ON public.stock_alert_settings FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "stock_alert_settings_manage" ON public.stock_alert_settings FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'inventory.write') OR public.has_org_permission(organization_id, 'settings.manage'))
  WITH CHECK (public.has_org_permission(organization_id, 'inventory.write') OR public.has_org_permission(organization_id, 'settings.manage'));

CREATE POLICY "ai_proposals_select" ON public.ai_action_proposals FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "ai_proposals_insert" ON public.ai_action_proposals FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "ai_proposals_review" ON public.ai_action_proposals FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']));

CREATE POLICY "backup_snapshots_select" ON public.backup_snapshots FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'settings.manage') OR public.has_org_permission(organization_id, 'audit.read'));
CREATE POLICY "backup_snapshots_insert" ON public.backup_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.has_org_permission(organization_id, 'settings.manage'));

CREATE INDEX IF NOT EXISTS idx_ai_proposals_org ON public.ai_action_proposals(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_snapshots_org ON public.backup_snapshots(organization_id, created_at DESC);

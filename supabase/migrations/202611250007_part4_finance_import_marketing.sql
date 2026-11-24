-- ============================================================================
-- AURORA BUSINESS OS — Migration 0007: Part 04 Financial, Import, Shipping & Ads
-- ============================================================================

-- 1. Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN (
      'Rent', 'Salary', 'Marketing', 'Shipping', 'Customs',
      'Packaging', 'Utilities', 'Software', 'Transportation', 'Other Expenses'
    )
  ),
  vendor_name TEXT NOT NULL DEFAULT '',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency TEXT NOT NULL DEFAULT 'BDT',
  exchange_rate NUMERIC(14, 4) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  amount_base NUMERIC(14, 2) NOT NULL CHECK (amount_base >= 0),
  payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'unpaid')),
  account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  receipt_path TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Configurable Dated Bangladesh Customs & VAT Tax Assumptions
CREATE TABLE IF NOT EXISTS public.tax_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hs_code TEXT NOT NULL DEFAULT '',
  product_description TEXT NOT NULL DEFAULT '',
  country_of_origin TEXT NOT NULL DEFAULT 'Saudi Arabia',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customs_duty_pct NUMERIC(7, 4) NOT NULL DEFAULT 0 CHECK (customs_duty_pct >= 0),
  regulatory_duty_pct NUMERIC(7, 4) NOT NULL DEFAULT 0 CHECK (regulatory_duty_pct >= 0),
  supplementary_duty_pct NUMERIC(7, 4) NOT NULL DEFAULT 0 CHECK (supplementary_duty_pct >= 0),
  vat_pct NUMERIC(7, 4) NOT NULL DEFAULT 0 CHECK (vat_pct >= 0),
  advance_tax_pct NUMERIC(7, 4) NOT NULL DEFAULT 0 CHECK (advance_tax_pct >= 0),
  other_tax_pct NUMERIC(7, 4) NOT NULL DEFAULT 0 CHECK (other_tax_pct >= 0),
  calculation_basis TEXT NOT NULL DEFAULT 'cascading_bd_customs',
  assumptions_note TEXT NOT NULL DEFAULT 'Estimated rates configured by user; verify against current Bangladesh Customs tariff before clearance.',
  is_verified_by_user BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Import Cost Scenarios & Line Items (Historical Snapshots Preserved)
CREATE TABLE IF NOT EXISTS public.import_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scenario_mode TEXT NOT NULL DEFAULT 'single' CHECK (scenario_mode IN ('single', 'bulk')),
  origin_country TEXT NOT NULL DEFAULT 'Saudi Arabia',
  destination_country TEXT NOT NULL DEFAULT 'Bangladesh',
  fx_currency TEXT NOT NULL DEFAULT 'SAR',
  exchange_rate NUMERIC(14, 4) NOT NULL CHECK (exchange_rate > 0),
  allocation_method TEXT NOT NULL DEFAULT 'value' CHECK (allocation_method IN ('value', 'quantity', 'equal')),
  tax_config_id UUID REFERENCES public.tax_configurations(id) ON DELETE SET NULL,
  supplier_fees NUMERIC(14, 2) NOT NULL DEFAULT 0,
  origin_handling NUMERIC(14, 2) NOT NULL DEFAULT 0,
  freight_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  insurance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  assessable_value_bdt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  estimated_customs_duty_bdt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  estimated_taxes_bdt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  clearing_forwarding_bdt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  local_transport_bdt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  other_expenses_bdt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_purchase_foreign NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_purchase_bdt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_import_cost_bdt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_landed_cost_bdt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_estimate BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.import_cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES public.import_scenarios(id) ON DELETE CASCADE,
  sku TEXT NOT NULL DEFAULT '',
  product_name TEXT NOT NULL,
  brand_name TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
  unit_price_foreign NUMERIC(14, 4) NOT NULL CHECK (unit_price_foreign >= 0),
  purchase_cost_bdt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  allocated_import_cost_bdt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  landed_cost_bdt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  landed_cost_per_unit_bdt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  recommended_selling_price_bdt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  expected_gross_profit_bdt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  expected_margin_pct NUMERIC(7, 2) NOT NULL DEFAULT 0
);

-- 4. Shipping & Logistics Calculations
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  origin_country TEXT NOT NULL DEFAULT 'Saudi Arabia',
  destination_country TEXT NOT NULL DEFAULT 'Bangladesh',
  shipping_method TEXT NOT NULL CHECK (shipping_method IN ('air_freight', 'sea_freight', 'courier', 'freight_forwarder')),
  carrier_name TEXT NOT NULL DEFAULT '',
  packages_count INTEGER NOT NULL DEFAULT 1 CHECK (packages_count >= 1),
  gross_weight_kg NUMERIC(14, 3) NOT NULL CHECK (gross_weight_kg >= 0),
  length_cm NUMERIC(10, 2) NOT NULL DEFAULT 0,
  width_cm NUMERIC(10, 2) NOT NULL DEFAULT 0,
  height_cm NUMERIC(10, 2) NOT NULL DEFAULT 0,
  volumetric_weight_kg NUMERIC(14, 3) NOT NULL DEFAULT 0,
  chargeable_weight_kg NUMERIC(14, 3) NOT NULL DEFAULT 0,
  freight_rate_per_kg NUMERIC(14, 2) NOT NULL DEFAULT 0,
  insurance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  handling_fee NUMERIC(14, 2) NOT NULL DEFAULT 0,
  dg_surcharge NUMERIC(14, 2) NOT NULL DEFAULT 0,
  other_charges NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_shipping_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  unit_count INTEGER NOT NULL DEFAULT 1 CHECK (unit_count >= 1),
  cost_per_unit NUMERIC(14, 2) NOT NULL DEFAULT 0,
  estimated_delivery_days TEXT NOT NULL DEFAULT '',
  dg_review_required BOOLEAN NOT NULL DEFAULT TRUE,
  dg_carrier_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Marketing Campaigns & Ads ROI
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'Facebook',
  objective TEXT NOT NULL DEFAULT 'Conversions',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  budget NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (budget >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  actual_spend NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (actual_spend >= 0),
  impressions INTEGER NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  reach INTEGER NOT NULL DEFAULT 0 CHECK (reach >= 0),
  clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  leads INTEGER NOT NULL DEFAULT 0 CHECK (leads >= 0),
  orders INTEGER NOT NULL DEFAULT 0 CHECK (orders >= 0),
  revenue NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (revenue >= 0),
  product_costs NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (product_costs >= 0),
  other_variable_costs NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (other_variable_costs >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Enable RLS & Organization Policies
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'finance.read'));
CREATE POLICY "expenses_manage" ON public.expenses FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'finance.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'finance.write'));

CREATE POLICY "tax_configs_select" ON public.tax_configurations FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "tax_configs_manage" ON public.tax_configurations FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'finance.write') OR public.has_org_permission(organization_id, 'purchases.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'finance.write') OR public.has_org_permission(organization_id, 'purchases.write'));

CREATE POLICY "import_scenarios_select" ON public.import_scenarios FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "import_scenarios_manage" ON public.import_scenarios FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'purchases.write') OR public.has_org_permission(organization_id, 'finance.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'purchases.write') OR public.has_org_permission(organization_id, 'finance.write'));

CREATE POLICY "import_cost_items_select" ON public.import_cost_items FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "import_cost_items_manage" ON public.import_cost_items FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'purchases.write') OR public.has_org_permission(organization_id, 'finance.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'purchases.write') OR public.has_org_permission(organization_id, 'finance.write'));

CREATE POLICY "shipments_select" ON public.shipments FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "shipments_manage" ON public.shipments FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'purchases.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'purchases.write'));

CREATE POLICY "marketing_campaigns_select" ON public.marketing_campaigns FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "marketing_campaigns_manage" ON public.marketing_campaigns FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'finance.write') OR public.has_org_role(organization_id, ARRAY['owner','admin','manager']))
  WITH CHECK (public.has_org_permission(organization_id, 'finance.write') OR public.has_org_role(organization_id, ARRAY['owner','admin','manager']));

CREATE POLICY "marketing_metrics_select" ON public.marketing_metrics FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "marketing_metrics_manage" ON public.marketing_metrics FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'finance.write') OR public.has_org_role(organization_id, ARRAY['owner','admin','manager']))
  WITH CHECK (public.has_org_permission(organization_id, 'finance.write') OR public.has_org_role(organization_id, ARRAY['owner','admin','manager']));

-- 7. Atomic Expense Approval + Cash Flow Outflow RPC
CREATE OR REPLACE FUNCTION public.approve_expense_txn(
  p_organization_id UUID,
  p_expense_id UUID,
  p_decision TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_exp RECORD;
  v_fin_category TEXT;
BEGIN
  IF v_user_id IS NULL OR NOT public.has_org_role(p_organization_id, ARRAY['owner', 'admin', 'manager', 'accountant']) THEN
    RAISE EXCEPTION 'Only Owner, Admin, Manager, or Accountant can approve expenses';
  END IF;

  SELECT * INTO v_exp FROM public.expenses
  WHERE id = p_expense_id AND organization_id = p_organization_id
  FOR UPDATE;

  IF v_exp.id IS NULL THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  IF v_exp.approval_status <> 'pending' THEN
    RAISE EXCEPTION 'Expense is already %', v_exp.approval_status;
  END IF;

  UPDATE public.expenses
  SET approval_status = p_decision,
      approved_by = v_user_id,
      approved_at = NOW()
  WHERE id = p_expense_id;

  IF p_decision = 'approved' AND v_exp.payment_status = 'paid' THEN
    v_fin_category := CASE v_exp.category
      WHEN 'Marketing' THEN 'marketing_payment'
      WHEN 'Shipping' THEN 'freight_payment'
      WHEN 'Customs' THEN 'customs_payment'
      ELSE 'operating_expense'
    END;

    INSERT INTO public.financial_transactions (
      organization_id, account_id, direction, category, amount, tx_date,
      reference_type, reference_id, description, actor_user_id
    )
    VALUES (
      p_organization_id, v_exp.account_id, 'outflow', v_fin_category, v_exp.amount_base,
      v_exp.expense_date, 'expense', v_exp.id::text,
      v_exp.category || COALESCE(' — ' || NULLIF(v_exp.vendor_name, ''), ''), v_user_id
    );
  END IF;

  INSERT INTO public.activity_logs (organization_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  VALUES (
    p_organization_id, v_user_id, 'expense.' || p_decision, 'expense', p_expense_id::text,
    jsonb_build_object('category', v_exp.category, 'amount_base', v_exp.amount_base)
  );

  RETURN jsonb_build_object('expense_id', p_expense_id, 'approval_status', p_decision);
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON public.expenses(organization_id, expense_date DESC, approval_status);
CREATE INDEX IF NOT EXISTS idx_import_scenarios_org ON public.import_scenarios(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_org ON public.shipments(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_metrics_org ON public.marketing_metrics(organization_id, metric_date DESC);

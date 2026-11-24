-- ============================================================================
-- AURORA BUSINESS OS — Migration 0002: RLS Isolation, RBAC Helpers & Onboarding RPC
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Security Helper Functions (SECURITY DEFINER, search_path pinned)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
    AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(p_org_id UUID, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role_key = ANY(p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_permission(p_org_id UUID, p_permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    LEFT JOIN public.role_permissions rp ON rp.role_id = om.role_id
    LEFT JOIN public.permissions p ON p.id = rp.permission_id
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND (
        om.role_key = 'owner'
        OR p.key = p_permission_key
        OR (om.custom_permissions ? p_permission_key)
      )
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. Enable RLS Across All Business Tables
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. RLS Policies
-- ----------------------------------------------------------------------------

-- Profiles: own profile or fellow active member of shared org
CREATE POLICY "profiles_select_self_or_org"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members m1
      JOIN public.organization_members m2 ON m1.organization_id = m2.organization_id
      WHERE m1.user_id = auth.uid()
        AND m2.user_id = profiles.id
        AND m1.status = 'active'
        AND m2.status = 'active'
    )
  );

CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- System Role/Permission Catalog: read-only to authenticated users
CREATE POLICY "roles_select_authenticated"
  ON public.roles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "permissions_select_authenticated"
  ON public.permissions FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "role_permissions_select_authenticated"
  ON public.role_permissions FOR SELECT TO authenticated USING (TRUE);

-- Organizations: isolated to active members; insert by authenticated owner; update by owner/admin
CREATE POLICY "organizations_select_member"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (id IN (SELECT public.user_org_ids()));

CREATE POLICY "organizations_insert_owner"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "organizations_update_admin"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (public.has_org_role(id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_org_role(id, ARRAY['owner', 'admin']));

-- Workspaces
CREATE POLICY "workspaces_select_member"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "workspaces_manage_admin"
  ON public.workspaces FOR ALL
  TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']));

-- Organization Members
CREATE POLICY "org_members_select_member"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "org_members_manage_admin"
  ON public.organization_members FOR ALL
  TO authenticated
  USING (public.has_org_permission(organization_id, 'members.manage'))
  WITH CHECK (public.has_org_permission(organization_id, 'members.manage'));

-- Business Settings
CREATE POLICY "business_settings_select_member"
  ON public.business_settings FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "business_settings_manage_admin"
  ON public.business_settings FOR ALL
  TO authenticated
  USING (public.has_org_permission(organization_id, 'settings.manage'))
  WITH CHECK (public.has_org_permission(organization_id, 'settings.manage'));

-- Business Categories & Custom Attributes
CREATE POLICY "categories_select_member"
  ON public.business_categories FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "categories_manage_authorized"
  ON public.business_categories FOR ALL
  TO authenticated
  USING (public.has_org_permission(organization_id, 'categories.manage'))
  WITH CHECK (public.has_org_permission(organization_id, 'categories.manage'));

CREATE POLICY "attributes_select_member"
  ON public.custom_product_attributes FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "attributes_manage_authorized"
  ON public.custom_product_attributes FOR ALL
  TO authenticated
  USING (public.has_org_permission(organization_id, 'categories.manage'))
  WITH CHECK (public.has_org_permission(organization_id, 'categories.manage'));

-- Brands, Products, Product Attribute Values, Warehouses, Inventory
CREATE POLICY "brands_select_member"
  ON public.brands FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

CREATE POLICY "brands_manage_inventory"
  ON public.brands FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'products.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'products.write'));

CREATE POLICY "products_select_member"
  ON public.products FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

CREATE POLICY "products_manage_inventory"
  ON public.products FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'products.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'products.write'));

CREATE POLICY "product_attr_values_select_member"
  ON public.product_attribute_values FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

CREATE POLICY "product_attr_values_manage_inventory"
  ON public.product_attribute_values FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'products.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'products.write'));

CREATE POLICY "warehouses_select_member"
  ON public.warehouses FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

CREATE POLICY "warehouses_manage_inventory"
  ON public.warehouses FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'inventory.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'inventory.write'));

CREATE POLICY "inventory_select_member"
  ON public.inventory FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

CREATE POLICY "inventory_manage_authorized"
  ON public.inventory FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'inventory.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'inventory.write'));

-- Suppliers & Customers
CREATE POLICY "suppliers_select_member"
  ON public.suppliers FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

CREATE POLICY "suppliers_manage_authorized"
  ON public.suppliers FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'suppliers.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'suppliers.write'));

CREATE POLICY "customers_select_authorized"
  ON public.customers FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'customers.read'));

CREATE POLICY "customers_manage_authorized"
  ON public.customers FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'customers.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'customers.write'));

-- Financial Accounts
CREATE POLICY "financial_accounts_select_authorized"
  ON public.financial_accounts FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'finance.read'));

CREATE POLICY "financial_accounts_manage_authorized"
  ON public.financial_accounts FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'finance.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'finance.write'));

-- Notifications & Preferences
CREATE POLICY "notifications_select_org_or_user"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "user_preferences_own"
  ON public.user_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Activity Logs: members can read their org's audit trail; authenticated can insert scoped to self
CREATE POLICY "activity_logs_select_member"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (
    (organization_id IS NULL AND actor_user_id = auth.uid())
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  );

CREATE POLICY "activity_logs_insert_authenticated"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND (organization_id IS NULL OR public.is_org_member(organization_id))
  );

-- ----------------------------------------------------------------------------
-- 4. Helper for Default Dynamic Category Attributes + Atomic Org Provisioning RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_default_category_attributes(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perfume_id UUID;
  v_electronics_id UUID;
  v_fashion_id UUID;
BEGIN
  SELECT id INTO v_perfume_id FROM public.business_categories WHERE organization_id = p_org_id AND slug = 'perfume-fragrance';
  SELECT id INTO v_electronics_id FROM public.business_categories WHERE organization_id = p_org_id AND slug = 'electronics';
  SELECT id INTO v_fashion_id FROM public.business_categories WHERE organization_id = p_org_id AND slug = 'fashion-clothing';

  IF v_perfume_id IS NOT NULL THEN
    INSERT INTO public.custom_product_attributes (organization_id, category_id, key, label, data_type, options, unit, is_required, sort_order)
    VALUES
      (p_org_id, v_perfume_id, 'perfume_name', 'Perfume Name', 'text', '[]'::jsonb, NULL, TRUE, 1),
      (p_org_id, v_perfume_id, 'volume_ml', 'Volume (ml)', 'number', '[]'::jsonb, 'ml', TRUE, 2),
      (p_org_id, v_perfume_id, 'concentration', 'Concentration', 'select', '["EDP","EDT","EDC","Extrait","Attar / Oil"]'::jsonb, NULL, TRUE, 3),
      (p_org_id, v_perfume_id, 'fragrance_family', 'Fragrance Family', 'select', '["Amber / Oriental","Woody","Oud","Floral","Fresh / Aquatic","Gourmand"]'::jsonb, NULL, FALSE, 4),
      (p_org_id, v_perfume_id, 'top_notes', 'Top Notes', 'text', '[]'::jsonb, NULL, FALSE, 5),
      (p_org_id, v_perfume_id, 'middle_notes', 'Middle Notes', 'text', '[]'::jsonb, NULL, FALSE, 6),
      (p_org_id, v_perfume_id, 'base_notes', 'Base Notes', 'text', '[]'::jsonb, NULL, FALSE, 7),
      (p_org_id, v_perfume_id, 'gender_audience', 'Gender / Audience', 'select', '["Unisex","Men","Women"]'::jsonb, NULL, FALSE, 8),
      (p_org_id, v_perfume_id, 'country_of_origin', 'Country of Origin', 'text', '[]'::jsonb, NULL, FALSE, 9),
      (p_org_id, v_perfume_id, 'batch_number', 'Batch Number', 'text', '[]'::jsonb, NULL, FALSE, 10),
      (p_org_id, v_perfume_id, 'authenticity_status', 'Authenticity Status', 'select', '["Pending Review","Supplier Invoice Verified","Sample / Unverified"]'::jsonb, NULL, FALSE, 11)
    ON CONFLICT (organization_id, category_id, key) DO NOTHING;
  END IF;

  IF v_electronics_id IS NOT NULL THEN
    INSERT INTO public.custom_product_attributes (organization_id, category_id, key, label, data_type, options, unit, is_required, sort_order)
    VALUES
      (p_org_id, v_electronics_id, 'manufacturer', 'Manufacturer', 'text', '[]'::jsonb, NULL, TRUE, 1),
      (p_org_id, v_electronics_id, 'model', 'Model', 'text', '[]'::jsonb, NULL, TRUE, 2),
      (p_org_id, v_electronics_id, 'serial_number', 'Serial Number', 'text', '[]'::jsonb, NULL, FALSE, 3),
      (p_org_id, v_electronics_id, 'warranty_months', 'Warranty (Months)', 'number', '[]'::jsonb, 'months', FALSE, 4),
      (p_org_id, v_electronics_id, 'specifications', 'Specifications', 'text', '[]'::jsonb, NULL, FALSE, 5)
    ON CONFLICT (organization_id, category_id, key) DO NOTHING;
  END IF;

  IF v_fashion_id IS NOT NULL THEN
    INSERT INTO public.custom_product_attributes (organization_id, category_id, key, label, data_type, options, unit, is_required, sort_order)
    VALUES
      (p_org_id, v_fashion_id, 'size', 'Size', 'text', '[]'::jsonb, NULL, TRUE, 1),
      (p_org_id, v_fashion_id, 'color', 'Color', 'text', '[]'::jsonb, NULL, TRUE, 2),
      (p_org_id, v_fashion_id, 'material', 'Material', 'text', '[]'::jsonb, NULL, FALSE, 3),
      (p_org_id, v_fashion_id, 'collection', 'Collection', 'text', '[]'::jsonb, NULL, FALSE, 4)
    ON CONFLICT (organization_id, category_id, key) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_organization_with_setup(
  p_business_name TEXT,
  p_category_slug TEXT,
  p_country TEXT,
  p_currency TEXT,
  p_timezone TEXT,
  p_address_line TEXT DEFAULT '',
  p_city TEXT DEFAULT '',
  p_contact_email TEXT DEFAULT '',
  p_contact_phone TEXT DEFAULT '',
  p_logo_path TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_owner_role_id UUID;
  v_org_id UUID;
  v_workspace_id UUID;
  v_category_id UUID;
  v_slug TEXT;
  v_cat RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF char_length(trim(COALESCE(p_business_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Business name must be at least 2 characters';
  END IF;

  SELECT id INTO v_owner_role_id FROM public.roles WHERE key = 'owner';
  IF v_owner_role_id IS NULL THEN
    RAISE EXCEPTION 'System owner role is not seeded';
  END IF;

  v_slug := regexp_replace(lower(trim(p_business_name)), '[^a-z0-9]+', '-', 'g');
  v_slug := trim(BOTH '-' FROM v_slug);
  IF v_slug = '' THEN
    v_slug := 'aurora-org';
  END IF;
  v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  INSERT INTO public.organizations (name, slug, owner_user_id)
  VALUES (trim(p_business_name), v_slug, v_user_id)
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role_id, role_key, status)
  VALUES (v_org_id, v_user_id, v_owner_role_id, 'owner', 'active');

  INSERT INTO public.workspaces (organization_id, name, code, category_slug, currency, is_default)
  VALUES (v_org_id, trim(p_business_name) || ' HQ', 'HQ-01', p_category_slug, p_currency, TRUE)
  RETURNING id INTO v_workspace_id;

  -- Seed the 10 standard business categories for this organization
  FOR v_cat IN
    SELECT * FROM (VALUES
      ('perfume-fragrance', 'Perfume & Fragrance', 'Luxury perfume, attar, and KSA-to-BD import retail', 'Sparkles'),
      ('fashion-clothing', 'Fashion & Clothing', 'Apparel, footwear, and seasonal collections', 'Shirt'),
      ('electronics', 'Electronics', 'Devices, gadgets, and warranty-tracked SKUs', 'Cpu'),
      ('cosmetics-skincare', 'Cosmetics & Skincare', 'Beauty, dermatology, and personal care', 'Droplets'),
      ('grocery-retail', 'Grocery & Retail', 'Supermarket and fast-moving consumer goods', 'ShoppingBasket'),
      ('food-beverage', 'Food & Beverage', 'Packaged foods, specialty beverages, and cafe stock', 'Utensils'),
      ('wholesale-distribution', 'Wholesale Distribution', 'B2B bulk distribution and dealer supply', 'Boxes'),
      ('import-export', 'Import & Export', 'Cross-border procurement and customs shipments', 'PlaneLanding'),
      ('general-retail', 'General Retail', 'Multi-line storefront and general merchandise', 'Store'),
      ('custom-business', 'Custom Business', 'Define your own product attribute schema', 'Sliders')
    ) AS t(slug, name, description, icon)
  LOOP
    INSERT INTO public.business_categories (organization_id, slug, name, description, icon, is_system_preset)
    VALUES (v_org_id, v_cat.slug, v_cat.name, v_cat.description, v_cat.icon, TRUE);
  END LOOP;

  SELECT id INTO v_category_id
  FROM public.business_categories
  WHERE organization_id = v_org_id AND slug = p_category_slug
  LIMIT 1;

  IF v_category_id IS NULL THEN
    SELECT id INTO v_category_id
    FROM public.business_categories
    WHERE organization_id = v_org_id AND slug = 'general-retail'
    LIMIT 1;
  END IF;

  -- Seed default dynamic attributes for Perfume & Fragrance, Electronics, and Fashion
  PERFORM public.seed_default_category_attributes(v_org_id);

  INSERT INTO public.business_settings (
    organization_id,
    business_name,
    primary_category_id,
    primary_category_slug,
    country,
    currency,
    timezone,
    address_line,
    city,
    contact_email,
    contact_phone,
    logo_path,
    onboarding_completed
  )
  VALUES (
    v_org_id,
    trim(p_business_name),
    v_category_id,
    p_category_slug,
    p_country,
    p_currency,
    p_timezone,
    COALESCE(p_address_line, ''),
    COALESCE(p_city, ''),
    COALESCE(p_contact_email, ''),
    COALESCE(p_contact_phone, ''),
    p_logo_path,
    TRUE
  );

  INSERT INTO public.warehouses (organization_id, workspace_id, name, code, address, is_default)
  VALUES (v_org_id, v_workspace_id, 'Main Warehouse', 'WH-01', COALESCE(p_address_line, ''), TRUE);

  INSERT INTO public.financial_accounts (organization_id, account_name, account_type, currency, opening_balance)
  VALUES (v_org_id, 'Primary Cash Drawer', 'cash', p_currency, 0);

  INSERT INTO public.activity_logs (organization_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  VALUES (
    v_org_id,
    v_user_id,
    'organization.created',
    'organization',
    v_org_id::text,
    jsonb_build_object('business_name', trim(p_business_name), 'category', p_category_slug, 'currency', p_currency)
  );

  RETURN jsonb_build_object(
    'organization_id', v_org_id,
    'workspace_id', v_workspace_id,
    'category_id', v_category_id,
    'slug', v_slug
  );
END;
$$;

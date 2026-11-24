-- ============================================================================
-- AURORA BUSINESS OS — Migration 0005: Part 03 Core Operations Schema & RLS
-- ============================================================================

-- 1. Extend Part 02 core tables with Part 03 operational columns
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS logo_path TEXT;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS default_supplier_id UUID,
  ADD COLUMN IF NOT EXISTS supplier_invoice_ref TEXT NOT NULL DEFAULT '';

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS brands_supplied TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS product_categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS wholesale_price_hint NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS retail_price_hint NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS total_orders INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_purchase_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_purchase_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_at DATE;

-- 2. Immutable Inventory Movements Ledger
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL DEFAULT 'DEFAULT',
  movement_type TEXT NOT NULL CHECK (
    movement_type IN (
      'stock_in',
      'stock_out',
      'adjustment',
      'transfer_in',
      'transfer_out',
      'sale',
      'sale_return',
      'purchase_receive'
    )
  ),
  quantity_delta NUMERIC(14, 2) NOT NULL,
  quantity_after NUMERIC(14, 2) NOT NULL,
  unit_cost NUMERIC(14, 4) NOT NULL DEFAULT 0,
  reference_type TEXT NOT NULL DEFAULT 'manual',
  reference_id TEXT,
  override_authorized BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL DEFAULT '',
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Supplier Mapping, Price History & Documents
CREATE TABLE IF NOT EXISTS public.supplier_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, supplier_id, brand_id)
);

CREATE TABLE IF NOT EXISTS public.supplier_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_label TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'SAR',
  wholesale_price NUMERIC(14, 4) NOT NULL CHECK (wholesale_price >= 0),
  retail_price NUMERIC(14, 4),
  quoted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.supplier_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'authorization',
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Sales, Sale Items, Returns & Financial Cash/Payment Records
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  channel TEXT NOT NULL DEFAULT 'Showroom',
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partial', 'unpaid', 'refunded')),
  order_status TEXT NOT NULL DEFAULT 'completed' CHECK (order_status IN ('pending', 'processing', 'completed', 'cancelled', 'returned')),
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  cogs_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  salesperson_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, invoice_number)
);

CREATE TRIGGER trg_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  product_name_snapshot TEXT NOT NULL,
  sku_snapshot TEXT NOT NULL,
  quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
  discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  unit_cost_at_sale NUMERIC(14, 4) NOT NULL DEFAULT 0,
  line_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  return_number TEXT NOT NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL DEFAULT '',
  refund_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
  restock_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rejected')),
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, return_number)
);

CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inflow', 'outflow')),
  category TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  tx_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  reference_type TEXT NOT NULL,
  reference_id TEXT,
  description TEXT NOT NULL DEFAULT '',
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Purchase Orders & Receiving Purchases
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  po_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'review', 'approved', 'ordered', 'partially_received', 'received', 'cancelled')
  ),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  currency TEXT NOT NULL DEFAULT 'SAR',
  exchange_rate NUMERIC(14, 4) NOT NULL DEFAULT 1,
  shipping_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  additional_costs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  payment_terms TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, po_number)
);

CREATE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name_snapshot TEXT NOT NULL,
  sku_snapshot TEXT NOT NULL,
  brand_snapshot TEXT NOT NULL DEFAULT '',
  quantity_ordered NUMERIC(14, 2) NOT NULL CHECK (quantity_ordered > 0),
  quantity_received NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  unit_price NUMERIC(14, 4) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  po_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  purchase_number TEXT NOT NULL,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency TEXT NOT NULL DEFAULT 'SAR',
  additional_costs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  notes TEXT NOT NULL DEFAULT '',
  received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, purchase_number)
);

CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  batch_number TEXT NOT NULL DEFAULT 'DEFAULT',
  quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(14, 4) NOT NULL CHECK (unit_cost >= 0),
  allocated_landed_cost NUMERIC(14, 4) NOT NULL DEFAULT 0
);

-- 6. Invoices (Sales, Purchase, Proforma, Credit Note)
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('sales', 'purchase', 'proforma', 'credit_note')),
  invoice_number TEXT NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  counterparty_name TEXT NOT NULL,
  counterparty_contact TEXT NOT NULL DEFAULT '',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid', 'refunded')),
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  terms_and_conditions TEXT NOT NULL DEFAULT 'Goods sold are subject to organization verification policy.',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  sku TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(14, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax NUMERIC(14, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14, 2) NOT NULL DEFAULT 0
);

-- 7. Enable RLS & Organization Policies
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_movements_select" ON public.inventory_movements FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'inventory.read'));
CREATE POLICY "inv_movements_insert" ON public.inventory_movements FOR INSERT TO authenticated
  WITH CHECK (public.has_org_permission(organization_id, 'inventory.write'));

CREATE POLICY "supplier_brands_select" ON public.supplier_brands FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'suppliers.read'));
CREATE POLICY "supplier_brands_manage" ON public.supplier_brands FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'suppliers.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'suppliers.write'));

CREATE POLICY "supplier_price_history_select" ON public.supplier_price_history FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'suppliers.read'));
CREATE POLICY "supplier_price_history_manage" ON public.supplier_price_history FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'suppliers.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'suppliers.write'));

CREATE POLICY "supplier_docs_select" ON public.supplier_documents FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'suppliers.read'));
CREATE POLICY "supplier_docs_manage" ON public.supplier_documents FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'suppliers.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'suppliers.write'));

CREATE POLICY "sales_select" ON public.sales FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'sales.read'));
CREATE POLICY "sales_manage" ON public.sales FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'sales.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'sales.write'));

CREATE POLICY "sale_items_select" ON public.sale_items FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'sales.read'));
CREATE POLICY "sale_items_manage" ON public.sale_items FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'sales.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'sales.write'));

CREATE POLICY "sales_returns_select" ON public.sales_returns FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'sales.read'));
CREATE POLICY "sales_returns_manage" ON public.sales_returns FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'sales.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'sales.write'));

CREATE POLICY "fin_tx_select" ON public.financial_transactions FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'finance.read') OR public.has_org_permission(organization_id, 'sales.read'));
CREATE POLICY "fin_tx_insert" ON public.financial_transactions FOR INSERT TO authenticated
  WITH CHECK (public.has_org_permission(organization_id, 'finance.write') OR public.has_org_permission(organization_id, 'sales.write'));

CREATE POLICY "po_select" ON public.purchase_orders FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'purchases.read'));
CREATE POLICY "po_manage" ON public.purchase_orders FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'purchases.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'purchases.write'));

CREATE POLICY "po_items_select" ON public.purchase_order_items FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'purchases.read'));
CREATE POLICY "po_items_manage" ON public.purchase_order_items FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'purchases.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'purchases.write'));

CREATE POLICY "purchases_select" ON public.purchases FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'purchases.read'));
CREATE POLICY "purchases_manage" ON public.purchases FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'purchases.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'purchases.write'));

CREATE POLICY "purchase_items_select" ON public.purchase_items FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'purchases.read'));
CREATE POLICY "purchase_items_manage" ON public.purchase_items FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'purchases.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'purchases.write'));

CREATE POLICY "invoices_select" ON public.invoices FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'sales.read') OR public.has_org_permission(organization_id, 'purchases.read'));
CREATE POLICY "invoices_manage" ON public.invoices FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'sales.write') OR public.has_org_permission(organization_id, 'purchases.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'sales.write') OR public.has_org_permission(organization_id, 'purchases.write'));

CREATE POLICY "invoice_items_select" ON public.invoice_items FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'sales.read') OR public.has_org_permission(organization_id, 'purchases.read'));
CREATE POLICY "invoice_items_manage" ON public.invoice_items FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id, 'sales.write') OR public.has_org_permission(organization_id, 'purchases.write'))
  WITH CHECK (public.has_org_permission(organization_id, 'sales.write') OR public.has_org_permission(organization_id, 'purchases.write'));

-- 8. Operational Indexes
CREATE INDEX IF NOT EXISTS idx_inv_movements_org_time ON public.inventory_movements(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_org_date ON public.sales(organization_id, sale_date DESC, order_status);
CREATE INDEX IF NOT EXISTS idx_po_org_status ON public.purchase_orders(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_org_type ON public.invoices(organization_id, invoice_type, issue_date DESC);

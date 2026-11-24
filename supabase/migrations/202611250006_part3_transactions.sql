-- ============================================================================
-- AURORA BUSINESS OS — Migration 0006: Atomic Transaction RPCs (Part 03)
-- ============================================================================

-- 1. Atomic Inventory Stock In / Out / Adjustment / Transfer
CREATE OR REPLACE FUNCTION public.perform_inventory_movement_txn(
  p_organization_id UUID,
  p_product_id UUID,
  p_warehouse_id UUID,
  p_movement_type TEXT,
  p_quantity NUMERIC,
  p_batch_number TEXT DEFAULT 'DEFAULT',
  p_unit_cost NUMERIC DEFAULT 0,
  p_target_warehouse_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT '',
  p_override_negative BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_allow_negative BOOLEAN := FALSE;
  v_is_override_role BOOLEAN := FALSE;
  v_current_qty NUMERIC := 0;
  v_new_qty NUMERIC := 0;
  v_delta NUMERIC := 0;
  v_target_qty NUMERIC := 0;
  v_target_new NUMERIC := 0;
BEGIN
  IF v_user_id IS NULL OR NOT public.has_org_permission(p_organization_id, 'inventory.write') THEN
    RAISE EXCEPTION 'Permission denied: inventory.write required';
  END IF;

  IF p_quantity <= 0 AND p_movement_type <> 'adjustment' THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  SELECT allow_negative_stock INTO v_allow_negative
  FROM public.business_settings
  WHERE organization_id = p_organization_id;

  v_is_override_role := public.has_org_role(p_organization_id, ARRAY['owner', 'admin', 'manager']);

  INSERT INTO public.inventory (organization_id, product_id, warehouse_id, batch_number, quantity_on_hand, unit_landed_cost)
  VALUES (p_organization_id, p_product_id, p_warehouse_id, COALESCE(NULLIF(trim(p_batch_number), ''), 'DEFAULT'), 0, COALESCE(p_unit_cost, 0))
  ON CONFLICT (organization_id, product_id, warehouse_id, batch_number) DO NOTHING;

  SELECT quantity_on_hand INTO v_current_qty
  FROM public.inventory
  WHERE organization_id = p_organization_id
    AND product_id = p_product_id
    AND warehouse_id = p_warehouse_id
    AND batch_number = COALESCE(NULLIF(trim(p_batch_number), ''), 'DEFAULT')
  FOR UPDATE;

  IF p_movement_type = 'stock_in' THEN
    v_delta := p_quantity;
    v_new_qty := v_current_qty + v_delta;
  ELSIF p_movement_type IN ('stock_out', 'transfer_out') THEN
    v_delta := -p_quantity;
    v_new_qty := v_current_qty + v_delta;
  ELSIF p_movement_type = 'adjustment' THEN
    v_delta := p_quantity - v_current_qty;
    v_new_qty := p_quantity;
  ELSE
    RAISE EXCEPTION 'Unsupported movement_type: %', p_movement_type;
  END IF;

  IF v_new_qty < 0 AND NOT (v_allow_negative AND p_override_negative AND v_is_override_role) THEN
    RAISE EXCEPTION 'Insufficient stock (available: %, requested change: %)', v_current_qty, v_delta;
  END IF;

  UPDATE public.inventory
  SET quantity_on_hand = v_new_qty,
      unit_landed_cost = CASE WHEN p_unit_cost > 0 AND p_movement_type = 'stock_in' THEN p_unit_cost ELSE unit_landed_cost END
  WHERE organization_id = p_organization_id
    AND product_id = p_product_id
    AND warehouse_id = p_warehouse_id
    AND batch_number = COALESCE(NULLIF(trim(p_batch_number), ''), 'DEFAULT');

  INSERT INTO public.inventory_movements (
    organization_id, product_id, warehouse_id, batch_number, movement_type,
    quantity_delta, quantity_after, unit_cost, reference_type, override_authorized, notes, actor_user_id
  )
  VALUES (
    p_organization_id, p_product_id, p_warehouse_id, COALESCE(NULLIF(trim(p_batch_number), ''), 'DEFAULT'),
    p_movement_type, v_delta, v_new_qty, COALESCE(p_unit_cost, 0), 'manual',
    (v_new_qty < 0), COALESCE(p_notes, ''), v_user_id
  );

  -- Handle destination warehouse on transfer_out
  IF p_movement_type = 'transfer_out' THEN
    IF p_target_warehouse_id IS NULL OR p_target_warehouse_id = p_warehouse_id THEN
      RAISE EXCEPTION 'A distinct destination warehouse is required for stock transfer';
    END IF;

    INSERT INTO public.inventory (organization_id, product_id, warehouse_id, batch_number, quantity_on_hand, unit_landed_cost)
    VALUES (p_organization_id, p_product_id, p_target_warehouse_id, COALESCE(NULLIF(trim(p_batch_number), ''), 'DEFAULT'), 0, COALESCE(p_unit_cost, 0))
    ON CONFLICT (organization_id, product_id, warehouse_id, batch_number) DO NOTHING;

    SELECT quantity_on_hand INTO v_target_qty
    FROM public.inventory
    WHERE organization_id = p_organization_id
      AND product_id = p_product_id
      AND warehouse_id = p_target_warehouse_id
      AND batch_number = COALESCE(NULLIF(trim(p_batch_number), ''), 'DEFAULT')
    FOR UPDATE;

    v_target_new := v_target_qty + p_quantity;
    UPDATE public.inventory
    SET quantity_on_hand = v_target_new
    WHERE organization_id = p_organization_id
      AND product_id = p_product_id
      AND warehouse_id = p_target_warehouse_id
      AND batch_number = COALESCE(NULLIF(trim(p_batch_number), ''), 'DEFAULT');

    INSERT INTO public.inventory_movements (
      organization_id, product_id, warehouse_id, batch_number, movement_type,
      quantity_delta, quantity_after, unit_cost, reference_type, notes, actor_user_id
    )
    VALUES (
      p_organization_id, p_product_id, p_target_warehouse_id, COALESCE(NULLIF(trim(p_batch_number), ''), 'DEFAULT'),
      'transfer_in', p_quantity, v_target_new, COALESCE(p_unit_cost, 0), 'transfer', COALESCE(p_notes, ''), v_user_id
    );
  END IF;

  INSERT INTO public.activity_logs (organization_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  VALUES (
    p_organization_id, v_user_id, 'inventory.movement', 'product', p_product_id::text,
    jsonb_build_object('movement_type', p_movement_type, 'delta', v_delta, 'quantity_after', v_new_qty)
  );

  RETURN jsonb_build_object('quantity_after', v_new_qty, 'delta', v_delta);
END;
$$;

-- 2. Atomic Sale Completion (Sale + Items + Stock Deduction + Payment + Invoice + Customer Stats)
CREATE OR REPLACE FUNCTION public.complete_sale_txn(
  p_organization_id UUID,
  p_customer_id UUID DEFAULT NULL,
  p_sale_date DATE DEFAULT CURRENT_DATE,
  p_channel TEXT DEFAULT 'Showroom',
  p_payment_method TEXT DEFAULT 'Cash',
  p_payment_status TEXT DEFAULT 'paid',
  p_paid_amount NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT '',
  p_items JSONB DEFAULT '[]'::jsonb,
  p_override_negative BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_allow_negative BOOLEAN := FALSE;
  v_is_override_role BOOLEAN := FALSE;
  v_sale_id UUID;
  v_invoice_id UUID;
  v_invoice_no TEXT;
  v_item JSONB;
  v_prod RECORD;
  v_inv_qty NUMERIC;
  v_new_qty NUMERIC;
  v_qty NUMERIC;
  v_unit_price NUMERIC;
  v_disc NUMERIC;
  v_tax NUMERIC;
  v_line_total NUMERIC;
  v_subtotal NUMERIC := 0;
  v_discount_total NUMERIC := 0;
  v_tax_total NUMERIC := 0;
  v_grand_total NUMERIC := 0;
  v_cogs_total NUMERIC := 0;
  v_paid NUMERIC := 0;
  v_customer_name TEXT := 'Walk-in Customer';
BEGIN
  IF v_user_id IS NULL OR NOT public.has_org_permission(p_organization_id, 'sales.write') THEN
    RAISE EXCEPTION 'Permission denied: sales.write required';
  END IF;

  IF jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'At least one sale item is required';
  END IF;

  SELECT allow_negative_stock INTO v_allow_negative
  FROM public.business_settings WHERE organization_id = p_organization_id;
  v_is_override_role := public.has_org_role(p_organization_id, ARRAY['owner', 'admin', 'manager']);

  IF p_customer_id IS NOT NULL THEN
    SELECT full_name INTO v_customer_name
    FROM public.customers WHERE id = p_customer_id AND organization_id = p_organization_id;
    IF v_customer_name IS NULL THEN
      RAISE EXCEPTION 'Customer does not belong to this organization';
    END IF;
  END IF;

  v_invoice_no := 'INV-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  INSERT INTO public.sales (
    organization_id, customer_id, invoice_number, sale_date, channel,
    payment_method, payment_status, order_status, salesperson_id, notes
  )
  VALUES (
    p_organization_id, p_customer_id, v_invoice_no, COALESCE(p_sale_date, CURRENT_DATE),
    p_channel, p_payment_method, p_payment_status, 'completed', v_user_id, COALESCE(p_notes, '')
  )
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_disc := COALESCE((v_item->>'discount')::numeric, 0);
    v_tax := COALESCE((v_item->>'tax')::numeric, 0);

    SELECT id, name, sku, purchase_cost INTO v_prod
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid AND organization_id = p_organization_id;

    IF v_prod.id IS NULL THEN
      RAISE EXCEPTION 'Product not found in organization';
    END IF;

    INSERT INTO public.inventory (organization_id, product_id, warehouse_id, batch_number, quantity_on_hand, unit_landed_cost)
    VALUES (p_organization_id, v_prod.id, (v_item->>'warehouse_id')::uuid, 'DEFAULT', 0, v_prod.purchase_cost)
    ON CONFLICT (organization_id, product_id, warehouse_id, batch_number) DO NOTHING;

    SELECT quantity_on_hand INTO v_inv_qty
    FROM public.inventory
    WHERE organization_id = p_organization_id
      AND product_id = v_prod.id
      AND warehouse_id = (v_item->>'warehouse_id')::uuid
      AND batch_number = 'DEFAULT'
    FOR UPDATE;

    v_new_qty := v_inv_qty - v_qty;
    IF v_new_qty < 0 AND NOT (v_allow_negative AND p_override_negative AND v_is_override_role) THEN
      RAISE EXCEPTION 'Insufficient stock for % (available: %, requested: %)', v_prod.name, v_inv_qty, v_qty;
    END IF;

    UPDATE public.inventory
    SET quantity_on_hand = v_new_qty
    WHERE organization_id = p_organization_id
      AND product_id = v_prod.id
      AND warehouse_id = (v_item->>'warehouse_id')::uuid
      AND batch_number = 'DEFAULT';

    v_line_total := GREATEST(0, (v_qty * v_unit_price) - v_disc + v_tax);
    v_subtotal := v_subtotal + (v_qty * v_unit_price);
    v_discount_total := v_discount_total + v_disc;
    v_tax_total := v_tax_total + v_tax;
    v_grand_total := v_grand_total + v_line_total;
    v_cogs_total := v_cogs_total + (v_qty * v_prod.purchase_cost);

    INSERT INTO public.sale_items (
      organization_id, sale_id, product_id, warehouse_id, product_name_snapshot,
      sku_snapshot, quantity, unit_price, discount_amount, tax_amount, unit_cost_at_sale, line_total
    )
    VALUES (
      p_organization_id, v_sale_id, v_prod.id, (v_item->>'warehouse_id')::uuid,
      v_prod.name, v_prod.sku, v_qty, v_unit_price, v_disc, v_tax, v_prod.purchase_cost, v_line_total
    );

    INSERT INTO public.inventory_movements (
      organization_id, product_id, warehouse_id, batch_number, movement_type,
      quantity_delta, quantity_after, unit_cost, reference_type, reference_id, override_authorized, actor_user_id
    )
    VALUES (
      p_organization_id, v_prod.id, (v_item->>'warehouse_id')::uuid, 'DEFAULT', 'sale',
      -v_qty, v_new_qty, v_prod.purchase_cost, 'sale', v_sale_id::text, (v_new_qty < 0), v_user_id
    );
  END LOOP;

  v_paid := CASE
    WHEN p_payment_status = 'paid' THEN v_grand_total
    WHEN p_payment_status = 'unpaid' THEN 0
    ELSE LEAST(v_grand_total, GREATEST(0, COALESCE(p_paid_amount, 0)))
  END;

  UPDATE public.sales
  SET subtotal = v_subtotal,
      discount_total = v_discount_total,
      tax_total = v_tax_total,
      grand_total = v_grand_total,
      paid_amount = v_paid,
      cogs_total = v_cogs_total
  WHERE id = v_sale_id;

  IF v_paid > 0 THEN
    INSERT INTO public.financial_transactions (
      organization_id, direction, category, amount, tx_date, payment_method,
      reference_type, reference_id, description, actor_user_id
    )
    VALUES (
      p_organization_id, 'inflow', 'sales_receipt', v_paid, COALESCE(p_sale_date, CURRENT_DATE),
      p_payment_method, 'sale', v_sale_id::text, 'Payment for ' || v_invoice_no, v_user_id
    );
  END IF;

  INSERT INTO public.invoices (
    organization_id, invoice_type, invoice_number, sale_id, customer_id,
    counterparty_name, issue_date, payment_status, subtotal, discount_total,
    tax_total, total_amount, created_by
  )
  VALUES (
    p_organization_id, 'sales', v_invoice_no, v_sale_id, p_customer_id,
    v_customer_name, COALESCE(p_sale_date, CURRENT_DATE), p_payment_status,
    v_subtotal, v_discount_total, v_tax_total, v_grand_total, v_user_id
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items (
    organization_id, invoice_id, description, sku, quantity, unit_price, discount, tax, line_total
  )
  SELECT
    p_organization_id, v_invoice_id, product_name_snapshot, sku_snapshot,
    quantity, unit_price, discount_amount, tax_amount, line_total
  FROM public.sale_items WHERE sale_id = v_sale_id;

  IF p_customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET total_orders = total_orders + 1,
        total_purchase_value = total_purchase_value + v_grand_total,
        outstanding_balance = outstanding_balance + GREATEST(0, v_grand_total - v_paid),
        last_purchase_at = NOW(),
        segment = CASE
          WHEN total_orders + 1 >= 5 OR total_purchase_value + v_grand_total >= 50000 THEN 'vip'
          WHEN total_orders + 1 >= 2 THEN 'regular'
          ELSE segment
        END
    WHERE id = p_customer_id AND organization_id = p_organization_id;
  END IF;

  INSERT INTO public.activity_logs (organization_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  VALUES (
    p_organization_id, v_user_id, 'sale.completed', 'sale', v_sale_id::text,
    jsonb_build_object('invoice_number', v_invoice_no, 'grand_total', v_grand_total)
  );

  RETURN jsonb_build_object('sale_id', v_sale_id, 'invoice_id', v_invoice_id, 'invoice_number', v_invoice_no, 'grand_total', v_grand_total);
END;
$$;

-- 3. Atomic Sale Return or Cancellation
CREATE OR REPLACE FUNCTION public.cancel_or_return_sale_txn(
  p_organization_id UUID,
  p_sale_id UUID,
  p_mode TEXT,
  p_reason TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_sale RECORD;
  v_item RECORD;
  v_new_qty NUMERIC;
  v_ret_no TEXT;
  v_cn_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.has_org_permission(p_organization_id, 'sales.write') THEN
    RAISE EXCEPTION 'Permission denied: sales.write required';
  END IF;

  SELECT * INTO v_sale FROM public.sales
  WHERE id = p_sale_id AND organization_id = p_organization_id
  FOR UPDATE;

  IF v_sale.id IS NULL THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;

  IF v_sale.order_status IN ('cancelled', 'returned') THEN
    RAISE EXCEPTION 'Sale is already %', v_sale.order_status;
  END IF;

  FOR v_item IN SELECT * FROM public.sale_items WHERE sale_id = p_sale_id
  LOOP
    UPDATE public.inventory
    SET quantity_on_hand = quantity_on_hand + v_item.quantity
    WHERE organization_id = p_organization_id
      AND product_id = v_item.product_id
      AND warehouse_id = v_item.warehouse_id
      AND batch_number = 'DEFAULT'
    RETURNING quantity_on_hand INTO v_new_qty;

    INSERT INTO public.inventory_movements (
      organization_id, product_id, warehouse_id, batch_number, movement_type,
      quantity_delta, quantity_after, unit_cost, reference_type, reference_id, notes, actor_user_id
    )
    VALUES (
      p_organization_id, v_item.product_id, v_item.warehouse_id, 'DEFAULT', 'sale_return',
      v_item.quantity, COALESCE(v_new_qty, v_item.quantity), v_item.unit_cost_at_sale,
      p_mode, p_sale_id::text, COALESCE(p_reason, ''), v_user_id
    );
  END LOOP;

  UPDATE public.sales
  SET order_status = CASE WHEN p_mode = 'cancel' THEN 'cancelled' ELSE 'returned' END,
      payment_status = CASE WHEN v_sale.paid_amount > 0 THEN 'refunded' ELSE payment_status END
  WHERE id = p_sale_id;

  IF p_mode = 'return' THEN
    v_ret_no := 'RET-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    INSERT INTO public.sales_returns (
      organization_id, sale_id, return_number, reason, refund_amount, actor_user_id
    )
    VALUES (p_organization_id, p_sale_id, v_ret_no, COALESCE(p_reason, ''), v_sale.paid_amount, v_user_id);

    INSERT INTO public.invoices (
      organization_id, invoice_type, invoice_number, sale_id, customer_id,
      counterparty_name, payment_status, subtotal, discount_total, tax_total, total_amount, notes, created_by
    )
    VALUES (
      p_organization_id, 'credit_note', 'CN-' || v_sale.invoice_number, p_sale_id, v_sale.customer_id,
      'Refund Credit Note', 'refunded', v_sale.subtotal, v_sale.discount_total, v_sale.tax_total, v_sale.grand_total,
      COALESCE(p_reason, ''), v_user_id
    )
    RETURNING id INTO v_cn_id;
  END IF;

  IF v_sale.paid_amount > 0 THEN
    INSERT INTO public.financial_transactions (
      organization_id, direction, category, amount, payment_method, reference_type, reference_id, description, actor_user_id
    )
    VALUES (
      p_organization_id, 'outflow', 'sales_refund', v_sale.paid_amount, v_sale.payment_method,
      p_mode, p_sale_id::text, 'Refund for ' || v_sale.invoice_number, v_user_id
    );
  END IF;

  IF v_sale.customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET total_orders = GREATEST(0, total_orders - 1),
        total_purchase_value = GREATEST(0, total_purchase_value - v_sale.grand_total),
        outstanding_balance = GREATEST(0, outstanding_balance - GREATEST(0, v_sale.grand_total - v_sale.paid_amount))
    WHERE id = v_sale.customer_id AND organization_id = p_organization_id;
  END IF;

  RETURN jsonb_build_object('sale_id', p_sale_id, 'status', CASE WHEN p_mode = 'cancel' THEN 'cancelled' ELSE 'returned' END);
END;
$$;

-- 4. Authorized Purchase Order Approval & Status Transition
CREATE OR REPLACE FUNCTION public.approve_purchase_order_txn(
  p_organization_id UUID,
  p_po_id UUID,
  p_next_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_po RECORD;
BEGIN
  IF v_user_id IS NULL OR NOT public.has_org_permission(p_organization_id, 'purchases.write') THEN
    RAISE EXCEPTION 'Permission denied: purchases.write required';
  END IF;

  SELECT * INTO v_po FROM public.purchase_orders
  WHERE id = p_po_id AND organization_id = p_organization_id
  FOR UPDATE;

  IF v_po.id IS NULL THEN
    RAISE EXCEPTION 'Purchase order not found';
  END IF;

  IF p_next_status = 'approved' AND NOT public.has_org_role(p_organization_id, ARRAY['owner', 'admin', 'manager']) THEN
    RAISE EXCEPTION 'Only Owner, Administrator, or Manager can approve purchase orders';
  END IF;

  IF p_next_status = 'ordered' AND v_po.status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved purchase orders can be marked as ordered';
  END IF;

  UPDATE public.purchase_orders
  SET status = p_next_status,
      approved_by = CASE WHEN p_next_status = 'approved' THEN v_user_id ELSE approved_by END,
      approved_at = CASE WHEN p_next_status = 'approved' THEN NOW() ELSE approved_at END
  WHERE id = p_po_id;

  INSERT INTO public.activity_logs (organization_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  VALUES (
    p_organization_id, v_user_id, 'purchase_order.status_changed', 'purchase_order', p_po_id::text,
    jsonb_build_object('po_number', v_po.po_number, 'status', p_next_status)
  );

  RETURN jsonb_build_object('po_id', p_po_id, 'status', p_next_status);
END;
$$;

-- 5. Atomic Purchase Order Partial/Full Receiving
CREATE OR REPLACE FUNCTION public.receive_purchase_order_txn(
  p_organization_id UUID,
  p_po_id UUID,
  p_warehouse_id UUID,
  p_items JSONB,
  p_additional_costs NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_po RECORD;
  v_purchase_id UUID;
  v_purchase_no TEXT;
  v_item JSONB;
  v_po_item RECORD;
  v_qty_recv NUMERIC;
  v_batch TEXT;
  v_new_qty NUMERIC;
  v_total_recv_value NUMERIC := 0;
  v_remaining_count INTEGER := 0;
BEGIN
  IF v_user_id IS NULL OR NOT public.has_org_permission(p_organization_id, 'purchases.write') THEN
    RAISE EXCEPTION 'Permission denied: purchases.write required';
  END IF;

  SELECT * INTO v_po FROM public.purchase_orders
  WHERE id = p_po_id AND organization_id = p_organization_id
  FOR UPDATE;

  IF v_po.id IS NULL THEN
    RAISE EXCEPTION 'Purchase order not found';
  END IF;

  IF v_po.status NOT IN ('approved', 'ordered', 'partially_received') THEN
    RAISE EXCEPTION 'PO must be approved or ordered before receiving (current: %)', v_po.status;
  END IF;

  v_purchase_no := 'PUR-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  INSERT INTO public.purchases (
    organization_id, po_id, supplier_id, warehouse_id, purchase_number,
    currency, additional_costs, notes, received_by
  )
  VALUES (
    p_organization_id, p_po_id, v_po.supplier_id, p_warehouse_id, v_purchase_no,
    v_po.currency, COALESCE(p_additional_costs, 0), COALESCE(p_notes, ''), v_user_id
  )
  RETURNING id INTO v_purchase_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty_recv := (v_item->>'quantity')::numeric;
    v_batch := COALESCE(NULLIF(trim(v_item->>'batch_number'), ''), 'DEFAULT');
    IF v_qty_recv <= 0 THEN CONTINUE; END IF;

    SELECT * INTO v_po_item FROM public.purchase_order_items
    WHERE id = (v_item->>'po_item_id')::uuid AND po_id = p_po_id
    FOR UPDATE;

    IF v_po_item.id IS NULL THEN
      RAISE EXCEPTION 'PO item not found';
    END IF;

    IF v_po_item.quantity_received + v_qty_recv > v_po_item.quantity_ordered THEN
      RAISE EXCEPTION 'Cannot receive more than ordered quantity for %', v_po_item.product_name_snapshot;
    END IF;

    UPDATE public.purchase_order_items
    SET quantity_received = quantity_received + v_qty_recv
    WHERE id = v_po_item.id;

    INSERT INTO public.purchase_items (
      organization_id, purchase_id, product_id, batch_number, quantity, unit_cost, allocated_landed_cost
    )
    VALUES (
      p_organization_id, v_purchase_id, v_po_item.product_id, v_batch, v_qty_recv,
      v_po_item.unit_price, v_po_item.unit_price * COALESCE(v_po.exchange_rate, 1)
    );

    INSERT INTO public.inventory (organization_id, product_id, warehouse_id, batch_number, quantity_on_hand, unit_landed_cost)
    VALUES (p_organization_id, v_po_item.product_id, p_warehouse_id, v_batch, 0, v_po_item.unit_price * COALESCE(v_po.exchange_rate, 1))
    ON CONFLICT (organization_id, product_id, warehouse_id, batch_number) DO NOTHING;

    UPDATE public.inventory
    SET quantity_on_hand = quantity_on_hand + v_qty_recv,
        unit_landed_cost = v_po_item.unit_price * COALESCE(v_po.exchange_rate, 1)
    WHERE organization_id = p_organization_id
      AND product_id = v_po_item.product_id
      AND warehouse_id = p_warehouse_id
      AND batch_number = v_batch
    RETURNING quantity_on_hand INTO v_new_qty;

    INSERT INTO public.inventory_movements (
      organization_id, product_id, warehouse_id, batch_number, movement_type,
      quantity_delta, quantity_after, unit_cost, reference_type, reference_id, actor_user_id
    )
    VALUES (
      p_organization_id, v_po_item.product_id, p_warehouse_id, v_batch, 'purchase_receive',
      v_qty_recv, v_new_qty, v_po_item.unit_price * COALESCE(v_po.exchange_rate, 1),
      'purchase', v_purchase_id::text, v_user_id
    );

    v_total_recv_value := v_total_recv_value + (v_qty_recv * v_po_item.unit_price);
  END LOOP;

  UPDATE public.purchases
  SET total_cost = v_total_recv_value + COALESCE(p_additional_costs, 0)
  WHERE id = v_purchase_id;

  SELECT COUNT(*) INTO v_remaining_count
  FROM public.purchase_order_items
  WHERE po_id = p_po_id AND quantity_received < quantity_ordered;

  UPDATE public.purchase_orders
  SET status = CASE WHEN v_remaining_count = 0 THEN 'received' ELSE 'partially_received' END
  WHERE id = p_po_id;

  INSERT INTO public.activity_logs (organization_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  VALUES (
    p_organization_id, v_user_id, 'purchase.received', 'purchase', v_purchase_id::text,
    jsonb_build_object('po_id', p_po_id, 'purchase_number', v_purchase_no, 'po_status', CASE WHEN v_remaining_count = 0 THEN 'received' ELSE 'partially_received' END)
  );

  RETURN jsonb_build_object(
    'purchase_id', v_purchase_id,
    'purchase_number', v_purchase_no,
    'po_status', CASE WHEN v_remaining_count = 0 THEN 'received' ELSE 'partially_received' END
  );
END;
$$;

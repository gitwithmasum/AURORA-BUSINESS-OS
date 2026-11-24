import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalyticsDataset } from "./engine";

export async function loadOrganizationAnalyticsDataset(
  supabase: SupabaseClient,
  organizationId: string
): Promise<AnalyticsDataset> {
  const [
    productsRes,
    brandsRes,
    categoriesRes,
    attrsRes,
    attrValsRes,
    inventoryRes,
    salesRes,
    saleItemsRes,
    expensesRes,
    purchasesRes,
    suppliersRes,
    customersRes,
    txRes,
    marketingRes,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id, sku, name, category_id, brand_id, default_supplier_id, purchase_cost, selling_price, min_stock")
      .eq("organization_id", organizationId),
    supabase
      .from("brands")
      .select("id, name")
      .eq("organization_id", organizationId),
    supabase
      .from("business_categories")
      .select("id, slug, name")
      .eq("organization_id", organizationId),
    supabase
      .from("custom_product_attributes")
      .select("id, key")
      .eq("organization_id", organizationId),
    supabase
      .from("product_attribute_values")
      .select("product_id, attribute_id, value_text, value_number")
      .eq("organization_id", organizationId),
    supabase
      .from("inventory")
      .select("product_id, batch_number, expiry_date, quantity_on_hand, unit_landed_cost")
      .eq("organization_id", organizationId),
    supabase
      .from("sales")
      .select("id, customer_id, sale_date, channel, grand_total, cogs_total, order_status")
      .eq("organization_id", organizationId),
    supabase
      .from("sale_items")
      .select("sale_id, product_id, product_name_snapshot, sku_snapshot, quantity, unit_cost_at_sale, line_total")
      .eq("organization_id", organizationId),
    supabase
      .from("expenses")
      .select("category, expense_date, amount_base, approval_status")
      .eq("organization_id", organizationId),
    supabase
      .from("purchases")
      .select("supplier_id, received_date, total_cost")
      .eq("organization_id", organizationId),
    supabase
      .from("suppliers")
      .select("id, name, lead_time_days, rating, verification_status")
      .eq("organization_id", organizationId),
    supabase
      .from("customers")
      .select("id, full_name, total_orders, total_purchase_value, created_at")
      .eq("organization_id", organizationId),
    supabase
      .from("financial_transactions")
      .select("direction, tx_date, amount")
      .eq("organization_id", organizationId),
    supabase
      .from("marketing_metrics")
      .select("metric_date, actual_spend, revenue, orders, product_costs, other_variable_costs")
      .eq("organization_id", organizationId),
  ]);

  return {
    products: productsRes.data ?? [],
    brands: brandsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    attributes: attrsRes.data ?? [],
    attrValues: attrValsRes.data ?? [],
    inventory: inventoryRes.data ?? [],
    sales: salesRes.data ?? [],
    saleItems: saleItemsRes.data ?? [],
    expenses: expensesRes.data ?? [],
    purchases: purchasesRes.data ?? [],
    suppliers: suppliersRes.data ?? [],
    customers: customersRes.data ?? [],
    transactions: txRes.data ?? [],
    marketingMetrics: marketingRes.data ?? [],
  };
}

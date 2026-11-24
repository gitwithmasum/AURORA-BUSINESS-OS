import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  const q = searchParams.get("q")?.trim() || "";
  const scope = searchParams.get("scope") || "all";

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const auth = await requireOrgPermission(organizationId, "dashboard.read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const pattern = `%${q}%`;
  const results: {
    type: string;
    id: string;
    title: string;
    subtitle: string;
    href: string;
  }[] = [];

  const tasks: Promise<void>[] = [];

  if (scope === "all" || scope === "products") {
    tasks.push(
      (async () => {
        const { data } = await auth.supabase
          .from("products")
          .select("id, sku, name, selling_price")
          .eq("organization_id", organizationId)
          .or(`name.ilike.${pattern},sku.ilike.${pattern}`)
          .limit(6);
        for (const r of data ?? []) {
          results.push({
            type: "Product",
            id: r.id,
            title: r.name,
            subtitle: `SKU ${r.sku}`,
            href: "/products",
          });
        }
      })()
    );
  }

  if (scope === "all" || scope === "customers") {
    tasks.push(
      (async () => {
        const { data } = await auth.supabase
          .from("customers")
          .select("id, customer_code, full_name, phone")
          .eq("organization_id", organizationId)
          .or(`full_name.ilike.${pattern},phone.ilike.${pattern},customer_code.ilike.${pattern}`)
          .limit(6);
        for (const r of data ?? []) {
          results.push({
            type: "Customer",
            id: r.id,
            title: r.full_name,
            subtitle: `${r.customer_code} · ${r.phone || "No phone"}`,
            href: "/customers",
          });
        }
      })()
    );
  }

  if (scope === "all" || scope === "suppliers") {
    tasks.push(
      (async () => {
        const { data } = await auth.supabase
          .from("suppliers")
          .select("id, supplier_code, name, country")
          .eq("organization_id", organizationId)
          .or(`name.ilike.${pattern},supplier_code.ilike.${pattern},country.ilike.${pattern}`)
          .limit(6);
        for (const r of data ?? []) {
          results.push({
            type: "Supplier",
            id: r.id,
            title: r.name,
            subtitle: `${r.supplier_code} · ${r.country}`,
            href: "/suppliers",
          });
        }
      })()
    );
  }

  if (scope === "all" || scope === "orders") {
    tasks.push(
      (async () => {
        const { data } = await auth.supabase
          .from("sales")
          .select("id, invoice_number, sale_date, order_status")
          .eq("organization_id", organizationId)
          .ilike("invoice_number", pattern)
          .limit(6);
        for (const r of data ?? []) {
          results.push({
            type: "Sales Order",
            id: r.id,
            title: r.invoice_number,
            subtitle: `${r.sale_date} · ${r.order_status}`,
            href: "/sales",
          });
        }
      })()
    );
  }

  if (scope === "all" || scope === "invoices") {
    tasks.push(
      (async () => {
        const { data } = await auth.supabase
          .from("invoices")
          .select("id, invoice_number, counterparty_name, invoice_type")
          .eq("organization_id", organizationId)
          .or(`invoice_number.ilike.${pattern},counterparty_name.ilike.${pattern}`)
          .limit(6);
        for (const r of data ?? []) {
          results.push({
            type: "Invoice",
            id: r.id,
            title: r.invoice_number,
            subtitle: `${r.invoice_type} · ${r.counterparty_name}`,
            href: "/orders",
          });
        }
      })()
    );
  }

  if (scope === "all" || scope === "purchase_orders") {
    tasks.push(
      (async () => {
        const { data } = await auth.supabase
          .from("purchase_orders")
          .select("id, po_number, status, purchase_date")
          .eq("organization_id", organizationId)
          .ilike("po_number", pattern)
          .limit(6);
        for (const r of data ?? []) {
          results.push({
            type: "Purchase Order",
            id: r.id,
            title: r.po_number,
            subtitle: `${r.purchase_date} · ${r.status}`,
            href: "/purchases",
          });
        }
      })()
    );
  }

  if (scope === "all" || scope === "transactions") {
    tasks.push(
      (async () => {
        const { data } = await auth.supabase
          .from("financial_transactions")
          .select("id, category, description, tx_date, amount")
          .eq("organization_id", organizationId)
          .or(`description.ilike.${pattern},category.ilike.${pattern}`)
          .limit(6);
        for (const r of data ?? []) {
          results.push({
            type: "Transaction",
            id: r.id,
            title: r.description || r.category,
            subtitle: `${r.tx_date} · ${r.amount}`,
            href: "/finance",
          });
        }
      })()
    );
  }

  await Promise.all(tasks);
  return NextResponse.json({ results });
}

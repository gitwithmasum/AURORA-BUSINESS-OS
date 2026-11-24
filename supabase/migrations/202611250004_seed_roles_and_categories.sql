-- ============================================================================
-- AURORA BUSINESS OS — Migration 0004: Seed RBAC Matrix & Attribute Templates
-- ============================================================================

INSERT INTO public.roles (key, name, description, hierarchy_rank)
VALUES
  ('owner', 'Owner', 'Full organizational ownership, security, billing, and override authority', 1),
  ('admin', 'Administrator', 'Configurable operational, member, and settings administration', 2),
  ('manager', 'Manager', 'Cross-module approvals for purchases, inventory, and sales', 3),
  ('accountant', 'Accountant', 'Financial reporting, expenses, tax assumptions, and cash flow', 4),
  ('inventory_manager', 'Inventory Manager', 'Products, categories, warehouses, and stock movements', 5),
  ('salesperson', 'Salesperson', 'Daily sales register, orders, invoices, and customer CRM', 6),
  ('viewer', 'Viewer', 'Read-only executive dashboard and report visibility', 7)
ON CONFLICT (key) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      hierarchy_rank = EXCLUDED.hierarchy_rank;

INSERT INTO public.permissions (key, resource, action, description)
VALUES
  ('dashboard.read', 'dashboard', 'read', 'View executive dashboard and KPIs'),
  ('products.read', 'products', 'read', 'View products and categories'),
  ('products.write', 'products', 'write', 'Create and edit products and brands'),
  ('categories.manage', 'categories', 'manage', 'Configure business categories and custom product attributes'),
  ('inventory.read', 'inventory', 'read', 'View stock levels and warehouses'),
  ('inventory.write', 'inventory', 'write', 'Adjust stock and manage warehouses'),
  ('sales.read', 'sales', 'read', 'View sales and invoices'),
  ('sales.write', 'sales', 'write', 'Create sales and issue invoices'),
  ('customers.read', 'customers', 'read', 'View customer CRM records'),
  ('customers.write', 'customers', 'write', 'Create and update customer profiles'),
  ('suppliers.read', 'suppliers', 'read', 'View supplier database'),
  ('suppliers.write', 'suppliers', 'write', 'Create and update suppliers and documents'),
  ('purchases.read', 'purchases', 'read', 'View purchase orders and import shipments'),
  ('purchases.write', 'purchases', 'write', 'Create and manage purchase orders and import files'),
  ('finance.read', 'finance', 'read', 'View financial accounts, P&L, and cash flow'),
  ('finance.write', 'finance', 'write', 'Manage financial accounts and expense entries'),
  ('settings.manage', 'settings', 'manage', 'Modify organization profile and business settings'),
  ('members.manage', 'members', 'manage', 'Invite members and update RBAC roles'),
  ('audit.read', 'audit', 'read', 'View immutable activity and security audit logs')
ON CONFLICT (key) DO UPDATE
  SET description = EXCLUDED.description;

-- Map permissions to each non-owner role (owner inherently passes all checks)
WITH role_perm_pairs(role_key, perm_key) AS (
  VALUES
    -- Admin
    ('admin', 'dashboard.read'), ('admin', 'products.read'), ('admin', 'products.write'),
    ('admin', 'categories.manage'), ('admin', 'inventory.read'), ('admin', 'inventory.write'),
    ('admin', 'sales.read'), ('admin', 'sales.write'), ('admin', 'customers.read'),
    ('admin', 'customers.write'), ('admin', 'suppliers.read'), ('admin', 'suppliers.write'),
    ('admin', 'purchases.read'), ('admin', 'purchases.write'), ('admin', 'finance.read'),
    ('admin', 'finance.write'), ('admin', 'settings.manage'), ('admin', 'members.manage'),
    ('admin', 'audit.read'),
    -- Manager
    ('manager', 'dashboard.read'), ('manager', 'products.read'), ('manager', 'products.write'),
    ('manager', 'categories.manage'), ('manager', 'inventory.read'), ('manager', 'inventory.write'),
    ('manager', 'sales.read'), ('manager', 'sales.write'), ('manager', 'customers.read'),
    ('manager', 'customers.write'), ('manager', 'suppliers.read'), ('manager', 'suppliers.write'),
    ('manager', 'purchases.read'), ('manager', 'purchases.write'), ('manager', 'finance.read'),
    ('manager', 'audit.read'),
    -- Accountant
    ('accountant', 'dashboard.read'), ('accountant', 'sales.read'), ('accountant', 'purchases.read'),
    ('accountant', 'suppliers.read'), ('accountant', 'finance.read'), ('accountant', 'finance.write'),
    ('accountant', 'audit.read'),
    -- Inventory Manager
    ('inventory_manager', 'dashboard.read'), ('inventory_manager', 'products.read'),
    ('inventory_manager', 'products.write'), ('inventory_manager', 'categories.manage'),
    ('inventory_manager', 'inventory.read'), ('inventory_manager', 'inventory.write'),
    ('inventory_manager', 'suppliers.read'), ('inventory_manager', 'purchases.read'),
    ('inventory_manager', 'purchases.write'),
    -- Salesperson
    ('salesperson', 'dashboard.read'), ('salesperson', 'products.read'),
    ('salesperson', 'inventory.read'), ('salesperson', 'sales.read'),
    ('salesperson', 'sales.write'), ('salesperson', 'customers.read'),
    ('salesperson', 'customers.write'),
    -- Viewer
    ('viewer', 'dashboard.read'), ('viewer', 'products.read'),
    ('viewer', 'inventory.read'), ('viewer', 'sales.read')
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role_perm_pairs rp
JOIN public.roles r ON r.key = rp.role_key
JOIN public.permissions p ON p.key = rp.perm_key
ON CONFLICT DO NOTHING;

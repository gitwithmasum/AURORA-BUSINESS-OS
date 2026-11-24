export type RoleKey =
  | "owner"
  | "admin"
  | "manager"
  | "accountant"
  | "inventory_manager"
  | "salesperson"
  | "viewer";

export type PermissionKey =
  | "dashboard.read"
  | "products.read"
  | "products.write"
  | "categories.manage"
  | "inventory.read"
  | "inventory.write"
  | "sales.read"
  | "sales.write"
  | "customers.read"
  | "customers.write"
  | "suppliers.read"
  | "suppliers.write"
  | "purchases.read"
  | "purchases.write"
  | "finance.read"
  | "finance.write"
  | "settings.manage"
  | "members.manage"
  | "audit.read";

export const ROLE_LABELS: Record<RoleKey, string> = {
  owner: "Owner",
  admin: "Administrator",
  manager: "Manager",
  accountant: "Accountant",
  inventory_manager: "Inventory Manager",
  salesperson: "Salesperson",
  viewer: "Viewer",
};

const ALL_PERMISSIONS: PermissionKey[] = [
  "dashboard.read",
  "products.read",
  "products.write",
  "categories.manage",
  "inventory.read",
  "inventory.write",
  "sales.read",
  "sales.write",
  "customers.read",
  "customers.write",
  "suppliers.read",
  "suppliers.write",
  "purchases.read",
  "purchases.write",
  "finance.read",
  "finance.write",
  "settings.manage",
  "members.manage",
  "audit.read",
];

export const ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  manager: [
    "dashboard.read",
    "products.read",
    "products.write",
    "categories.manage",
    "inventory.read",
    "inventory.write",
    "sales.read",
    "sales.write",
    "customers.read",
    "customers.write",
    "suppliers.read",
    "suppliers.write",
    "purchases.read",
    "purchases.write",
    "finance.read",
    "audit.read",
  ],
  accountant: [
    "dashboard.read",
    "sales.read",
    "purchases.read",
    "suppliers.read",
    "finance.read",
    "finance.write",
    "audit.read",
  ],
  inventory_manager: [
    "dashboard.read",
    "products.read",
    "products.write",
    "categories.manage",
    "inventory.read",
    "inventory.write",
    "suppliers.read",
    "purchases.read",
    "purchases.write",
  ],
  salesperson: [
    "dashboard.read",
    "products.read",
    "inventory.read",
    "sales.read",
    "sales.write",
    "customers.read",
    "customers.write",
  ],
  viewer: ["dashboard.read", "products.read", "inventory.read", "sales.read"],
};

export const ROUTE_REQUIRED_PERMISSION: Record<string, PermissionKey> = {
  "/": "dashboard.read",
  "/analytics": "dashboard.read",
  "/inventory": "inventory.read",
  "/products": "products.read",
  "/categories-brands": "categories.manage",
  "/sales": "sales.read",
  "/orders": "sales.read",
  "/customers": "customers.read",
  "/suppliers": "suppliers.read",
  "/purchases": "purchases.read",
  "/import-management": "purchases.read",
  "/shipping-logistics": "purchases.read",
  "/finance": "finance.read",
  "/expenses": "finance.read",
  "/marketing-ads": "dashboard.read",
  "/reports": "dashboard.read",
  "/ai-assistant": "dashboard.read",
  "/settings": "settings.manage",
};

export function hasPermission(
  role: RoleKey,
  permission: PermissionKey,
  customPermissions: string[] = []
): boolean {
  if (role === "owner") return true;
  if (customPermissions.includes(permission)) return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccessRoute(
  role: RoleKey,
  pathname: string,
  customPermissions: string[] = []
): boolean {
  const required = ROUTE_REQUIRED_PERMISSION[pathname];
  if (!required) return true;
  return hasPermission(role, required, customPermissions);
}

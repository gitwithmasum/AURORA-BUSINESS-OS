import type { NavGroup, NavItem } from "@/types/navigation";

export const NAVIGATION_GROUPS: NavGroup[] = [
  {
    id: "command",
    label: "Command Center",
    labelBn: "কমান্ড সেন্টার",
    items: [
      {
        id: "overview",
        label: "Overview",
        labelBn: "ওভারভিউ",
        href: "/",
        iconName: "LayoutDashboard",
        phase: "Active (Demo)",
        description:
          "Modular executive KPIs, revenue & profit trends, stock alerts, and recent demo transactions.",
      },
      {
        id: "analytics",
        label: "Analytics",
        labelBn: "অ্যানালিটিক্স",
        href: "/analytics",
        iconName: "LineChart",
        phase: "Active",
        description:
          "Advanced Analytics, Monthly Business Dashboard, Stock Alerts & Best-Selling Perfume Intelligence.",
      },
    ],
  },
  {
    id: "catalog",
    label: "Catalog & Stock",
    labelBn: "পণ্য ও ইনভেন্টরি",
    items: [
      {
        id: "inventory",
        label: "Inventory",
        labelBn: "ইনভেন্টরি",
        href: "/inventory",
        iconName: "Boxes",
        phase: "Active",
        description:
          "Multi-warehouse stock ledger, batch tracking, movements, and non-negative inventory guard.",
      },
      {
        id: "products",
        label: "Products",
        labelBn: "পণ্য তালিকা",
        href: "/products",
        iconName: "Sparkles",
        phase: "Active",
        description:
          "Universal product catalog powered by the Dynamic Category & Perfume Attribute Engine.",
      },
      {
        id: "categories-brands",
        label: "Categories & Brands",
        labelBn: "ক্যাটাগরি ও ব্র্যান্ড",
        href: "/categories-brands",
        iconName: "Tags",
        phase: "Active",
        description:
          "Configure business categories, custom attributes, fragrance families, and brand registry.",
      },
    ],
  },
  {
    id: "commerce",
    label: "Sales & CRM",
    labelBn: "বিক্রয় ও কাস্টমার",
    items: [
      {
        id: "sales",
        label: "Sales",
        labelBn: "বিক্রয়",
        href: "/sales",
        iconName: "BadgeDollarSign",
        phase: "Active",
        description:
          "Daily Sales Register, multi-item invoicing, returns, and real-time channel performance.",
      },
      {
        id: "orders",
        label: "Orders",
        labelBn: "অর্ডার",
        href: "/orders",
        iconName: "ShoppingBag",
        phase: "Active",
        description:
          "Omnichannel order lifecycle and branded Sales, Purchase, Proforma & Credit Note Invoice Generator.",
      },
      {
        id: "customers",
        label: "Customers",
        labelBn: "কাস্টমার",
        href: "/customers",
        iconName: "Users",
        phase: "Active",
        description:
          "Customer CRM profiles, VIP/Wholesale segmentation, CLV, and follow-up reminders.",
      },
    ],
  },
  {
    id: "supply",
    label: "Supply & KSA→BD",
    labelBn: "সাপ্লাই ও ইমপোর্ট",
    items: [
      {
        id: "suppliers",
        label: "Suppliers",
        labelBn: "সাপ্লায়ার",
        href: "/suppliers",
        iconName: "Building2",
        phase: "Active",
        description:
          "Scalable 100+ supplier directory, brand mapping, verification checklist, and price history.",
      },
      {
        id: "purchases",
        label: "Purchases",
        labelBn: "ক্রয় ও PO",
        href: "/purchases",
        iconName: "ClipboardCheck",
        phase: "Active",
        description:
          "Purchase Order approval workflow, partial/full receiving, and landed cost allocation.",
      },
      {
        id: "import-management",
        label: "Import Management",
        labelBn: "ইমপোর্ট কস্ট",
        href: "/import-management",
        iconName: "PlaneLanding",
        phase: "Active",
        description:
          "Saudi Arabia → Bangladesh landed cost calculator & configurable Bangladesh Customs/VAT estimator.",
      },
      {
        id: "shipping-logistics",
        label: "Shipping & Logistics",
        labelBn: "শিপিং ও লজিস্টিকস",
        href: "/shipping-logistics",
        iconName: "Ship",
        phase: "Active",
        description:
          "Air, Sea & Courier freight calculator with volumetric weight and Dangerous Goods review flags.",
      },
    ],
  },
  {
    id: "finance",
    label: "Finance & Growth",
    labelBn: "অর্থ ও মার্কেটিং",
    items: [
      {
        id: "finance",
        label: "Finance",
        labelBn: "ফাইন্যান্স",
        href: "/finance",
        iconName: "Landmark",
        phase: "Active",
        description:
          "Profit & Loss Statement, Cash Flow across Cash/Bank/MFS, and Break-even Simulator.",
      },
      {
        id: "expenses",
        label: "Expenses",
        labelBn: "খরচ",
        href: "/expenses",
        iconName: "Receipt",
        phase: "Active",
        description:
          "Operating, marketing, freight, customs, and administrative expense ledger with approvals.",
      },
      {
        id: "marketing-ads",
        label: "Marketing & Ads",
        labelBn: "মার্কেটিং ও বিজ্ঞাপন",
        href: "/marketing-ads",
        iconName: "Megaphone",
        phase: "Active",
        description:
          "Facebook Ads ROI Tracker measuring CTR, CPC, CAC, ROAS, and post-ad contribution.",
      },
      {
        id: "reports",
        label: "Reports",
        labelBn: "রিপোর্ট",
        href: "/reports",
        iconName: "FileSpreadsheet",
        phase: "Active",
        description:
          "12 enterprise financial, tax, inventory, and supplier reports with PDF/CSV/Excel exports.",
      },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence & OS",
    labelBn: "এআই ও সেটিংস",
    items: [
      {
        id: "ai-assistant",
        label: "AI Business Assistant",
        labelBn: "এআই অ্যাসিস্ট্যান্ট",
        href: "/ai-assistant",
        iconName: "Bot",
        phase: "Active",
        description:
          "Data-grounded business intelligence separating actual records, forecasts, and human-approved proposals.",
      },
      {
        id: "settings",
        label: "Settings",
        labelBn: "সেটিংস",
        href: "/settings",
        iconName: "Settings",
        phase: "Active",
        description:
          "Theme system, organization setup, RBAC roles, audit logs, and backup & restore.",
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAVIGATION_GROUPS.flatMap(
  (group) => group.items
);

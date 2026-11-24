# AURORA BUSINESS OS — Technical Architecture & Folder Structure

> **Phase 1 Deliverable** — Universal Business Management & Intelligent ERP Platform  
> **Repository**: `gitwithmasum/AURORA-BUSINESS-OS`

---

## 1. System Overview & Architectural Philosophy

AURORA BUSINESS OS is designed as a **multi-tenant, modular, event-traceable SaaS ERP platform** built on a unified Next.js App Router + Supabase/PostgreSQL architecture. Rather than hardcoding separate applications per industry, it implements a **Universal Business Configuration & Dynamic Attribute Engine** capable of serving Perfume & Fragrance import/retail out-of-the-box while scaling seamlessly to Fashion, Electronics, Cosmetics, Wholesale, and General Retail.

### Core Architectural Principles

1. **Strict Organization & Workspace Isolation**: Every business record carries `organization_id` (and `workspace_id` where multi-branch applies), enforced at the database layer via PostgreSQL Row Level Security (RLS) and validated in server-side API/Action handlers.
2. **Atomic Financial & Inventory Integrity**: Multi-table operations (sales completion, purchase receiving, returns, stock transfers) execute inside PostgreSQL database transactions / RPC functions so stock quantities, movements, invoices, and ledger entries never drift out of sync.
3. **Accounting & Regulatory Accuracy**:
   - Earned revenue is strictly separated from cash receipts (`sales` vs `financial_transactions`).
   - Inventory purchases are capitalized into stock assets and recognized as COGS only upon sale.
   - Bangladesh Customs & VAT calculations and KSA→BD Import Landed Cost calculations use a **configurable, dated tax engine** — never hardcoded statutory rates.
   - Marketing ROAS is tracked separately from net profit contribution.
4. **Centralized Design Tokens**: All UI surfaces consume CSS custom properties (`--aurora-*`) driven by `data-theme`, preventing scattered hardcoded hex values and enabling instant switching across **Midnight Blue**, **Emerald Aurora**, and **Light Glass**.
5. **Clear Demo vs. Live Data Separation**: Phase 1 renders clearly labeled demo datasets via an isolated `src/data/demo/` provider layer, ready to be swapped seamlessly for Supabase repositories in Phase 3+.

---

## 2. High-Level Technical Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router, React 19, TypeScript) | SSR/RSC shell, API routes, server actions, modular routing |
| **Styling & Motion** | Tailwind CSS v4 + CSS Design Tokens + Framer Motion | Glassmorphism surfaces, stretchy indicators, responsive layouts |
| **UI & Icons** | Custom Reusable Glass Component Library + Lucide React | Cards, dialogs, forms, tables, badges, capsule navs |
| **Data Visualization** | Recharts | Interactive responsive charts with glass tooltips |
| **Tables & Forms** | TanStack Table + React Hook Form + Zod | Sorting/pagination/filtering and strict schema validation |
| **Backend & Database** | Supabase (PostgreSQL, Auth, Storage, RLS) *(Phase 3)* | Multi-tenant persistence, RBAC, storage buckets, audit logs |
| **Exports & Docs** | PDF generation + CSV/Excel import/export *(Phase 4–6)* | Invoices, POs, P&L, Cash Flow, Import Cost reports |

---

## 3. Application Layering & Data Flow

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                           │
│  AppShell (GlassSidebar + TopGlassNavbar + ThemeProvider + Toasts)  │
│  Reusable Glass UI Kit (Card, Table, Button, Form, Dialog, Chart)   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                     Application & Domain Layer                      │
│  • Dynamic Category & Attribute Engine                              │
│  • Accounting Engine (P&L, COGS, Cash Flow separation)              │
│  • Import & Customs Estimator (KSA→BD SAR/BDT, dated tax rules)     │
│  • RBAC Permission Guard & Audit Logger                             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                      Data Access / Service Layer                    │
│  Phase 1: Clearly Labeled Demo Data Providers (src/data/demo/)      │
│  Phase 3+: Supabase Server Client + Typed Repositories + SQL RPCs   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                    PostgreSQL + Supabase (Phase 3)                  │
│  Normalized Multi-Tenant Schema • RLS Policies • Atomic TXNs        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Security & Multi-User Architecture (Planned for Phase 3)

- **Authentication**: Supabase Auth (Email/Password, verification, password reset, MFA-ready).
- **7 Built-in RBAC Roles**:
  - `owner`: Full organizational & billing control, demo data purge, negative-stock override authorization.
  - `admin`: Configurable user, settings, and operational management.
  - `manager`: Cross-module approvals (POs, stock transfers, discounts).
  - `accountant`: Finance, P&L, cash flow, expenses, tax configurations, reports.
  - `inventory_manager`: Products, warehouses, batches, stock movements, receiving.
  - `salesperson`: Daily sales register, orders, invoices, customer CRM.
  - `viewer`: Read-only analytics & dashboard visibility.
- **Credential Hygiene**: `SUPABASE_SERVICE_ROLE_KEY` is restricted exclusively to server-side contexts; browser clients only receive the public anon key constrained by RLS.

---

## 5. Recommended Folder Structure

```text
AURORA-BUSINESS-OS/
├── docs/
│   ├── ARCHITECTURE.md               # System architecture & folder plan
│   └── DATABASE_ERD.md               # Normalized PostgreSQL ERD & RLS plan
├── public/
│   └── ...                           # Brand marks, icons, static assets
├── src/
│   ├── app/
│   │   ├── globals.css               # Tailwind v4 + glassmorphism utilities
│   │   ├── layout.tsx                # Root font, metadata, Theme & Shell providers
│   │   ├── page.tsx                  # Overview (Executive Dashboard)
│   │   └── (modules)/                # Route group for all ERP modules
│   │       └── [module]/page.tsx     # Phase 1 module roadmap/preview shell (0 dead links)
│   ├── components/
│   │   ├── ui/                       # Reusable Glassmorphism Component Library
│   │   │   ├── GlassCard.tsx
│   │   │   ├── GlassButton.tsx
│   │   │   ├── GlassBadge.tsx
│   │   │   ├── GlassInput.tsx
│   │   │   ├── GlassDialog.tsx
│   │   │   ├── Drawer.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── ChartCard.tsx
│   │   │   ├── KpiCard.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   ├── FilterDropdown.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── index.ts
│   │   ├── shell/                    # Application Shell Components
│   │   │   ├── AppShell.tsx
│   │   │   ├── GlassSidebar.tsx
│   │   │   ├── TopGlassNavbar.tsx
│   │   │   ├── GlobalSearchModal.tsx
│   │   │   ├── NotificationPopover.tsx
│   │   │   └── QuickCreateMenu.tsx
│   │   └── dashboard/                # Modular Executive Dashboard
│   │       ├── ExecutiveDashboard.tsx
│   │       ├── KpiGrid.tsx
│   │       ├── DashboardCharts.tsx
│   │       ├── RecentOrdersTable.tsx
│   │       ├── StockAlertsWidget.tsx
│   │       └── CustomizeWidgetsModal.tsx
│   ├── config/
│   │   ├── navigation.ts             # 18-item grouped navigation definition
│   │   └── business-categories.ts    # Dynamic category attribute schemas
│   ├── context/
│   │   ├── ThemeContext.tsx          # Midnight Blue / Emerald Aurora / Light Glass
│   │   └── WorkspaceContext.tsx      # Active org/workspace & user preferences
│   ├── data/
│   │   └── demo/                     # Explicitly labeled Phase 1 demo records
│   │       └── executive-dashboard.ts
│   ├── lib/
│   │   ├── theme/
│   │   │   └── themes.ts             # Centralized design tokens & CSS variable maps
│   │   ├── utils/
│   │   │   ├── cn.ts                 # Classname merge helper
│   │   │   └── format.ts             # Currency, percent, date formatting
│   │   ├── supabase/                 # (Phase 3) Browser & server Supabase clients
│   │   └── validators/               # (Phase 3+) Shared Zod schemas
│   ├── styles/
│   │   └── tokens.css                # CSS variables for all 3 themes & glass tokens
│   └── types/
│       ├── dashboard.ts
│       ├── navigation.ts
│       └── theme.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

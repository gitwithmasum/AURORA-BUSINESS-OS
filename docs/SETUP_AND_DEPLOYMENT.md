# AURORA BUSINESS OS — Setup, Security & Deployment Guide

## 1. Prerequisites
- Node.js 20+ (verified on Node v24.19.0) & npm 10+
- A Supabase project (PostgreSQL 15+, Auth, and Storage enabled)
- Optional: `GEMINI_API_KEY` or `OPENAI_API_KEY` for external LLM narrative synthesis inside the AI Business Assistant

---

## 2. Environment Variables (`.env.local`)
Copy `.env.example` to `.env.local` and configure:

| Variable | Visibility | Required | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Yes | Supabase project URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Yes | Supabase anon key (safe with RLS active) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** | Recommended | Never prefixed with `NEXT_PUBLIC_`; rejected if accessed in browser |
| `NEXT_PUBLIC_APP_URL` | Public | Yes | Canonical origin (`https://your-domain.com` or `http://localhost:3000`) |
| `GEMINI_API_KEY` | **Server-only** | Optional | Enables Gemini API grounded narrative synthesis in `/ai-assistant` |
| `OPENAI_API_KEY` | **Server-only** | Optional | Alternative LLM provider when `GEMINI_API_KEY` is unset |

---

## 3. Database Migrations & RLS Verification
Apply all 8 migrations in `supabase/migrations/` in exact order via Supabase SQL Editor or Supabase CLI (`supabase db push`):
1. `202611250001_core_schema.sql`
2. `202611250002_rls_and_functions.sql`
3. `202611250003_storage_buckets.sql`
4. `202611250004_seed_roles_and_categories.sql`
5. `202611250005_part3_operations.sql`
6. `202611250006_part3_transactions.sql`
7. `202611250007_part4_finance_import_marketing.sql`
8. `202611250008_part5_intelligence_alerts_backups.sql`

Then run `supabase/tests/rls_isolation_check.sql` to verify RLS is enabled on every core tenant table and all 7 RBAC roles exist.

---

## 4. Supabase Auth Redirect Configuration
In **Supabase Dashboard → Authentication → URL Configuration**:
- Set **Site URL** to your `NEXT_PUBLIC_APP_URL`.
- Add `<NEXT_PUBLIC_APP_URL>/auth/callback` to **Redirect URLs** for email verification and password recovery links.

---

## 5. Local Development & Production Verification
```bash
npm install
npm test          # Runs Vitest unit & contract suite
npm run typecheck # Runs tsc --noEmit
npm run lint      # Runs Next.js ESLint checks
npm run build     # Creates production build
npm run start     # Serves production build
```

---

## 6. Deployment (Vercel / Node Host)
1. Push repository to GitHub (`gitwithmasum/AURORA-BUSINESS-OS`).
2. Import into Vercel (or Node container host), configure all `.env.local` keys in Environment Settings.
3. Ensure `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and `OPENAI_API_KEY` are configured as Server-only secrets.
4. Scheduled backups: Configure a Vercel Cron or Supabase `pg_cron` job hitting an authenticated backup routine if scheduled exports are desired; manual on-demand JSON/CSV/Excel exports work immediately out-of-the-box.

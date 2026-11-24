"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, LogIn, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GlassBadge, GlassButton, GlassCard } from "@/components/ui";

export function BackendConnectionGuard({
  moduleTitle,
  children,
}: {
  moduleTitle: string;
  children: React.ReactNode;
}) {
  const { supabaseConfigured, loading, user, activeOrg } = useAuth();

  if (loading) {
    return (
      <GlassCard>
        <div className="py-10 text-center text-xs text-[var(--aurora-text-muted)]">
          Verifying authenticated organization session...
        </div>
      </GlassCard>
    );
  }

  if (!supabaseConfigured || !user || !activeOrg) {
    return (
      <GlassCard variant="elevated">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[var(--aurora-warning)]" />
              <span className="text-sm font-semibold text-[var(--aurora-text-strong)]">
                {moduleTitle} requires an authenticated PostgreSQL organization
              </span>
              <GlassBadge tone="warning">
                {!supabaseConfigured
                  ? "Supabase Not Configured"
                  : !user
                    ? "Sign In Required"
                    : "Onboarding Required"}
              </GlassBadge>
            </div>
            <p className="max-w-2xl text-xs text-[var(--aurora-text-muted)]">
              {!supabaseConfigured
                ? "Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and run supabase/migrations/0001–0006. No fake operational saves are simulated."
                : !user
                  ? "Sign in with Supabase Auth to access your organization's isolated database records."
                  : "Complete the Business Onboarding Wizard to create your first organization, warehouse, and dynamic category schema."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!user ? (
              <Link href="/auth/login">
                <GlassButton variant="primary" size="sm">
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </GlassButton>
              </Link>
            ) : (
              <Link href="/onboarding">
                <GlassButton variant="primary" size="sm">
                  <Building2 className="h-3.5 w-3.5" />
                  Run Onboarding Wizard
                </GlassButton>
              </Link>
            )}
          </div>
        </div>
      </GlassCard>
    );
  }

  return <>{children}</>;
}

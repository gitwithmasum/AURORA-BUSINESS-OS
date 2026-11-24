"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import type { RoleKey } from "@/lib/auth/rbac";

export interface OrgMembershipSummary {
  organizationId: string;
  organizationName: string;
  slug: string;
  roleKey: RoleKey;
  customPermissions: string[];
  onboardingCompleted: boolean;
  currency: string;
  categorySlug: string;
}

interface AuthContextValue {
  supabaseConfigured: boolean;
  loading: boolean;
  user: User | null;
  profile: { fullName: string; phone: string } | null;
  memberships: OrgMembershipSummary[];
  activeOrg: OrgMembershipSummary | null;
  setActiveOrgId: (orgId: string) => void;
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);
const ACTIVE_ORG_KEY = "aurora_os_active_org_id";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const configured = isSupabaseConfigured();

  const [loading, setLoading] = React.useState<boolean>(configured);
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<{
    fullName: string;
    phone: string;
  } | null>(null);
  const [memberships, setMemberships] = React.useState<OrgMembershipSummary[]>([]);
  const [activeOrgId, setActiveOrgIdState] = React.useState<string | null>(null);

  const loadUserAndOrgs = React.useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setMemberships([]);
        setActiveOrgIdState(null);
        return;
      }

      const [{ data: profileRow }, { data: memberRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", currentUser.id)
          .maybeSingle(),
        supabase
          .from("organization_members")
          .select(
            `
            organization_id,
            role_key,
            custom_permissions,
            organizations:organization_id (
              id,
              name,
              slug,
              business_settings (
                onboarding_completed,
                currency,
                primary_category_slug
              )
            )
          `
          )
          .eq("user_id", currentUser.id)
          .eq("status", "active"),
      ]);

      setProfile({
        fullName:
          profileRow?.full_name ||
          (currentUser.user_metadata?.full_name as string) ||
          currentUser.email ||
          "User",
        phone: profileRow?.phone || "",
      });

      const mapped: OrgMembershipSummary[] = (memberRows ?? [])
        .map((row: Record<string, unknown>) => {
          const org = row.organizations as Record<string, unknown> | null;
          if (!org) return null;
          const settingsRaw = org.business_settings;
          const settings = Array.isArray(settingsRaw)
            ? (settingsRaw[0] as Record<string, unknown> | undefined)
            : (settingsRaw as Record<string, unknown> | null);

          return {
            organizationId: String(row.organization_id),
            organizationName: String(org.name ?? "Organization"),
            slug: String(org.slug ?? ""),
            roleKey: row.role_key as RoleKey,
            customPermissions: Array.isArray(row.custom_permissions)
              ? (row.custom_permissions as string[])
              : [],
            onboardingCompleted: Boolean(settings?.onboarding_completed ?? false),
            currency: String(settings?.currency ?? "BDT"),
            categorySlug: String(settings?.primary_category_slug ?? "perfume-fragrance"),
          };
        })
        .filter((x): x is OrgMembershipSummary => x !== null);

      setMemberships(mapped);
      const savedOrg =
        typeof window !== "undefined" ? localStorage.getItem(ACTIVE_ORG_KEY) : null;
      const validSaved = mapped.find((m) => m.organizationId === savedOrg);
      setActiveOrgIdState(
        validSaved?.organizationId ?? mapped[0]?.organizationId ?? null
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    void loadUserAndOrgs();

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadUserAndOrgs();
    });

    return () => subscription.unsubscribe();
  }, [configured, loadUserAndOrgs]);

  const setActiveOrgId = (orgId: string) => {
    setActiveOrgIdState(orgId);
    try {
      localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    } catch {
      // Ignore storage error
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setMemberships([]);
    setActiveOrgIdState(null);
    router.push("/auth/login");
    router.refresh();
  };

  const activeOrg =
    memberships.find((m) => m.organizationId === activeOrgId) ??
    memberships[0] ??
    null;

  return (
    <AuthContext.Provider
      value={{
        supabaseConfigured: configured,
        loading,
        user,
        profile,
        memberships,
        activeOrg,
        setActiveOrgId,
        refreshAuth: loadUserAndOrgs,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

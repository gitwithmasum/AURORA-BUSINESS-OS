"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, Shield, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { profileUpdateSchema } from "@/lib/validators/part2";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import {
  FormField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
  GlassInput,
  PageHeader,
  useToast,
} from "@/components/ui";

export default function ProfilePage() {
  const {
    supabaseConfigured,
    user,
    profile,
    memberships,
    refreshAuth,
    signOut,
  } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setPhone(profile.phone);
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = profileUpdateSchema.safeParse({ fullName, phone });
    if (!parsed.success) {
      toast({
        title: parsed.error.issues[0]?.message || "Invalid input",
        tone: "error",
      });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user) {
      toast({
        title: "Authentication required",
        description: "Connect Supabase and sign in to save profile changes.",
        tone: "warning",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
      })
      .eq("id", user.id);

    if (!error) {
      await supabase.from("activity_logs").insert({
        actor_user_id: user.id,
        event_type: "user.profile_updated",
        entity_type: "profile",
        entity_id: user.id,
        metadata: { full_name: parsed.data.fullName },
      });
      await refreshAuth();
      toast({ title: "Profile updated in PostgreSQL", tone: "success" });
    } else {
      toast({ title: error.message, tone: "error" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="User Profile & Session Management"
        subtitle="Manage your Supabase Auth identity, active organization memberships, and session."
        badges={
          <GlassBadge tone={user ? "success" : "warning"} dot>
            {user
              ? "Authenticated Session"
              : supabaseConfigured
                ? "Signed Out"
                : "Supabase Not Configured"}
          </GlassBadge>
        }
        actions={
          user ? (
            <GlassButton variant="danger" size="sm" onClick={() => void signOut()}>
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </GlassButton>
          ) : (
            <Link href="/auth/login">
              <GlassButton variant="primary" size="sm">
                Sign In
              </GlassButton>
            </Link>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard>
          <GlassCardHeader>
            <div>
              <GlassCardTitle>Personal Details</GlassCardTitle>
              <GlassCardDescription>
                Stored in <code>public.profiles</code> with RLS scoped to your auth UID.
              </GlassCardDescription>
            </div>
            <UserCheck className="h-4 w-4 text-[var(--aurora-accent)]" />
          </GlassCardHeader>
          <GlassCardContent>
            <form onSubmit={handleSave} className="space-y-3.5">
              <FormField label="Email">
                <GlassInput value={user?.email ?? "Not signed in"} disabled />
              </FormField>
              <FormField label="Full Name" required>
                <GlassInput
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!user}
                  placeholder="Your full name"
                />
              </FormField>
              <FormField label="Phone">
                <GlassInput
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!user}
                  placeholder="+880..."
                />
              </FormField>
              <GlassButton
                type="submit"
                variant="primary"
                size="sm"
                loading={saving}
                disabled={!user}
              >
                Save Profile
              </GlassButton>
            </form>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader>
            <div>
              <GlassCardTitle>Organization Memberships & Roles</GlassCardTitle>
              <GlassCardDescription>
                Every organization is strictly isolated via PostgreSQL RLS policies.
              </GlassCardDescription>
            </div>
            <Shield className="h-4 w-4 text-[var(--aurora-accent)]" />
          </GlassCardHeader>
          <GlassCardContent className="space-y-3">
            {memberships.length === 0 ? (
              <div className="aurora-glass-subtle rounded-2xl p-4 text-xs text-[var(--aurora-text-muted)]">
                No active organizations found.{" "}
                <Link href="/onboarding" className="text-[var(--aurora-accent)] underline">
                  Launch Business Onboarding Wizard
                </Link>
                .
              </div>
            ) : (
              memberships.map((m) => (
                <div
                  key={m.organizationId}
                  className="aurora-glass-subtle flex items-center justify-between rounded-2xl p-3.5"
                >
                  <div>
                    <div className="text-sm font-semibold text-[var(--aurora-text-strong)]">
                      {m.organizationName}
                    </div>
                    <div className="text-xs text-[var(--aurora-text-muted)]">
                      {m.categorySlug} · {m.currency}
                    </div>
                  </div>
                  <GlassBadge tone="accent">{ROLE_LABELS[m.roleKey]}</GlassBadge>
                </div>
              ))
            )}
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  );
}

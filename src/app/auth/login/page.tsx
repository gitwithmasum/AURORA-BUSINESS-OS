"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Lock, Mail } from "lucide-react";
import { z } from "zod";
import { loginSchema } from "@/lib/validators/part2";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { AuroraLogoMark } from "@/components/brand/AuroraLogo";
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
  useToast,
} from "@/components/ui";

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const configured = isSupabaseConfigured();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setServerError(
        "Supabase environment variables are not configured (.env.local). Authentication cannot succeed without a live Supabase project."
      );
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error || !data.user) {
      setServerError(error?.message || "Invalid email or password.");
      return;
    }

    // Record login audit event (non-blocking)
    await supabase.from("activity_logs").insert({
      actor_user_id: data.user.id,
      event_type: "user.login",
      entity_type: "session",
      entity_id: data.user.id,
      metadata: { method: "password" },
    });

    toast({
      title: "Signed in to Aurora BusinessHub",
      tone: "success",
    });

    const params = new URLSearchParams(window.location.search);
    const nextPath = params.get("next");
    router.push(nextPath && nextPath.startsWith("/") ? nextPath : "/");
    router.refresh();
  };

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md items-center justify-center py-6">
      <GlassCard variant="elevated" className="w-full">
        <GlassCardHeader>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <AuroraLogoMark className="h-9 w-9" />
              <GlassBadge tone={configured ? "success" : "warning"}>
                {configured ? "Supabase Auth Connected" : "Supabase Not Configured"}
              </GlassBadge>
            </div>
            <GlassCardTitle className="text-xl">
              Sign in to Aurora BusinessHub
            </GlassCardTitle>
            <GlassCardDescription>
              Access your multi-tenant workspace with organization-isolated RBAC.
            </GlassCardDescription>
          </div>
        </GlassCardHeader>

        <GlassCardContent>
          {!configured && (
            <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-[color-mix(in_srgb,var(--aurora-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--aurora-warning)_12%,transparent)] p-3 text-xs text-[var(--aurora-text-strong)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--aurora-warning)]" />
              <div>
                <strong>Environment setup required:</strong> Copy{" "}
                <code>.env.example</code> to <code>.env.local</code> with your
                Supabase URL and anon key to enable live sign-in.
              </div>
            </div>
          )}

          {serverError && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--aurora-danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--aurora-danger)_14%,transparent)] p-3 text-xs text-[var(--aurora-danger)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Email Address" error={errors.email?.message} required>
              <GlassInput
                type="email"
                placeholder="owner@aurorascents.com"
                leftIcon={<Mail className="h-4 w-4" />}
                hasError={Boolean(errors.email)}
                {...register("email")}
              />
            </FormField>

            <FormField label="Password" error={errors.password?.message} required>
              <GlassInput
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                hasError={Boolean(errors.password)}
                {...register("password")}
              />
            </FormField>

            <div className="flex items-center justify-between text-xs">
              <Link
                href="/auth/forgot-password"
                className="text-[var(--aurora-accent)] hover:underline"
              >
                Forgot password?
              </Link>
              <Link
                href="/auth/register"
                className="text-[var(--aurora-text-muted)] hover:text-[var(--aurora-text-strong)]"
              >
                Create account
              </Link>
            </div>

            <GlassButton
              type="submit"
              variant="primary"
              className="w-full"
              loading={isSubmitting}
            >
              Sign In
              <ArrowRight className="h-4 w-4" />
            </GlassButton>
          </form>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

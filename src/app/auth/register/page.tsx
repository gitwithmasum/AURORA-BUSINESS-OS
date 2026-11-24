"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Lock, Mail, User } from "lucide-react";
import { z } from "zod";
import { registerSchema } from "@/lib/validators/part2";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
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
} from "@/components/ui";

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const configured = isSupabaseConfigured();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterValues) => {
    setServerError(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setServerError(
        "Supabase environment variables are not configured (.env.local). Registration requires a connected Supabase project."
      );
      return;
    }

    const origin = window.location.origin;
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
        data: {
          full_name: values.fullName,
        },
      },
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    setSubmittedEmail(values.email);
  };

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md items-center justify-center py-6">
      <GlassCard variant="elevated" className="w-full">
        <GlassCardHeader>
          <div className="space-y-1">
            <GlassBadge tone={configured ? "success" : "warning"}>
              {configured ? "Email Verification Enabled" : "Supabase Not Configured"}
            </GlassBadge>
            <GlassCardTitle className="text-xl">
              Create your AURORA account
            </GlassCardTitle>
            <GlassCardDescription>
              Register to provision your organization and configure your business workspace.
            </GlassCardDescription>
          </div>
        </GlassCardHeader>

        <GlassCardContent>
          {submittedEmail ? (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--aurora-success)_18%,transparent)] text-[var(--aurora-success)]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[var(--aurora-text-strong)]">
                  Verify your email
                </h3>
                <p className="text-xs text-[var(--aurora-text-muted)]">
                  We sent a verification link to <strong>{submittedEmail}</strong>.
                  Confirm your email to continue to Business Onboarding.
                </p>
              </div>
              <Link href="/auth/login">
                <GlassButton variant="secondary" size="sm">
                  Back to Sign In
                </GlassButton>
              </Link>
            </div>
          ) : (
            <>
              {serverError && (
                <div className="mb-4 flex items-start gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--aurora-danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--aurora-danger)_14%,transparent)] p-3 text-xs text-[var(--aurora-danger)]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
                <FormField label="Full Name" error={errors.fullName?.message} required>
                  <GlassInput
                    placeholder="Masum Billah"
                    leftIcon={<User className="h-4 w-4" />}
                    hasError={Boolean(errors.fullName)}
                    {...register("fullName")}
                  />
                </FormField>

                <FormField label="Work Email" error={errors.email?.message} required>
                  <GlassInput
                    type="email"
                    placeholder="owner@company.com"
                    leftIcon={<Mail className="h-4 w-4" />}
                    hasError={Boolean(errors.email)}
                    {...register("email")}
                  />
                </FormField>

                <FormField
                  label="Password"
                  hint="Min 8 chars, at least 1 uppercase letter & 1 number"
                  error={errors.password?.message}
                  required
                >
                  <GlassInput
                    type="password"
                    placeholder="••••••••"
                    leftIcon={<Lock className="h-4 w-4" />}
                    hasError={Boolean(errors.password)}
                    {...register("password")}
                  />
                </FormField>

                <FormField
                  label="Confirm Password"
                  error={errors.confirmPassword?.message}
                  required
                >
                  <GlassInput
                    type="password"
                    placeholder="••••••••"
                    leftIcon={<Lock className="h-4 w-4" />}
                    hasError={Boolean(errors.confirmPassword)}
                    {...register("confirmPassword")}
                  />
                </FormField>

                <GlassButton
                  type="submit"
                  variant="primary"
                  className="w-full"
                  loading={isSubmitting}
                >
                  Create Account
                </GlassButton>

                <div className="text-center text-xs text-[var(--aurora-text-muted)]">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="text-[var(--aurora-accent)] hover:underline">
                    Sign in
                  </Link>
                </div>
              </form>
            </>
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

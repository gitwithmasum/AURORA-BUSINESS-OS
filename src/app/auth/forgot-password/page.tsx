"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { z } from "zod";
import { forgotPasswordSchema } from "@/lib/validators/part2";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  FormField,
  GlassButton,
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
  GlassInput,
} from "@/components/ui";

type ForgotValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotValues) => {
    setServerError(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setServerError("Supabase is not configured in .env.local.");
      return;
    }

    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      setServerError(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center py-6">
      <GlassCard variant="elevated" className="w-full">
        <GlassCardHeader>
          <div>
            <GlassCardTitle className="text-xl">Forgot Password</GlassCardTitle>
            <GlassCardDescription>
              Receive a secure password reset link via Supabase Auth.
            </GlassCardDescription>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {sent ? (
            <div className="space-y-4 py-3 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--aurora-success)]" />
              <p className="text-xs text-[var(--aurora-text-muted)]">
                If an account exists for that email, a password reset link has been sent.
              </p>
              <Link href="/auth/login">
                <GlassButton variant="secondary" size="sm">
                  Back to Login
                </GlassButton>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {serverError && (
                <div className="flex items-start gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--aurora-danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--aurora-danger)_14%,transparent)] p-3 text-xs text-[var(--aurora-danger)]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}
              <FormField label="Email Address" error={errors.email?.message} required>
                <GlassInput
                  type="email"
                  placeholder="you@company.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  {...register("email")}
                />
              </FormField>
              <GlassButton
                type="submit"
                variant="primary"
                className="w-full"
                loading={isSubmitting}
              >
                Send Reset Link
              </GlassButton>
            </form>
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

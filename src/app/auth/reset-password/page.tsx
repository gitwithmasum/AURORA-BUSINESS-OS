"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Lock } from "lucide-react";
import { z } from "zod";
import { resetPasswordSchema } from "@/lib/validators/part2";
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
  useToast,
} from "@/components/ui";

type ResetValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (values: ResetValues) => {
    setServerError(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setServerError("Supabase is not configured in .env.local.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    toast({
      title: "Password updated",
      description: "You can now continue with your updated credentials.",
      tone: "success",
    });
    router.push("/");
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center py-6">
      <GlassCard variant="elevated" className="w-full">
        <GlassCardHeader>
          <div>
            <GlassCardTitle className="text-xl">Reset Password</GlassCardTitle>
            <GlassCardDescription>
              Choose a strong new password for your AURORA BUSINESS OS account.
            </GlassCardDescription>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="flex items-start gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--aurora-danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--aurora-danger)_14%,transparent)] p-3 text-xs text-[var(--aurora-danger)]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <FormField label="New Password" error={errors.password?.message} required>
              <GlassInput
                type="password"
                leftIcon={<Lock className="h-4 w-4" />}
                {...register("password")}
              />
            </FormField>

            <FormField
              label="Confirm New Password"
              error={errors.confirmPassword?.message}
              required
            >
              <GlassInput
                type="password"
                leftIcon={<Lock className="h-4 w-4" />}
                {...register("confirmPassword")}
              />
            </FormField>

            <GlassButton
              type="submit"
              variant="primary"
              className="w-full"
              loading={isSubmitting}
            >
              Update Password
            </GlassButton>
          </form>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

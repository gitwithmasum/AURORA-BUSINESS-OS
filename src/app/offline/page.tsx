"use client";

import * as React from "react";
import Link from "next/link";
import { RefreshCw, WifiOff } from "lucide-react";
import { AuroraLogoMark } from "@/components/brand/AuroraLogo";
import {
  GlassButton,
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui";

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md items-center justify-center py-6">
      <GlassCard variant="elevated" className="w-full text-center">
        <GlassCardHeader className="items-center">
          <div className="mx-auto mb-2 flex items-center justify-center gap-3">
            <AuroraLogoMark className="h-11 w-11" />
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--aurora-glass-border)] bg-[color-mix(in_srgb,var(--aurora-warning)_14%,transparent)] text-[var(--aurora-warning)]">
              <WifiOff className="h-5 w-5" />
            </div>
          </div>
          <GlassCardTitle className="text-xl">
            You are currently offline
          </GlassCardTitle>
          <GlassCardDescription>
            AURORA BUSINESS OS could not reach the server. Check your internet
            connection and retry to sync live inventory, sales, and financial data.
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent className="flex flex-wrap items-center justify-center gap-3">
          <GlassButton
            type="button"
            variant="primary"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Retry Connection
          </GlassButton>
          <Link href="/">
            <GlassButton type="button" variant="secondary">
              Go to Dashboard
            </GlassButton>
          </Link>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

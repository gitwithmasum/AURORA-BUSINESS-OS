"use client";

import * as React from "react";
import { Download, WifiOff, X } from "lucide-react";
import { AuroraLogoMark } from "@/components/brand/AuroraLogo";
import { GlassButton } from "@/components/ui";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

const DISMISS_KEY = "aurora_pwa_install_dismissed";

export function PwaProvider() {
  const [installPrompt, setInstallPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = React.useState(true);
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // Ignore registration errors in restricted/private browser modes
        });
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setDismissed(true);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <>
      {!isOnline && (
        <div
          role="status"
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aurora-warning)_45%,transparent)] bg-[var(--aurora-glass-bg-elevated)] px-3.5 py-2 text-xs font-medium text-[var(--aurora-warning)] shadow-lg backdrop-blur-xl"
        >
          <WifiOff className="h-3.5 w-3.5" />
          <span>Offline Mode — Reconnecting when online</span>
        </div>
      )}

      {installPrompt && !dismissed && (
        <div className="fixed right-4 bottom-4 z-50 flex max-w-xs items-center gap-3 rounded-2xl border border-[var(--aurora-glass-border-strong)] bg-[var(--aurora-glass-bg-elevated)] p-3 shadow-[var(--aurora-glass-shadow)] backdrop-blur-xl">
          <AuroraLogoMark className="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-[var(--aurora-text-strong)]">
              Install AURORA BUSINESS OS
            </div>
            <div className="truncate text-[11px] text-[var(--aurora-text-muted)]">
              Fast desktop & mobile app access
            </div>
          </div>
          <GlassButton
            type="button"
            variant="primary"
            size="sm"
            onClick={handleInstall}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            Install
          </GlassButton>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--aurora-text-muted)] transition-colors hover:text-[var(--aurora-text-strong)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { formatCategoryLabel } from "@/lib/utils/format";
import { GlassBadge, useToast } from "@/components/ui";

const CREATE_NEW_OPTION = "__create_new_workspace__";

/**
 * Shared workspace selector switching seamlessly between live Supabase
 * organizations (when authenticated) and Part 01 demo workspaces (when signed out).
 */
export function WorkspaceSwitcher({
  variant,
  collapsed = false,
  onNavigate,
}: {
  variant: "sidebar" | "navbar";
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const { user, memberships, activeOrg, setActiveOrgId } = useAuth();
  const { workspaces, activeWorkspace, setActiveWorkspaceId } = useWorkspace();
  const { toast } = useToast();

  const isAuthenticated = Boolean(user);
  const isLive = isAuthenticated && Boolean(activeOrg);
  const needsSetup = isAuthenticated && !activeOrg;

  const badgeTone = isLive ? "success" : needsSetup ? "info" : "warning";
  const badgeLabel = isLive ? "LIVE" : needsSetup ? "SETUP" : "DEMO";

  const activeId = isLive
    ? activeOrg!.organizationId
    : activeWorkspace.id;

  const activeName = isLive
    ? activeOrg!.organizationName
    : needsSetup
      ? "No Organization Yet"
      : activeWorkspace.name;

  const activeCategory = isLive
    ? formatCategoryLabel(activeOrg!.categorySlug)
    : activeWorkspace.category;

  const activeCurrency = isLive ? activeOrg!.currency : activeWorkspace.currency;

  const options = isLive
    ? memberships.map((org) => ({
        id: org.organizationId,
        label: org.organizationName,
      }))
    : workspaces.map((ws) => ({
        id: ws.id,
        label: ws.name,
      }));

  const handleSelectChange = (value: string) => {
    if (value === CREATE_NEW_OPTION) {
      onNavigate?.();
      router.push("/onboarding");
      return;
    }

    if (isLive) {
      setActiveOrgId(value);
      const selected = memberships.find((m) => m.organizationId === value);
      toast({
        title: "Workspace switched",
        description: selected
          ? `Active organization updated to ${selected.organizationName}.`
          : "Active organization updated.",
        tone: "success",
      });
      return;
    }

    setActiveWorkspaceId(value);
    toast({
      title: "Workspace switched (Demo)",
      description: "Dashboard filters adapted to demo workspace.",
      tone: "success",
    });
  };

  if (variant === "navbar") {
    if (needsSetup) {
      return (
        <Link
          href="/onboarding"
          className="aurora-capsule hidden h-9 items-center gap-1.5 px-3 text-[13px] font-semibold text-[var(--aurora-text-strong)] transition-colors hover:border-[var(--aurora-glass-border-strong)] xl:flex"
        >
          <PlusCircle className="h-3.5 w-3.5 text-[var(--aurora-accent)]" />
          <span>Setup Business</span>
        </Link>
      );
    }

    return (
      <div className="aurora-capsule hidden h-9 items-center gap-1.5 px-3 xl:flex">
        <Sparkles className="h-3.5 w-3.5 text-[var(--aurora-accent)]" />
        <select
          aria-label="Active workspace"
          value={activeId}
          onChange={(e) => handleSelectChange(e.target.value)}
          className="cursor-pointer bg-transparent text-[13px] font-semibold text-[var(--aurora-text-strong)] focus:outline-none"
        >
          {options.map((opt) => (
            <option
              key={opt.id}
              value={opt.id}
              className="bg-[var(--aurora-surface)] text-[var(--aurora-text-strong)]"
            >
              {opt.label}
            </option>
          ))}
          {isLive && (
            <option
              value={CREATE_NEW_OPTION}
              className="bg-[var(--aurora-surface)] text-[var(--aurora-accent)]"
            >
              + Create New Workspace
            </option>
          )}
        </select>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div
        title={
          needsSetup
            ? "Setup Your Business"
            : `${activeName} (${activeCategory})`
        }
        className="aurora-glass-subtle mx-auto flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-bold text-[var(--aurora-text-strong)]"
      >
        {needsSetup ? "+" : activeCurrency}
      </div>
    );
  }

  return (
    <div className="aurora-glass-subtle rounded-[18px] p-2.5">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--aurora-text-muted)]">
          Workspace
        </span>
        <GlassBadge tone={badgeTone}>{badgeLabel}</GlassBadge>
      </div>

      {needsSetup ? (
        <div className="px-1 py-0.5">
          <div className="truncate text-xs font-semibold text-[var(--aurora-text-strong)]">
            {activeName}
          </div>
          <Link
            href="/onboarding"
            onClick={onNavigate}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--aurora-accent)] hover:underline"
          >
            <PlusCircle className="h-3 w-3" />
            <span>Setup Your Business</span>
          </Link>
        </div>
      ) : (
        <>
          <select
            aria-label="Select workspace"
            value={activeId}
            onChange={(e) => handleSelectChange(e.target.value)}
            className="w-full cursor-pointer rounded-xl bg-transparent px-1 py-1 text-xs font-semibold text-[var(--aurora-text-strong)] focus:outline-none"
          >
            {options.map((opt) => (
              <option
                key={opt.id}
                value={opt.id}
                className="bg-[var(--aurora-surface)] text-[var(--aurora-text-strong)]"
              >
                {opt.label}
              </option>
            ))}
            {isLive && (
              <option
                value={CREATE_NEW_OPTION}
                className="bg-[var(--aurora-surface)] text-[var(--aurora-accent)]"
              >
                + Create New Workspace
              </option>
            )}
          </select>
          <div className="px-1 text-[10px] text-[var(--aurora-text-muted)]">
            {activeCategory} · {activeCurrency}
          </div>
        </>
      )}
    </div>
  );
}

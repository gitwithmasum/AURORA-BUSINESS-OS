"use client";

import * as React from "react";
import { AlertCircle, Bot, CheckCircle2, Send, ShieldCheck, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { GroundedAiResponse } from "@/lib/analytics/engine";
import { BackendConnectionGuard } from "@/components/operations/BackendConnectionGuard";
import {
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

interface ProposalRow {
  id: string;
  proposal_type: string;
  title: string;
  rationale: string;
  status: "pending_approval" | "approved" | "rejected";
  created_at: string;
}

const SAMPLE_QUESTIONS = [
  "Which products are most profitable?",
  "Which perfumes should I reorder?",
  "Which suppliers perform best?",
  "Why did profit decrease this month?",
  "Which campaigns are underperforming?",
  "How much cash might be required next month?",
  "Which products have slow inventory turnover?",
  "Which customers are most valuable?",
];

function AiAssistantWorkspace() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  const [aiStatus, setAiStatus] = React.useState<{
    configured: boolean;
    provider: string | null;
  }>({ configured: false, provider: null });
  const [proposals, setProposals] = React.useState<ProposalRow[]>([]);
  const [question, setQuestion] = React.useState(SAMPLE_QUESTIONS[0]);
  const [brief, setBrief] = React.useState<GroundedAiResponse | null>(null);
  const [asking, setAsking] = React.useState(false);

  const canApprove = activeOrg
    ? ["owner", "admin", "manager"].includes(activeOrg.roleKey)
    : false;

  const loadState = React.useCallback(async () => {
    if (!activeOrg) return;
    const res = await fetch(
      `/api/ai-assistant?organizationId=${activeOrg.organizationId}`
    );
    const json = await res.json();
    if (res.ok) {
      setAiStatus(json.aiStatus ?? { configured: false, provider: null });
      setProposals(json.proposals ?? []);
    }
  }, [activeOrg]);

  React.useEffect(() => {
    void loadState();
  }, [loadState]);

  const askAssistant = async (qText?: string, saveProposals = false) => {
    if (!activeOrg) return;
    const targetQ = (qText ?? question).trim();
    if (!targetQ) return;
    setAsking(true);
    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: activeOrg.organizationId,
          question: targetQ,
          saveProposals,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Analysis failed", tone: "error" });
        return;
      }
      setBrief(json.brief);
      if (saveProposals) await loadState();
    } finally {
      setAsking(false);
    }
  };

  const reviewProposal = async (
    proposalId: string,
    decision: "approved" | "rejected"
  ) => {
    if (!activeOrg) return;
    const res = await fetch("/api/ai-assistant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: activeOrg.organizationId,
        proposalId,
        decision,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: json.error || "Review failed", tone: "error" });
      return;
    }
    toast({ title: `Proposal ${decision}`, tone: "success" });
    await loadState();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Business Intelligence Assistant"
        subtitle="Analyzes only your authorized organization records; separates facts, metrics, forecasts, recommendations, and missing data."
        badges={
          <GlassBadge tone={aiStatus.configured ? "success" : "warning"} dot>
            {aiStatus.configured
              ? `External LLM: ${aiStatus.provider?.toUpperCase()}`
              : "External AI Key Not Configured (Deterministic Mode)"}
          </GlassBadge>
        }
      />

      {!aiStatus.configured && (
        <GlassCard padding="sm">
          <div className="flex items-start gap-2.5 text-xs text-[var(--aurora-warning)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>AI API Setup Notice:</strong> Neither <code>GEMINI_API_KEY</code> nor <code>OPENAI_API_KEY</code> is configured on the server. AURORA does not pretend an external LLM is connected—below you receive deterministic, database-grounded analytical briefs with zero fabricated records.
            </span>
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <GlassCardHeader>
          <div>
            <GlassCardTitle>Ask Your Business Data</GlassCardTitle>
            <GlassCardDescription>
              AI never auto-executes purchases, stock edits, payments, or refunds without human approval.
            </GlassCardDescription>
          </div>
          <Bot className="h-4 w-4 text-[var(--aurora-accent)]" />
        </GlassCardHeader>
        <GlassCardContent className="space-y-3.5">
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_QUESTIONS.map((q) => (
              <GlassButton
                key={q}
                size="sm"
                variant="secondary"
                className="h-7 rounded-full text-[11px]"
                onClick={() => {
                  setQuestion(q);
                  void askAssistant(q, false);
                }}
              >
                {q}
              </GlassButton>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void askAssistant(question, false);
            }}
            className="flex flex-wrap gap-2"
          >
            <div className="flex-1 min-w-[240px]">
              <GlassInput
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about profit, reorders, cash requirements, suppliers, or campaigns..."
              />
            </div>
            <GlassButton type="submit" variant="primary" loading={asking}>
              <Send className="h-3.5 w-3.5" />
              Analyze
            </GlassButton>
            <GlassButton
              variant="secondary"
              loading={asking}
              onClick={() => void askAssistant(question, true)}
            >
              Queue Approval Proposals
            </GlassButton>
          </form>
        </GlassCardContent>
      </GlassCard>

      {brief && (
        <div className="grid gap-4 md:grid-cols-2">
          <GlassCard>
            <GlassCardHeader><GlassCardTitle>1. Recorded Facts</GlassCardTitle></GlassCardHeader>
            <GlassCardContent className="space-y-1.5 text-xs">
              {brief.recordedFacts.map((f, i) => (
                <div key={i} className="aurora-glass-subtle rounded-xl p-2.5">{f}</div>
              ))}
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader><GlassCardTitle>2. Calculated Metrics</GlassCardTitle></GlassCardHeader>
            <GlassCardContent className="space-y-1.5 text-xs">
              {brief.calculatedMetrics.map((m, i) => (
                <div key={i} className="aurora-glass-subtle rounded-xl p-2.5">{m}</div>
              ))}
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader><GlassCardTitle>3. Forecasts &amp; 4. Recommendations</GlassCardTitle></GlassCardHeader>
            <GlassCardContent className="space-y-2 text-xs">
              {brief.forecasts.map((f, i) => (
                <div key={`f-${i}`} className="aurora-glass-subtle rounded-xl p-2.5">
                  <strong>Forecast:</strong> {f}
                </div>
              ))}
              {brief.recommendations.map((r, i) => (
                <div key={`r-${i}`} className="aurora-glass-subtle rounded-xl p-2.5">
                  <strong>Recommendation (Human Approval Required):</strong> {r}
                </div>
              ))}
              {brief.forecasts.length === 0 && brief.recommendations.length === 0 && (
                <div className="text-[var(--aurora-text-muted)]">No forecasts or action recommendations triggered.</div>
              )}
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader><GlassCardTitle>5. Missing or Uncertain Data</GlassCardTitle></GlassCardHeader>
            <GlassCardContent className="space-y-1.5 text-xs">
              {brief.missingData.length === 0 ? (
                <div className="text-[var(--aurora-success)]">All core analytical signals present.</div>
              ) : (
                brief.missingData.map((m, i) => (
                  <div key={i} className="aurora-glass-subtle rounded-xl p-2.5 text-[var(--aurora-warning)]">
                    {m}
                  </div>
                ))
              )}
              {brief.narrativeSummary && (
                <div className="aurora-glass-elevated mt-3 rounded-2xl p-3 text-xs leading-relaxed">
                  <strong>LLM Grounded Summary:</strong> {brief.narrativeSummary}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        </div>
      )}

      <GlassCard>
        <GlassCardHeader>
          <div>
            <GlassCardTitle>Human-in-the-Loop Action Approval Queue</GlassCardTitle>
            <GlassCardDescription>
              Proposed AI recommendations require explicit Owner/Admin/Manager approval
            </GlassCardDescription>
          </div>
          <ShieldCheck className="h-4 w-4 text-[var(--aurora-success)]" />
        </GlassCardHeader>
        <GlassCardContent className="space-y-2.5">
          {proposals.length === 0 ? (
            <div className="text-xs text-[var(--aurora-text-muted)]">
              No queued AI proposals. Click &ldquo;Queue Approval Proposals&rdquo; above to generate reviewable action items.
            </div>
          ) : (
            proposals.map((p) => (
              <div key={p.id} className="aurora-glass-subtle flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5 text-xs">
                <div>
                  <div className="font-semibold text-[var(--aurora-text-strong)]">{p.title}</div>
                  <div className="text-[var(--aurora-text-muted)]">{p.rationale}</div>
                </div>
                <div className="flex items-center gap-2">
                  <GlassBadge tone={p.status === "approved" ? "success" : p.status === "rejected" ? "danger" : "warning"}>
                    {p.status}
                  </GlassBadge>
                  {p.status === "pending_approval" && canApprove && (
                    <>
                      <GlassButton size="sm" variant="ghost" onClick={() => void reviewProposal(p.id, "approved")}>
                        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aurora-success)]" />
                        Approve
                      </GlassButton>
                      <GlassButton size="sm" variant="ghost" onClick={() => void reviewProposal(p.id, "rejected")}>
                        <XCircle className="h-3.5 w-3.5 text-[var(--aurora-danger)]" />
                      </GlassButton>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

export default function AiAssistantPage() {
  return (
    <BackendConnectionGuard moduleTitle="AI Business Assistant">
      <AiAssistantWorkspace />
    </BackendConnectionGuard>
  );
}

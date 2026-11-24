import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/session";
import { getAiProviderStatus } from "@/lib/env";
import { loadOrganizationAnalyticsDataset } from "@/lib/analytics/loader";
import { buildGroundedAiBrief } from "@/lib/analytics/engine";
import { logActivity } from "@/lib/audit/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") || "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const auth = await requireOrgPermission(organizationId, "dashboard.read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const aiStatus = getAiProviderStatus();
  const { data: proposals } = await auth.supabase
    .from("ai_action_proposals")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    aiStatus,
    proposals: proposals ?? [],
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const organizationId = String(body?.organizationId || "");
  const question = String(body?.question || "").trim();
  const saveProposals = Boolean(body?.saveProposals ?? false);

  if (!organizationId || !question) {
    return NextResponse.json(
      { error: "organizationId and question are required." },
      { status: 400 }
    );
  }

  const auth = await requireOrgPermission(organizationId, "dashboard.read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const aiStatus = getAiProviderStatus();
  const dataset = await loadOrganizationAnalyticsDataset(auth.supabase, organizationId);
  const brief = buildGroundedAiBrief(question, dataset, aiStatus);

  // Optional external LLM synthesis strictly grounded in computed facts
  if (aiStatus.configured && aiStatus.provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (apiKey) {
      try {
        const promptText = `You are AURORA BUSINESS OS AI Assistant. Summarize this business question using ONLY the verified facts below. Never invent numbers or execute actions.\nQuestion: ${question}\nRecorded Facts: ${brief.recordedFacts.join(" | ")}\nCalculated Metrics: ${brief.calculatedMetrics.join(" | ")}\nForecasts: ${brief.forecasts.join(" | ")}\nMissing Data: ${brief.missingData.join(" | ")}`;
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
            }),
          }
        );
        if (geminiRes.ok) {
          const gJson = await geminiRes.json();
          const text =
            gJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? undefined;
          if (text) brief.narrativeSummary = text;
        }
      } catch {
        // Fall back to deterministic brief cleanly without faking LLM output
      }
    }
  }

  if (saveProposals && brief.suggestedProposals.length > 0) {
    await auth.supabase.from("ai_action_proposals").insert(
      brief.suggestedProposals.map((p) => ({
        organization_id: organizationId,
        proposal_type: p.proposalType,
        title: p.title,
        rationale: p.rationale,
        payload: p.payload,
        status: "pending_approval",
        requested_by: auth.context.user.id,
      }))
    );
  }

  return NextResponse.json({ brief });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const organizationId = String(body?.organizationId || "");
  const proposalId = String(body?.proposalId || "");
  const decision = body?.decision === "approved" ? "approved" : "rejected";

  if (!organizationId || !proposalId) {
    return NextResponse.json(
      { error: "organizationId and proposalId required." },
      { status: 400 }
    );
  }

  const auth = await requireOrgPermission(organizationId, "purchases.write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!["owner", "admin", "manager"].includes(auth.context.roleKey)) {
    return NextResponse.json(
      { error: "Only Owner, Admin, or Manager can approve AI action proposals." },
      { status: 403 }
    );
  }

  const { data, error } = await auth.supabase
    .from("ai_action_proposals")
    .update({
      status: decision,
      reviewed_by: auth.context.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", proposalId)
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(auth.supabase, {
    organizationId,
    actorUserId: auth.context.user.id,
    eventType: "settings.updated",
    entityType: "ai_action_proposal",
    entityId: proposalId,
    metadata: { decision },
  });

  return NextResponse.json({ proposal: data });
}

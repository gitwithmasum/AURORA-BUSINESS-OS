"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, Megaphone, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCompactNumber, formatCurrency } from "@/lib/utils/format";
import { calculateMarketingRoi } from "@/lib/finance/calculations";
import { BackendConnectionGuard } from "@/components/operations/BackendConnectionGuard";
import {
  ChartCard,
  FormField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  GlassChartTooltip,
  GlassDialog,
  GlassInput,
  GlassSelect,
  KpiCard,
  PageHeader,
  useToast,
} from "@/components/ui";

interface CampaignRow {
  id: string;
  name: string;
  platform: string;
  budget: number;
  start_date: string;
}

interface MetricRow {
  id: string;
  campaign_id: string;
  actual_spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  orders: number;
  revenue: number;
  product_costs: number;
  other_variable_costs: number;
}

function MarketingAdsWorkspace() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = React.useState<CampaignRow[]>([]);
  const [metrics, setMetrics] = React.useState<MetricRow[]>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState("");
  const [platform, setPlatform] = React.useState("Facebook");
  const [startDate, setStartDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [budget, setBudget] = React.useState(25000);
  const [actualSpend, setActualSpend] = React.useState(22000);
  const [impressions, setImpressions] = React.useState(140000);
  const [reach, setReach] = React.useState(95000);
  const [clicks, setClicks] = React.useState(3200);
  const [leads, setLeads] = React.useState(240);
  const [orders, setOrders] = React.useState(48);
  const [revenue, setRevenue] = React.useState(153600);
  const [productCosts, setProductCosts] = React.useState(93000);
  const [otherVariableCosts, setOtherVariableCosts] = React.useState(7200);

  const loadData = React.useCallback(async () => {
    if (!activeOrg) return;
    const res = await fetch(
      `/api/marketing?organizationId=${activeOrg.organizationId}`
    );
    const json = await res.json();
    if (res.ok) {
      setCampaigns(json.campaigns ?? []);
      setMetrics(json.metrics ?? []);
    }
  }, [activeOrg]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setSaving(true);
    try {
      const res = await fetch("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: activeOrg.organizationId,
          name,
          platform,
          startDate,
          budget: Number(budget),
          actualSpend: Number(actualSpend),
          impressions: Number(impressions),
          reach: Number(reach),
          clicks: Number(clicks),
          leads: Number(leads),
          orders: Number(orders),
          revenue: Number(revenue),
          productCosts: Number(productCosts),
          otherVariableCosts: Number(otherVariableCosts),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to save campaign", tone: "error" });
        return;
      }
      toast({ title: "Campaign ROI metrics saved", tone: "success" });
      setModalOpen(false);
      setName("");
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const enriched = React.useMemo(
    () =>
      campaigns.map((c) => {
        const m = metrics.find((x) => x.campaign_id === c.id);
        const roi = calculateMarketingRoi({
          actualSpend: Number(m?.actual_spend ?? 0),
          impressions: Number(m?.impressions ?? 0),
          clicks: Number(m?.clicks ?? 0),
          leads: Number(m?.leads ?? 0),
          orders: Number(m?.orders ?? 0),
          revenue: Number(m?.revenue ?? 0),
          productCosts: Number(m?.product_costs ?? 0),
          otherVariableCosts: Number(m?.other_variable_costs ?? 0),
        });
        return { campaign: c, metric: m, roi };
      }),
    [campaigns, metrics]
  );

  const totals = enriched.reduce(
    (acc, item) => ({
      spend: acc.spend + Number(item.metric?.actual_spend ?? 0),
      revenue: acc.revenue + Number(item.metric?.revenue ?? 0),
      orders: acc.orders + Number(item.metric?.orders ?? 0),
      contribution: acc.contribution + item.roi.contributionAfterAdvertising,
    }),
    { spend: 0, revenue: 0, orders: 0, contribution: 0 }
  );
  const blendedRoas = totals.spend > 0 ? (totals.revenue / totals.spend).toFixed(2) : "0.00";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Facebook Ads & Marketing ROI Tracker"
        subtitle="Track CTR, CPC, CPM, CAC, ROAS, and true Contribution After Advertising."
        actions={
          <GlassButton variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Log Campaign Metrics
          </GlassButton>
        }
      />

      <GlassCard padding="sm">
        <div className="flex items-start gap-2.5 text-xs text-[var(--aurora-warning)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>ROAS is NOT Net Profit:</strong> A 5x ROAS campaign can still lose money if product COGS, COD/shipping fees, returns, and ad spend exceed revenue. Always evaluate <strong>Contribution After Advertising</strong>.
          </span>
        </div>
      </GlassCard>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Ad Spend" value={formatCurrency(totals.spend)} />
        <KpiCard label="Attributed Revenue" value={formatCurrency(totals.revenue)} />
        <KpiCard label="Blended ROAS" value={`${blendedRoas}x`} hint="Gross revenue / spend (not profit)" />
        <KpiCard
          label="Contribution After Ads"
          value={formatCurrency(totals.contribution)}
          trend={totals.contribution >= 0 ? "up" : "down"}
        />
      </div>

      {enriched.length > 0 && (
        <ChartCard title="Revenue vs Contribution After Advertising by Campaign">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={enriched.map((e) => ({
                name: e.campaign.name,
                revenue: Number(e.metric?.revenue ?? 0),
                spend: Number(e.metric?.actual_spend ?? 0),
                contribution: e.roi.contributionAfterAdvertising,
              }))}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="var(--aurora-chart-grid)" />
              <XAxis dataKey="name" stroke="var(--aurora-text-muted)" fontSize={11} />
              <YAxis stroke="var(--aurora-text-muted)" fontSize={11} tickFormatter={(v) => formatCompactNumber(Number(v))} />
              <Tooltip content={<GlassChartTooltip valueFormatter={(v) => formatCurrency(v)} />} />
              <Bar dataKey="revenue" name="Attributed Revenue" fill="var(--aurora-chart-1)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="contribution" name="Contribution After Ads" fill="var(--aurora-chart-2)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <div className="grid gap-3.5 md:grid-cols-2">
        {enriched.map(({ campaign, metric, roi }) => (
          <GlassCard key={campaign.id}>
            <GlassCardHeader>
              <div>
                <GlassCardTitle>{campaign.name}</GlassCardTitle>
                <div className="text-xs text-[var(--aurora-text-muted)]">
                  {campaign.platform} · {campaign.start_date}
                </div>
              </div>
              <GlassBadge tone={roi.contributionAfterAdvertising >= 0 ? "success" : "danger"}>
                ROAS {roi.roas}x
              </GlassBadge>
            </GlassCardHeader>
            <GlassCardContent className="grid grid-cols-3 gap-2 text-xs">
              <div className="aurora-glass-subtle rounded-xl p-2.5">CTR: <strong>{roi.ctrPct}%</strong></div>
              <div className="aurora-glass-subtle rounded-xl p-2.5">CPC: <strong>{formatCurrency(roi.cpc)}</strong></div>
              <div className="aurora-glass-subtle rounded-xl p-2.5">CPM: <strong>{formatCurrency(roi.cpm)}</strong></div>
              <div className="aurora-glass-subtle rounded-xl p-2.5">Conv: <strong>{roi.conversionRatePct}%</strong></div>
              <div className="aurora-glass-subtle rounded-xl p-2.5">CPL: <strong>{formatCurrency(roi.costPerLead)}</strong></div>
              <div className="aurora-glass-subtle rounded-xl p-2.5">CAC: <strong>{formatCurrency(roi.customerAcquisitionCost)}</strong></div>
              <div className="aurora-glass-subtle col-span-3 flex justify-between rounded-xl p-2.5">
                <span>Spend {formatCurrency(Number(metric?.actual_spend ?? 0))} → Revenue {formatCurrency(Number(metric?.revenue ?? 0))}</span>
                <strong>Post-Ad Profit: {formatCurrency(roi.contributionAfterAdvertising)}</strong>
              </div>
            </GlassCardContent>
          </GlassCard>
        ))}
      </div>

      <GlassDialog open={modalOpen} onOpenChange={setModalOpen} title="Log Ad Campaign Metrics" maxWidth="lg">
        <form onSubmit={handleSave} className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Campaign Name" required className="sm:col-span-2">
              <GlassInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Khamrah Winter Conversion" required />
            </FormField>
            <FormField label="Platform">
              <GlassSelect
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                options={[
                  { value: "Facebook", label: "Facebook Ads" },
                  { value: "Instagram", label: "Instagram Ads" },
                  { value: "TikTok", label: "TikTok Ads" },
                  { value: "Google", label: "Google Ads" },
                ]}
              />
            </FormField>
            <FormField label="Start Date">
              <GlassInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormField>
            <FormField label="Budget">
              <GlassInput type="number" min={0} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
            </FormField>
            <FormField label="Actual Spend">
              <GlassInput type="number" min={0} value={actualSpend} onChange={(e) => setActualSpend(Number(e.target.value))} />
            </FormField>
            <FormField label="Impressions">
              <GlassInput type="number" min={0} value={impressions} onChange={(e) => setImpressions(Number(e.target.value))} />
            </FormField>
            <FormField label="Reach">
              <GlassInput type="number" min={0} value={reach} onChange={(e) => setReach(Number(e.target.value))} />
            </FormField>
            <FormField label="Clicks">
              <GlassInput type="number" min={0} value={clicks} onChange={(e) => setClicks(Number(e.target.value))} />
            </FormField>
            <FormField label="Leads">
              <GlassInput type="number" min={0} value={leads} onChange={(e) => setLeads(Number(e.target.value))} />
            </FormField>
            <FormField label="Orders">
              <GlassInput type="number" min={0} value={orders} onChange={(e) => setOrders(Number(e.target.value))} />
            </FormField>
            <FormField label="Attributed Revenue">
              <GlassInput type="number" min={0} value={revenue} onChange={(e) => setRevenue(Number(e.target.value))} />
            </FormField>
            <FormField label="Product Costs (COGS)">
              <GlassInput type="number" min={0} value={productCosts} onChange={(e) => setProductCosts(Number(e.target.value))} />
            </FormField>
            <FormField label="Other Variable Costs">
              <GlassInput type="number" min={0} value={otherVariableCosts} onChange={(e) => setOtherVariableCosts(Number(e.target.value))} />
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</GlassButton>
            <GlassButton type="submit" variant="primary" size="sm" loading={saving}>
              <Megaphone className="h-3.5 w-3.5" />
              Save Campaign
            </GlassButton>
          </div>
        </form>
      </GlassDialog>
    </div>
  );
}

export default function MarketingAdsPage() {
  return (
    <BackendConnectionGuard moduleTitle="Facebook Ads ROI Tracker">
      <MarketingAdsWorkspace />
    </BackendConnectionGuard>
  );
}

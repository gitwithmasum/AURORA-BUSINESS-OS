"use client";

import * as React from "react";
import { AlertTriangle, Calculator, Download, Plus, Save, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils/format";
import {
  calculateBangladeshCustomsEstimate,
  calculateImportCostScenario,
  type ImportItemInput,
} from "@/lib/finance/calculations";
import { exportDocumentPdf } from "@/lib/operations/exports";
import { BackendConnectionGuard } from "@/components/operations/BackendConnectionGuard";
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
  GlassSelect,
  GlassSwitch,
  GlassTextarea,
  PageHeader,
  useToast,
} from "@/components/ui";

interface SavedScenarioRow {
  id: string;
  title: string;
  scenario_mode: string;
  fx_currency: string;
  exchange_rate: number;
  total_purchase_bdt: number;
  total_import_cost_bdt: number;
  total_landed_cost_bdt: number;
  created_at: string;
}

interface SavedTaxConfigRow {
  id: string;
  name: string;
  hs_code: string;
  effective_date: string;
  customs_duty_pct: number;
  regulatory_duty_pct: number;
  supplementary_duty_pct: number;
  vat_pct: number;
  advance_tax_pct: number;
  other_tax_pct: number;
  assumptions_note: string;
}

function ImportManagementWorkspace() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = React.useState<"import" | "customs">("import");
  const [scenarios, setScenarios] = React.useState<SavedScenarioRow[]>([]);
  const [taxConfigs, setTaxConfigs] = React.useState<SavedTaxConfigRow[]>([]);
  const [saving, setSaving] = React.useState(false);

  // Import Calculator State
  const [title, setTitle] = React.useState("KSA Perfume Import Estimate");
  const [fxCurrency, setFxCurrency] = React.useState("SAR");
  const [exchangeRate, setExchangeRate] = React.useState(32.5);
  const [allocationMethod, setAllocationMethod] = React.useState<"value" | "quantity" | "equal">("value");
  const [supplierFees, setSupplierFees] = React.useState(0);
  const [originHandling, setOriginHandling] = React.useState(0);
  const [freightCost, setFreightCost] = React.useState(450);
  const [insurance, setInsurance] = React.useState(80);
  const [customsAssessableValueBdt, setCustomsAssessableValueBdt] = React.useState(0);
  const [customsDutyBdt, setCustomsDutyBdt] = React.useState(0);
  const [applicableTaxesBdt, setApplicableTaxesBdt] = React.useState(0);
  const [clearingForwardingBdt, setClearingForwardingBdt] = React.useState(8500);
  const [localTransportBdt, setLocalTransportBdt] = React.useState(2500);
  const [otherExpensesBdt, setOtherExpensesBdt] = React.useState(0);
  const [targetMarginPct, setTargetMarginPct] = React.useState(35);
  const [items, setItems] = React.useState<ImportItemInput[]>([
    {
      sku: "ARB-LAT-100",
      productName: "Khamrah EDP 100ml",
      brandName: "Lattafa",
      quantity: 24,
      unitPurchasePriceForeign: 55,
    },
  ]);

  // Bangladesh Customs & VAT Estimator State (no hardcoded official rates!)
  const [taxName, setTaxName] = React.useState("Custom Perfume Clearance Rule");
  const [hsCode, setHsCode] = React.useState("");
  const [productDesc, setProductDesc] = React.useState("Perfumes and toilet waters");
  const [originCountry, setOriginCountry] = React.useState("Saudi Arabia");
  const [assessableForeign, setAssessableForeign] = React.useState(1850);
  const [taxFxRate, setTaxFxRate] = React.useState(32.5);
  const [cdPct, setCdPct] = React.useState(0);
  const [rdPct, setRdPct] = React.useState(0);
  const [sdPct, setSdPct] = React.useState(0);
  const [vatPct, setVatPct] = React.useState(0);
  const [atPct, setAtPct] = React.useState(0);
  const [otherTaxPct, setOtherTaxPct] = React.useState(0);
  const [effectiveDate, setEffectiveDate] = React.useState(
    new Date().toISOString().slice(0, 10)
  );
  const [assumptionsNote, setAssumptionsNote] = React.useState(
    "Rates entered manually by operator for estimation only. Verify HS classification and SRO/VAT schedule before customs filing."
  );
  const [verifiedByUser, setVerifiedByUser] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!activeOrg) return;
    const res = await fetch(
      `/api/imports?organizationId=${activeOrg.organizationId}`
    );
    const json = await res.json();
    if (res.ok) {
      setScenarios(json.scenarios ?? []);
      setTaxConfigs(json.taxConfigurations ?? []);
    }
  }, [activeOrg]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const importCalc = React.useMemo(
    () =>
      calculateImportCostScenario({
        fxCurrency,
        exchangeRate,
        allocationMethod,
        supplierFeesForeign: supplierFees,
        originHandlingForeign: originHandling,
        freightCostForeign: freightCost,
        insuranceForeign: insurance,
        customsAssessableValueBdt,
        customsDutyBdt,
        applicableTaxesBdt,
        clearingForwardingBdt,
        localTransportBdt,
        otherExpensesBdt,
        defaultTargetMarginPct: targetMarginPct,
        items,
      }),
    [
      fxCurrency,
      exchangeRate,
      allocationMethod,
      supplierFees,
      originHandling,
      freightCost,
      insurance,
      customsAssessableValueBdt,
      customsDutyBdt,
      applicableTaxesBdt,
      clearingForwardingBdt,
      localTransportBdt,
      otherExpensesBdt,
      targetMarginPct,
      items,
    ]
  );

  const customsCalc = React.useMemo(
    () =>
      calculateBangladeshCustomsEstimate({
        assessableValueForeign: assessableForeign,
        exchangeRate: taxFxRate,
        customsDutyPct: cdPct,
        regulatoryDutyPct: rdPct,
        supplementaryDutyPct: sdPct,
        vatPct,
        advanceTaxPct: atPct,
        otherTaxPct,
        effectiveDate,
        assumptionsNote,
      }),
    [
      assessableForeign,
      taxFxRate,
      cdPct,
      rdPct,
      sdPct,
      vatPct,
      atPct,
      otherTaxPct,
      effectiveDate,
      assumptionsNote,
    ]
  );

  const handleSaveScenario = async () => {
    if (!activeOrg) return;
    setSaving(true);
    try {
      const res = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "import_scenario",
          organizationId: activeOrg.organizationId,
          title,
          scenarioMode: items.length > 1 ? "bulk" : "single",
          fxCurrency,
          exchangeRate,
          allocationMethod,
          supplierFeesForeign: supplierFees,
          originHandlingForeign: originHandling,
          freightCostForeign: freightCost,
          insuranceForeign: insurance,
          customsAssessableValueBdt,
          customsDutyBdt,
          applicableTaxesBdt,
          clearingForwardingBdt,
          localTransportBdt,
          otherExpensesBdt,
          defaultTargetMarginPct: targetMarginPct,
          items,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to save scenario", tone: "error" });
        return;
      }
      toast({ title: "Import scenario snapshot saved", tone: "success" });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTaxConfig = async () => {
    if (!activeOrg) return;
    setSaving(true);
    try {
      const res = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "tax_config",
          organizationId: activeOrg.organizationId,
          name: taxName,
          hsCode,
          productDescription: productDesc,
          countryOfOrigin: originCountry,
          effectiveDate,
          customsDutyPct: cdPct,
          regulatoryDutyPct: rdPct,
          supplementaryDutyPct: sdPct,
          vatPct,
          advanceTaxPct: atPct,
          otherTaxPct,
          assumptionsNote,
          isVerifiedByUser: verifiedByUser,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to save tax rule", tone: "error" });
        return;
      }
      toast({ title: "Dated tax configuration saved", tone: "success" });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTaxesToImport = () => {
    setCustomsAssessableValueBdt(customsCalc.assessableValueBdt);
    setCustomsDutyBdt(customsCalc.customsDutyBdt);
    setApplicableTaxesBdt(
      Number((customsCalc.totalEstimatedTaxesBdt - customsCalc.customsDutyBdt).toFixed(2))
    );
    setTab("import");
    toast({
      title: "Estimated duties applied to Import Calculator",
      tone: "info",
    });
  };

  const exportImportPdf = () => {
    exportDocumentPdf({
      title: "KSA → BD IMPORT COST ESTIMATE",
      subtitle: `${title} (ESTIMATE ONLY)`,
      businessName: activeOrg?.organizationName ?? "Aurora BusinessHub",
      meta: [
        { label: "Exchange Rate", value: `1 ${fxCurrency} = ${exchangeRate} BDT` },
        { label: "Cost Allocation", value: allocationMethod.toUpperCase() },
        { label: "Purchase Cost", value: `${importCalc.purchaseCostForeign} ${fxCurrency} (${formatCurrency(importCalc.purchaseCostBdt)})` },
        { label: "Total Import Cost", value: formatCurrency(importCalc.totalImportCostBdt) },
        { label: "Total Landed Cost", value: formatCurrency(importCalc.totalLandedCostBdt) },
      ],
      columns: ["SKU", "Product", "Qty", "Landed / Unit", "Rec. Price", "Exp. Profit"],
      rows: importCalc.items.map((it) => [
        it.sku || "—",
        it.productName,
        it.quantity,
        formatCurrency(it.landedCostPerUnitBdt),
        formatCurrency(it.recommendedSellingPriceBdt),
        formatCurrency(it.expectedGrossProfitBdt),
      ]),
      footerNote: "ESTIMATE ONLY: Verify duties & VAT against applicable Bangladesh Customs tariff before clearance.",
      filename: "aurora-ksa-bd-import-estimate.pdf",
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="KSA → BD Import Cost & Bangladesh Customs Estimator"
        subtitle="Configurable perfume landed cost allocation and dated Bangladesh Customs/VAT estimation."
        badges={<GlassBadge tone="warning">Estimates Only — Verify Before Clearance</GlassBadge>}
      />

      <GlassCard padding="sm">
        <div className="flex flex-wrap gap-2">
          <GlassButton
            size="sm"
            variant={tab === "import" ? "primary" : "ghost"}
            onClick={() => setTab("import")}
          >
            <Calculator className="h-3.5 w-3.5" />
            Import Cost Calculator (KSA → BD)
          </GlassButton>
          <GlassButton
            size="sm"
            variant={tab === "customs" ? "primary" : "ghost"}
            onClick={() => setTab("customs")}
          >
            Bangladesh Customs &amp; VAT Estimator
          </GlassButton>
        </div>
      </GlassCard>

      {tab === "import" ? (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-3">
            <GlassCard className="lg:col-span-2">
              <GlassCardHeader>
                <div>
                  <GlassCardTitle>Shipment &amp; Cost Parameters</GlassCardTitle>
                  <GlassCardDescription>
                    Supports single product or bulk shipment allocation (Value / Quantity / Equal)
                  </GlassCardDescription>
                </div>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField label="Scenario Title" className="sm:col-span-2">
                    <GlassInput value={title} onChange={(e) => setTitle(e.target.value)} />
                  </FormField>
                  <FormField label="Allocation Method">
                    <GlassSelect
                      value={allocationMethod}
                      onChange={(e) => setAllocationMethod(e.target.value as "value" | "quantity" | "equal")}
                      options={[
                        { value: "value", label: "By Value Share" },
                        { value: "quantity", label: "By Quantity" },
                        { value: "equal", label: "Equal Split" },
                      ]}
                    />
                  </FormField>
                  <FormField label="Currency">
                    <GlassSelect
                      value={fxCurrency}
                      onChange={(e) => setFxCurrency(e.target.value)}
                      options={[
                        { value: "SAR", label: "SAR" },
                        { value: "USD", label: "USD" },
                        { value: "AED", label: "AED" },
                      ]}
                    />
                  </FormField>
                  <FormField label={`FX Rate (${fxCurrency} → BDT)`}>
                    <GlassInput type="number" step="0.01" min={0.01} value={exchangeRate} onChange={(e) => setExchangeRate(Number(e.target.value) || 1)} />
                  </FormField>
                  <FormField label="Target Gross Margin (%)">
                    <GlassInput type="number" min={0} max={85} value={targetMarginPct} onChange={(e) => setTargetMarginPct(Number(e.target.value) || 0)} />
                  </FormField>
                  <FormField label={`Supplier Fees (${fxCurrency})`}>
                    <GlassInput type="number" min={0} value={supplierFees} onChange={(e) => setSupplierFees(Number(e.target.value) || 0)} />
                  </FormField>
                  <FormField label={`Origin Handling (${fxCurrency})`}>
                    <GlassInput type="number" min={0} value={originHandling} onChange={(e) => setOriginHandling(Number(e.target.value) || 0)} />
                  </FormField>
                  <FormField label={`Freight Cost (${fxCurrency})`}>
                    <GlassInput type="number" min={0} value={freightCost} onChange={(e) => setFreightCost(Number(e.target.value) || 0)} />
                  </FormField>
                  <FormField label={`Insurance (${fxCurrency})`}>
                    <GlassInput type="number" min={0} value={insurance} onChange={(e) => setInsurance(Number(e.target.value) || 0)} />
                  </FormField>
                  <FormField label="Est. Customs Duty (BDT)">
                    <GlassInput type="number" min={0} value={customsDutyBdt} onChange={(e) => setCustomsDutyBdt(Number(e.target.value) || 0)} />
                  </FormField>
                  <FormField label="Est. VAT & Other Taxes (BDT)">
                    <GlassInput type="number" min={0} value={applicableTaxesBdt} onChange={(e) => setApplicableTaxesBdt(Number(e.target.value) || 0)} />
                  </FormField>
                  <FormField label="C&F Fees (BDT)">
                    <GlassInput type="number" min={0} value={clearingForwardingBdt} onChange={(e) => setClearingForwardingBdt(Number(e.target.value) || 0)} />
                  </FormField>
                  <FormField label="Local Transport (BDT)">
                    <GlassInput type="number" min={0} value={localTransportBdt} onChange={(e) => setLocalTransportBdt(Number(e.target.value) || 0)} />
                  </FormField>
                  <FormField label="Other Expenses (BDT)">
                    <GlassInput type="number" min={0} value={otherExpensesBdt} onChange={(e) => setOtherExpensesBdt(Number(e.target.value) || 0)} />
                  </FormField>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--aurora-text-strong)]">
                      Products in Shipment ({items.length})
                    </span>
                    <GlassButton
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setItems((prev) => [
                          ...prev,
                          {
                            sku: "",
                            productName: "New Perfume Item",
                            brandName: "",
                            quantity: 12,
                            unitPurchasePriceForeign: 45,
                          },
                        ])
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Product
                    </GlassButton>
                  </div>

                  {items.map((it, idx) => (
                    <div key={idx} className="aurora-glass-subtle grid gap-2 rounded-2xl p-3 sm:grid-cols-12">
                      <div className="sm:col-span-2">
                        <GlassInput
                          placeholder="SKU"
                          value={it.sku}
                          onChange={(e) =>
                            setItems((p) => p.map((r, i) => (i === idx ? { ...r, sku: e.target.value } : r)))
                          }
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <GlassInput
                          placeholder="Product Name"
                          value={it.productName}
                          onChange={(e) =>
                            setItems((p) => p.map((r, i) => (i === idx ? { ...r, productName: e.target.value } : r)))
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <GlassInput
                          placeholder="Brand"
                          value={it.brandName}
                          onChange={(e) =>
                            setItems((p) => p.map((r, i) => (i === idx ? { ...r, brandName: e.target.value } : r)))
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <GlassInput
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) =>
                            setItems((p) => p.map((r, i) => (i === idx ? { ...r, quantity: Number(e.target.value) || 1 } : r)))
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <GlassInput
                          type="number"
                          min={0}
                          step="0.01"
                          value={it.unitPurchasePriceForeign}
                          onChange={(e) =>
                            setItems((p) => p.map((r, i) => (i === idx ? { ...r, unitPurchasePriceForeign: Number(e.target.value) || 0 } : r)))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-end sm:col-span-1">
                        <GlassButton
                          size="icon"
                          variant="ghost"
                          disabled={items.length <= 1}
                          onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-[var(--aurora-danger)]" />
                        </GlassButton>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCardContent>
            </GlassCard>

            <GlassCard variant="elevated">
              <GlassCardHeader>
                <div>
                  <GlassCardTitle>Estimated Landed Summary</GlassCardTitle>
                  <GlassCardDescription>Snapshot calculation (not official customs assessment)</GlassCardDescription>
                </div>
              </GlassCardHeader>
              <GlassCardContent className="space-y-2.5 text-xs">
                <div className="flex justify-between"><span>Purchase ({fxCurrency})</span><strong>{importCalc.purchaseCostForeign} {fxCurrency}</strong></div>
                <div className="flex justify-between"><span>Purchase (BDT)</span><strong>{formatCurrency(importCalc.purchaseCostBdt)}</strong></div>
                <div className="flex justify-between"><span>Total Freight</span><span>{formatCurrency(importCalc.totalFreightBdt)}</span></div>
                <div className="flex justify-between"><span>Insurance</span><span>{formatCurrency(importCalc.insuranceBdt)}</span></div>
                <div className="flex justify-between"><span>Est. Customs Duty</span><span>{formatCurrency(importCalc.estimatedCustomsDutyBdt)}</span></div>
                <div className="flex justify-between"><span>Est. VAT &amp; Taxes</span><span>{formatCurrency(importCalc.estimatedTaxesBdt)}</span></div>
                <div className="flex justify-between"><span>Total Import Cost</span><strong>{formatCurrency(importCalc.totalImportCostBdt)}</strong></div>
                <div className="flex justify-between border-t border-[var(--aurora-glass-border)] pt-2 text-sm text-[var(--aurora-text-strong)]">
                  <span>Total Landed Cost</span>
                  <strong>{formatCurrency(importCalc.totalLandedCostBdt)}</strong>
                </div>

                <div className="space-y-2 pt-2">
                  {importCalc.items.map((line, i) => (
                    <div key={i} className="aurora-glass-subtle rounded-2xl p-3 space-y-1">
                      <div className="font-semibold text-[var(--aurora-text-strong)]">{line.productName}</div>
                      <div className="flex justify-between"><span>Landed / Unit</span><strong>{formatCurrency(line.landedCostPerUnitBdt)}</strong></div>
                      <div className="flex justify-between"><span>Rec. Price ({targetMarginPct}% GM)</span><strong>{formatCurrency(line.recommendedSellingPriceBdt)}</strong></div>
                      <div className="flex justify-between"><span>Expected Profit</span><strong className="text-[var(--aurora-success)]">{formatCurrency(line.expectedGrossProfitBdt)}</strong></div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <GlassButton variant="primary" size="sm" loading={saving} onClick={() => void handleSaveScenario()}>
                    <Save className="h-3.5 w-3.5" />
                    Save Scenario Snapshot
                  </GlassButton>
                  <GlassButton variant="secondary" size="sm" onClick={exportImportPdf}>
                    <Download className="h-3.5 w-3.5" />
                    Download PDF Report
                  </GlassButton>
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>

          {scenarios.length > 0 && (
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle>Saved Import Scenarios ({scenarios.length})</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                {scenarios.map((s) => (
                  <div key={s.id} className="aurora-glass-subtle rounded-2xl p-3.5 space-y-1">
                    <div className="font-semibold text-[var(--aurora-text-strong)]">{s.title}</div>
                    <div>FX: 1 {s.fx_currency} = {s.exchange_rate} BDT</div>
                    <div>Landed Total: <strong>{formatCurrency(Number(s.total_landed_cost_bdt))}</strong></div>
                  </div>
                ))}
              </GlassCardContent>
            </GlassCard>
          )}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <GlassCard className="lg:col-span-2">
            <GlassCardHeader>
              <div>
                <GlassCardTitle>Configurable Bangladesh Customs &amp; VAT Estimator</GlassCardTitle>
                <GlassCardDescription>
                  No official rates are hardcoded. Enter verified HS code rates &amp; dated assumptions.
                </GlassCardDescription>
              </div>
              <GlassBadge tone="warning">Estimate Only</GlassBadge>
            </GlassCardHeader>
            <GlassCardContent className="space-y-3.5">
              <div className="aurora-glass-subtle flex items-start gap-2.5 rounded-2xl p-3 text-xs text-[var(--aurora-warning)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Different perfume concentrations, packaging types, and HS headings may receive different customs treatment. Verify with Bangladesh Customs / licensed C&amp;F agent.
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <FormField label="Rule / Scenario Name" className="sm:col-span-2">
                  <GlassInput value={taxName} onChange={(e) => setTaxName(e.target.value)} />
                </FormField>
                <FormField label="Effective Date">
                  <GlassInput type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
                </FormField>
                <FormField label="HS Code (User Entered)">
                  <GlassInput value={hsCode} onChange={(e) => setHsCode(e.target.value)} placeholder="Enter verified HS code" />
                </FormField>
                <FormField label="Product Description">
                  <GlassInput value={productDesc} onChange={(e) => setProductDesc(e.target.value)} />
                </FormField>
                <FormField label="Country of Origin">
                  <GlassInput value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} />
                </FormField>
                <FormField label="Assessable Value (Foreign)">
                  <GlassInput type="number" min={0} value={assessableForeign} onChange={(e) => setAssessableForeign(Number(e.target.value) || 0)} />
                </FormField>
                <FormField label="Exchange Rate (BDT)">
                  <GlassInput type="number" min={0.01} step="0.01" value={taxFxRate} onChange={(e) => setTaxFxRate(Number(e.target.value) || 1)} />
                </FormField>
                <FormField label="Customs Duty (%)">
                  <GlassInput type="number" min={0} step="0.1" value={cdPct} onChange={(e) => setCdPct(Number(e.target.value) || 0)} />
                </FormField>
                <FormField label="Regulatory Duty (%)">
                  <GlassInput type="number" min={0} step="0.1" value={rdPct} onChange={(e) => setRdPct(Number(e.target.value) || 0)} />
                </FormField>
                <FormField label="Supplementary Duty (%)">
                  <GlassInput type="number" min={0} step="0.1" value={sdPct} onChange={(e) => setSdPct(Number(e.target.value) || 0)} />
                </FormField>
                <FormField label="VAT (%)">
                  <GlassInput type="number" min={0} step="0.1" value={vatPct} onChange={(e) => setVatPct(Number(e.target.value) || 0)} />
                </FormField>
                <FormField label="Advance Tax (%)">
                  <GlassInput type="number" min={0} step="0.1" value={atPct} onChange={(e) => setAtPct(Number(e.target.value) || 0)} />
                </FormField>
                <FormField label="Other Applicable Taxes (%)">
                  <GlassInput type="number" min={0} step="0.1" value={otherTaxPct} onChange={(e) => setOtherTaxPct(Number(e.target.value) || 0)} />
                </FormField>
              </div>

              <FormField label="Calculation Assumptions Note" required>
                <GlassTextarea value={assumptionsNote} onChange={(e) => setAssumptionsNote(e.target.value)} />
              </FormField>

              <GlassSwitch
                checked={verifiedByUser}
                onCheckedChange={setVerifiedByUser}
                label="Operator confirmed rates against current customs schedule"
              />
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="elevated">
            <GlassCardHeader>
              <div>
                <GlassCardTitle>Estimated Tax Breakdown</GlassCardTitle>
                <GlassCardDescription>Rates dated: {customsCalc.effectiveDate}</GlassCardDescription>
              </div>
            </GlassCardHeader>
            <GlassCardContent className="space-y-2.5 text-xs">
              <div className="flex justify-between"><span>Assessable Value (BDT)</span><strong>{formatCurrency(customsCalc.assessableValueBdt)}</strong></div>
              <div className="flex justify-between"><span>Est. Customs Duty ({cdPct}%)</span><span>{formatCurrency(customsCalc.customsDutyBdt)}</span></div>
              <div className="flex justify-between"><span>Est. Regulatory Duty ({rdPct}%)</span><span>{formatCurrency(customsCalc.regulatoryDutyBdt)}</span></div>
              <div className="flex justify-between"><span>Est. Supplementary Duty ({sdPct}%)</span><span>{formatCurrency(customsCalc.supplementaryDutyBdt)}</span></div>
              <div className="flex justify-between"><span>Est. VAT ({vatPct}%)</span><span>{formatCurrency(customsCalc.vatBdt)}</span></div>
              <div className="flex justify-between"><span>Est. Advance Tax ({atPct}%)</span><span>{formatCurrency(customsCalc.advanceTaxBdt)}</span></div>
              <div className="flex justify-between"><span>Est. Other Taxes ({otherTaxPct}%)</span><span>{formatCurrency(customsCalc.otherTaxesBdt)}</span></div>
              <div className="flex justify-between border-t border-[var(--aurora-glass-border)] pt-2 text-sm text-[var(--aurora-text-strong)]">
                <span>Estimated Total Tax</span>
                <strong>{formatCurrency(customsCalc.totalEstimatedTaxesBdt)}</strong>
              </div>
              <div className="flex justify-between text-xs text-[var(--aurora-text-muted)]">
                <span>Est. Value + Tax</span>
                <strong>{formatCurrency(customsCalc.totalImportPlusTaxBdt)}</strong>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <GlassButton variant="primary" size="sm" onClick={handleApplyTaxesToImport}>
                  Apply Estimates to Import Calculator
                </GlassButton>
                <GlassButton variant="secondary" size="sm" loading={saving} onClick={() => void handleSaveTaxConfig()}>
                  <Save className="h-3.5 w-3.5" />
                  Save Tax Rule ({taxConfigs.length})
                </GlassButton>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

export default function ImportManagementPage() {
  return (
    <BackendConnectionGuard moduleTitle="Import Management & Customs Estimator">
      <ImportManagementWorkspace />
    </BackendConnectionGuard>
  );
}

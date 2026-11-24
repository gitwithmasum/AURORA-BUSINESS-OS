"use client";

import * as React from "react";
import { AlertTriangle, Save, Ship } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils/format";
import {
  calculateShippingEstimate,
  type ShippingMethod,
} from "@/lib/finance/calculations";
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

interface ShipmentRow {
  id: string;
  title: string;
  shipping_method: ShippingMethod;
  carrier_name: string;
  chargeable_weight_kg: number;
  total_shipping_cost: number;
  cost_per_unit: number;
  dg_carrier_confirmed: boolean;
  estimated_delivery_days: string;
}

function ShippingLogisticsWorkspace() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();

  const [shipments, setShipments] = React.useState<ShipmentRow[]>([]);
  const [saving, setSaving] = React.useState(false);

  const [title, setTitle] = React.useState("Riyadh → Dhaka Perfume Air Shipment");
  const [originCountry, setOriginCountry] = React.useState("Saudi Arabia");
  const [destinationCountry, setDestinationCountry] = React.useState("Bangladesh");
  const [shippingMethod, setShippingMethod] = React.useState<ShippingMethod>("air_freight");
  const [carrierName, setCarrierName] = React.useState("");
  const [packagesCount, setPackagesCount] = React.useState(2);
  const [grossWeightKg, setGrossWeightKg] = React.useState(18);
  const [lengthCm, setLengthCm] = React.useState(40);
  const [widthCm, setWidthCm] = React.useState(35);
  const [heightCm, setHeightCm] = React.useState(30);
  const [freightRatePerKg, setFreightRatePerKg] = React.useState(950);
  const [insurance, setInsurance] = React.useState(1800);
  const [handlingFee, setHandlingFee] = React.useState(2500);
  const [dgSurcharge, setDgSurcharge] = React.useState(4500);
  const [otherCharges, setOtherCharges] = React.useState(0);
  const [unitCount, setUnitCount] = React.useState(48);
  const [containsAlcoholPerfume, setContainsAlcoholPerfume] = React.useState(true);
  const [dgCarrierConfirmed, setDgCarrierConfirmed] = React.useState(false);
  const [notes, setNotes] = React.useState("");

  const loadShipments = React.useCallback(async () => {
    if (!activeOrg) return;
    const res = await fetch(
      `/api/shipments?organizationId=${activeOrg.organizationId}`
    );
    const json = await res.json();
    if (res.ok) setShipments(json.shipments ?? []);
  }, [activeOrg]);

  React.useEffect(() => {
    void loadShipments();
  }, [loadShipments]);

  const estimate = React.useMemo(
    () =>
      calculateShippingEstimate({
        shippingMethod,
        packagesCount,
        grossWeightKg,
        lengthCm,
        widthCm,
        heightCm,
        freightRatePerKg,
        insurance,
        handlingFee,
        dgSurcharge,
        otherCharges,
        unitCount,
        containsAlcoholPerfume,
        dgCarrierConfirmed,
      }),
    [
      shippingMethod,
      packagesCount,
      grossWeightKg,
      lengthCm,
      widthCm,
      heightCm,
      freightRatePerKg,
      insurance,
      handlingFee,
      dgSurcharge,
      otherCharges,
      unitCount,
      containsAlcoholPerfume,
      dgCarrierConfirmed,
    ]
  );

  const methodComparison = React.useMemo(
    () =>
      (["air_freight", "sea_freight", "courier", "freight_forwarder"] as ShippingMethod[]).map(
        (m) => ({
          method: m,
          ...calculateShippingEstimate({
            shippingMethod: m,
            packagesCount,
            grossWeightKg,
            lengthCm,
            widthCm,
            heightCm,
            freightRatePerKg,
            insurance,
            handlingFee,
            dgSurcharge,
            otherCharges,
            unitCount,
            containsAlcoholPerfume,
            dgCarrierConfirmed,
          }),
        })
      ),
    [
      packagesCount,
      grossWeightKg,
      lengthCm,
      widthCm,
      heightCm,
      freightRatePerKg,
      insurance,
      handlingFee,
      dgSurcharge,
      otherCharges,
      unitCount,
      containsAlcoholPerfume,
      dgCarrierConfirmed,
    ]
  );

  const handleSave = async () => {
    if (!activeOrg) return;
    setSaving(true);
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: activeOrg.organizationId,
          title,
          originCountry,
          destinationCountry,
          shippingMethod,
          carrierName,
          packagesCount,
          grossWeightKg,
          lengthCm,
          widthCm,
          heightCm,
          freightRatePerKg,
          insurance,
          handlingFee,
          dgSurcharge,
          otherCharges,
          unitCount,
          containsAlcoholPerfume,
          dgCarrierConfirmed,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Failed to save shipment", tone: "error" });
        return;
      }
      toast({ title: "Shipment estimate saved", tone: "success" });
      await loadShipments();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Shipping & Logistics Calculator (KSA → BD)"
        subtitle="Volumetric & chargeable weight calculator with Dangerous Goods (DG) compliance check for perfume freight."
        badges={
          <GlassBadge tone={dgCarrierConfirmed ? "success" : "warning"} dot>
            {dgCarrierConfirmed ? "DG Confirmed by Operator" : "DG Review Required"}
          </GlassBadge>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <GlassCardHeader>
            <div>
              <GlassCardTitle>Shipment Dimensions &amp; Freight Charges</GlassCardTitle>
              <GlassCardDescription>
                Supports Air Freight, Sea Freight, Courier &amp; Freight Forwarders
              </GlassCardDescription>
            </div>
            <Ship className="h-4 w-4 text-[var(--aurora-accent)]" />
          </GlassCardHeader>
          <GlassCardContent className="space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Shipment Title" className="sm:col-span-2">
                <GlassInput value={title} onChange={(e) => setTitle(e.target.value)} />
              </FormField>
              <FormField label="Shipping Method">
                <GlassSelect
                  value={shippingMethod}
                  onChange={(e) => setShippingMethod(e.target.value as ShippingMethod)}
                  options={[
                    { value: "air_freight", label: "Air Freight" },
                    { value: "sea_freight", label: "Sea Freight" },
                    { value: "courier", label: "Courier" },
                    { value: "freight_forwarder", label: "Freight Forwarder" },
                  ]}
                />
              </FormField>
              <FormField label="Origin">
                <GlassInput value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} />
              </FormField>
              <FormField label="Destination">
                <GlassInput value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} />
              </FormField>
              <FormField label="Carrier / Forwarder (if verified)">
                <GlassInput value={carrierName} onChange={(e) => setCarrierName(e.target.value)} placeholder="Verify route DG policy first" />
              </FormField>
              <FormField label="Gross Weight (kg)">
                <GlassInput type="number" min={0} step="0.1" value={grossWeightKg} onChange={(e) => setGrossWeightKg(Number(e.target.value) || 0)} />
              </FormField>
              <FormField label="Packages">
                <GlassInput type="number" min={1} value={packagesCount} onChange={(e) => setPackagesCount(Math.max(1, Number(e.target.value) || 1))} />
              </FormField>
              <FormField label="Units in Shipment">
                <GlassInput type="number" min={1} value={unitCount} onChange={(e) => setUnitCount(Math.max(1, Number(e.target.value) || 1))} />
              </FormField>
              <FormField label="Length (cm)">
                <GlassInput type="number" min={0} value={lengthCm} onChange={(e) => setLengthCm(Number(e.target.value) || 0)} />
              </FormField>
              <FormField label="Width (cm)">
                <GlassInput type="number" min={0} value={widthCm} onChange={(e) => setWidthCm(Number(e.target.value) || 0)} />
              </FormField>
              <FormField label="Height (cm)">
                <GlassInput type="number" min={0} value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value) || 0)} />
              </FormField>
              <FormField label="Freight Rate / kg (BDT)">
                <GlassInput type="number" min={0} value={freightRatePerKg} onChange={(e) => setFreightRatePerKg(Number(e.target.value) || 0)} />
              </FormField>
              <FormField label="Insurance (BDT)">
                <GlassInput type="number" min={0} value={insurance} onChange={(e) => setInsurance(Number(e.target.value) || 0)} />
              </FormField>
              <FormField label="Handling Fee (BDT)">
                <GlassInput type="number" min={0} value={handlingFee} onChange={(e) => setHandlingFee(Number(e.target.value) || 0)} />
              </FormField>
              <FormField label="DG Surcharge (BDT)">
                <GlassInput type="number" min={0} value={dgSurcharge} onChange={(e) => setDgSurcharge(Number(e.target.value) || 0)} />
              </FormField>
              <FormField label="Other Charges (BDT)">
                <GlassInput type="number" min={0} value={otherCharges} onChange={(e) => setOtherCharges(Number(e.target.value) || 0)} />
              </FormField>
            </div>

            <div className="space-y-2.5 pt-1">
              <GlassSwitch
                checked={containsAlcoholPerfume}
                onCheckedChange={setContainsAlcoholPerfume}
                label="Alcohol-Based Perfume Shipment (Class 3 Dangerous Goods Review)"
                description="Triggers mandatory carrier & packaging confirmation before dispatch."
              />
              <GlassSwitch
                checked={dgCarrierConfirmed}
                onCheckedChange={setDgCarrierConfirmed}
                label="Shipment-Specific Carrier DG Acceptance Confirmed"
                description="Check only after obtaining written carrier & SDS/packaging verification for this route."
              />
            </div>

            <FormField label="Packaging & Verification Notes">
              <GlassTextarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
          </GlassCardContent>
        </GlassCard>

        <GlassCard variant="elevated">
          <GlassCardHeader>
            <div>
              <GlassCardTitle>Shipping Estimate</GlassCardTitle>
              <GlassCardDescription>Divisor: {estimate.divisor}</GlassCardDescription>
            </div>
          </GlassCardHeader>
          <GlassCardContent className="space-y-2.5 text-xs">
            <div className="flex justify-between"><span>Gross Weight</span><strong>{grossWeightKg} kg</strong></div>
            <div className="flex justify-between"><span>Volumetric Weight</span><strong>{estimate.volumetricWeightKg} kg</strong></div>
            <div className="flex justify-between"><span>Chargeable Weight</span><strong>{estimate.chargeableWeightKg} kg</strong></div>
            <div className="flex justify-between"><span>Freight Charge</span><span>{formatCurrency(estimate.freightCharge)}</span></div>
            <div className="flex justify-between border-t border-[var(--aurora-glass-border)] pt-2 text-sm text-[var(--aurora-text-strong)]">
              <span>Estimated Total</span>
              <strong>{formatCurrency(estimate.totalShippingCost)}</strong>
            </div>
            <div className="flex justify-between"><span>Cost Per Unit ({unitCount} units)</span><strong>{formatCurrency(estimate.costPerUnit)}</strong></div>
            <div className="flex justify-between"><span>Est. Transit</span><strong>{estimate.estimatedDeliveryDays}</strong></div>

            <div className="aurora-glass-subtle flex items-start gap-2 rounded-2xl p-3 text-[11px] text-[var(--aurora-warning)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{estimate.dgAdvisory}</span>
            </div>

            <GlassButton variant="primary" size="sm" className="w-full" loading={saving} onClick={() => void handleSave()}>
              <Save className="h-3.5 w-3.5" />
              Save Shipment Estimate
            </GlassButton>
          </GlassCardContent>
        </GlassCard>
      </div>

      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle>Method &amp; Forwarder Comparison</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          {methodComparison.map((m) => (
            <div key={m.method} className="aurora-glass-subtle rounded-2xl p-3.5 space-y-1">
              <div className="font-semibold uppercase text-[var(--aurora-text-strong)]">
                {m.method.replace("_", " ")}
              </div>
              <div>Chargeable: {m.chargeableWeightKg} kg</div>
              <div>Est. Total: <strong>{formatCurrency(m.totalShippingCost)}</strong></div>
              <div className="text-[11px] text-[var(--aurora-text-muted)]">{m.estimatedDeliveryDays}</div>
            </div>
          ))}
        </GlassCardContent>
      </GlassCard>

      {shipments.length > 0 && (
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Saved Shipment Estimates ({shipments.length})</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            {shipments.map((s) => (
              <div key={s.id} className="aurora-glass-subtle rounded-2xl p-3.5 space-y-1">
                <div className="font-semibold text-[var(--aurora-text-strong)]">{s.title}</div>
                <div>{s.shipping_method} · {s.chargeable_weight_kg} kg</div>
                <div>Total: <strong>{formatCurrency(Number(s.total_shipping_cost))}</strong> ({formatCurrency(Number(s.cost_per_unit))}/unit)</div>
              </div>
            ))}
          </GlassCardContent>
        </GlassCard>
      )}
    </div>
  );
}

export default function ShippingLogisticsPage() {
  return (
    <BackendConnectionGuard moduleTitle="Shipping & Logistics Calculator">
      <ShippingLogisticsWorkspace />
    </BackendConnectionGuard>
  );
}

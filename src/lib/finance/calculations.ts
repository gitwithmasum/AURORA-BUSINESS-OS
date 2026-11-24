// ============================================================================
// AURORA BUSINESS OS — Part 04 Financial, Import, Shipping, Tax & ROI Engine
// Pure deterministic calculation helpers preserving accounting & FX integrity.
// ============================================================================

const round2 = (n: number) => Number(n.toFixed(2));
const round3 = (n: number) => Number(n.toFixed(3));

// ----------------------------------------------------------------------------
// 1. Profit & Loss Statement
// ----------------------------------------------------------------------------
export interface PnlInput {
  grossSales: number;
  salesReturns: number;
  cogs: number;
  operatingExpenses: number;
  marketingExpenses: number;
  shippingExpenses: number;
  importExpenses: number;
  otherExpenses: number;
  // Tracked separately for transparency (NOT included in P&L profit)
  cashReceipts?: number;
  inventoryPurchases?: number;
}

export interface PnlResult {
  grossSales: number;
  salesReturns: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  marketingExpenses: number;
  shippingExpenses: number;
  importExpenses: number;
  otherExpenses: number;
  totalExpenses: number;
  netProfit: number;
  grossMarginPct: number;
  netMarginPct: number;
  cashReceipts: number;
  inventoryPurchases: number;
}

export function calculateProfitAndLoss(input: PnlInput): PnlResult {
  const grossSales = round2(input.grossSales);
  const salesReturns = round2(input.salesReturns);
  const netSales = round2(grossSales - salesReturns);
  const cogs = round2(input.cogs);
  const grossProfit = round2(netSales - cogs);

  const operatingExpenses = round2(input.operatingExpenses);
  const marketingExpenses = round2(input.marketingExpenses);
  const shippingExpenses = round2(input.shippingExpenses);
  const importExpenses = round2(input.importExpenses);
  const otherExpenses = round2(input.otherExpenses);

  const totalExpenses = round2(
    operatingExpenses +
      marketingExpenses +
      shippingExpenses +
      importExpenses +
      otherExpenses
  );
  const netProfit = round2(grossProfit - totalExpenses);

  const grossMarginPct =
    netSales > 0 ? round2((grossProfit / netSales) * 100) : 0;
  const netMarginPct =
    netSales > 0 ? round2((netProfit / netSales) * 100) : 0;

  return {
    grossSales,
    salesReturns,
    netSales,
    cogs,
    grossProfit,
    operatingExpenses,
    marketingExpenses,
    shippingExpenses,
    importExpenses,
    otherExpenses,
    totalExpenses,
    netProfit,
    grossMarginPct,
    netMarginPct,
    cashReceipts: round2(input.cashReceipts ?? 0),
    inventoryPurchases: round2(input.inventoryPurchases ?? 0),
  };
}

// ----------------------------------------------------------------------------
// 2. Cash Flow Statement
// ----------------------------------------------------------------------------
export interface CashFlowTransactionRecord {
  direction: "inflow" | "outflow";
  category: string;
  amount: number;
}

export interface CashFlowSummary {
  openingCashBalance: number;
  salesReceipts: number;
  customerPayments: number;
  otherInflows: number;
  totalInflows: number;
  supplierPayments: number;
  inventoryPurchases: number;
  freightPayments: number;
  customsPayments: number;
  marketingPayments: number;
  operatingExpenses: number;
  refunds: number;
  otherOutflows: number;
  totalOutflows: number;
  netCashMovement: number;
  closingCashBalance: number;
}

export function calculateCashFlowStatement(
  openingCashBalance: number,
  transactions: CashFlowTransactionRecord[]
): CashFlowSummary {
  const buckets = {
    salesReceipts: 0,
    customerPayments: 0,
    otherInflows: 0,
    supplierPayments: 0,
    inventoryPurchases: 0,
    freightPayments: 0,
    customsPayments: 0,
    marketingPayments: 0,
    operatingExpenses: 0,
    refunds: 0,
    otherOutflows: 0,
  };

  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0;
    if (tx.direction === "inflow") {
      if (tx.category === "sales_receipt") buckets.salesReceipts += amt;
      else if (tx.category === "customer_payment") buckets.customerPayments += amt;
      else buckets.otherInflows += amt;
    } else {
      if (tx.category === "supplier_payment") buckets.supplierPayments += amt;
      else if (tx.category === "inventory_purchase") buckets.inventoryPurchases += amt;
      else if (tx.category === "freight_payment") buckets.freightPayments += amt;
      else if (tx.category === "customs_payment") buckets.customsPayments += amt;
      else if (tx.category === "marketing_payment") buckets.marketingPayments += amt;
      else if (tx.category === "operating_expense") buckets.operatingExpenses += amt;
      else if (tx.category === "sales_refund") buckets.refunds += amt;
      else buckets.otherOutflows += amt;
    }
  }

  const totalInflows = round2(
    buckets.salesReceipts + buckets.customerPayments + buckets.otherInflows
  );
  const totalOutflows = round2(
    buckets.supplierPayments +
      buckets.inventoryPurchases +
      buckets.freightPayments +
      buckets.customsPayments +
      buckets.marketingPayments +
      buckets.operatingExpenses +
      buckets.refunds +
      buckets.otherOutflows
  );
  const netCashMovement = round2(totalInflows - totalOutflows);
  const closingCashBalance = round2(openingCashBalance + netCashMovement);

  return {
    openingCashBalance: round2(openingCashBalance),
    salesReceipts: round2(buckets.salesReceipts),
    customerPayments: round2(buckets.customerPayments),
    otherInflows: round2(buckets.otherInflows),
    totalInflows,
    supplierPayments: round2(buckets.supplierPayments),
    inventoryPurchases: round2(buckets.inventoryPurchases),
    freightPayments: round2(buckets.freightPayments),
    customsPayments: round2(buckets.customsPayments),
    marketingPayments: round2(buckets.marketingPayments),
    operatingExpenses: round2(buckets.operatingExpenses),
    refunds: round2(buckets.refunds),
    otherOutflows: round2(buckets.otherOutflows),
    totalOutflows,
    netCashMovement,
    closingCashBalance,
  };
}

// ----------------------------------------------------------------------------
// 3. Configurable Bangladesh Customs & VAT Estimator (Estimate Only)
// ----------------------------------------------------------------------------
export interface BangladeshCustomsInput {
  assessableValueForeign: number;
  exchangeRate: number;
  customsDutyPct: number;
  regulatoryDutyPct: number;
  supplementaryDutyPct: number;
  vatPct: number;
  advanceTaxPct: number;
  otherTaxPct: number;
  effectiveDate: string;
  assumptionsNote: string;
}

export interface BangladeshCustomsResult {
  isEstimate: true;
  assessableValueBdt: number;
  customsDutyBdt: number;
  regulatoryDutyBdt: number;
  supplementaryDutyBaseBdt: number;
  supplementaryDutyBdt: number;
  vatBaseBdt: number;
  vatBdt: number;
  advanceTaxBdt: number;
  otherTaxesBdt: number;
  totalEstimatedTaxesBdt: number;
  totalImportPlusTaxBdt: number;
  effectiveDate: string;
  assumptionsNote: string;
}

export function calculateBangladeshCustomsEstimate(
  input: BangladeshCustomsInput
): BangladeshCustomsResult {
  const av = round2(input.assessableValueForeign * input.exchangeRate);
  const cd = round2(av * (input.customsDutyPct / 100));
  const rd = round2(av * (input.regulatoryDutyPct / 100));
  const sdBase = round2(av + cd + rd);
  const sd = round2(sdBase * (input.supplementaryDutyPct / 100));
  const vatBase = round2(av + cd + rd + sd);
  const vat = round2(vatBase * (input.vatPct / 100));
  const at = round2(vatBase * (input.advanceTaxPct / 100));
  const other = round2(av * (input.otherTaxPct / 100));
  const totalEstimatedTaxesBdt = round2(cd + rd + sd + vat + at + other);

  return {
    isEstimate: true,
    assessableValueBdt: av,
    customsDutyBdt: cd,
    regulatoryDutyBdt: rd,
    supplementaryDutyBaseBdt: sdBase,
    supplementaryDutyBdt: sd,
    vatBaseBdt: vatBase,
    vatBdt: vat,
    advanceTaxBdt: at,
    otherTaxesBdt: other,
    totalEstimatedTaxesBdt,
    totalImportPlusTaxBdt: round2(av + totalEstimatedTaxesBdt),
    effectiveDate: input.effectiveDate,
    assumptionsNote: input.assumptionsNote,
  };
}

// ----------------------------------------------------------------------------
// 4. Saudi Arabia to Bangladesh Import Cost Calculator (Single & Bulk Allocation)
// ----------------------------------------------------------------------------
export interface ImportItemInput {
  sku: string;
  productName: string;
  brandName: string;
  quantity: number;
  unitPurchasePriceForeign: number;
  targetSellingMarginPct?: number;
}

export interface ImportScenarioInput {
  fxCurrency: string;
  exchangeRate: number; // e.g. SAR -> BDT
  allocationMethod: "value" | "quantity" | "equal";
  supplierFeesForeign: number;
  originHandlingForeign: number;
  freightCostForeign: number;
  insuranceForeign: number;
  customsAssessableValueBdt: number;
  customsDutyBdt: number;
  applicableTaxesBdt: number;
  clearingForwardingBdt: number;
  localTransportBdt: number;
  otherExpensesBdt: number;
  defaultTargetMarginPct?: number;
  items: ImportItemInput[];
}

export interface ImportCalculatedLine {
  sku: string;
  productName: string;
  brandName: string;
  quantity: number;
  unitPurchasePriceForeign: number;
  purchaseCostForeign: number;
  purchaseCostBdt: number;
  allocatedImportCostBdt: number;
  landedCostBdt: number;
  landedCostPerUnitBdt: number;
  recommendedSellingPriceBdt: number;
  expectedGrossProfitBdt: number;
  expectedMarginPct: number;
}

export interface ImportScenarioResult {
  isEstimate: true;
  fxCurrency: string;
  exchangeRate: number;
  purchaseCostForeign: number;
  purchaseCostBdt: number;
  totalFreightBdt: number;
  insuranceBdt: number;
  estimatedCustomsDutyBdt: number;
  estimatedTaxesBdt: number;
  totalImportCostBdt: number;
  totalLandedCostBdt: number;
  items: ImportCalculatedLine[];
}

export function calculateImportCostScenario(
  input: ImportScenarioInput
): ImportScenarioResult {
  const fx = Math.max(0.0001, input.exchangeRate);
  const purchaseCostForeign = round2(
    input.items.reduce(
      (sum, it) => sum + it.quantity * it.unitPurchasePriceForeign,
      0
    )
  );
  const purchaseCostBdt = round2(purchaseCostForeign * fx);

  const supplierFeesBdt = round2(input.supplierFeesForeign * fx);
  const originHandlingBdt = round2(input.originHandlingForeign * fx);
  const totalFreightBdt = round2(input.freightCostForeign * fx);
  const insuranceBdt = round2(input.insuranceForeign * fx);

  const estimatedCustomsDutyBdt = round2(input.customsDutyBdt);
  const estimatedTaxesBdt = round2(input.applicableTaxesBdt);

  const totalImportCostBdt = round2(
    supplierFeesBdt +
      originHandlingBdt +
      totalFreightBdt +
      insuranceBdt +
      estimatedCustomsDutyBdt +
      estimatedTaxesBdt +
      input.clearingForwardingBdt +
      input.localTransportBdt +
      input.otherExpensesBdt
  );

  const totalLandedCostBdt = round2(purchaseCostBdt + totalImportCostBdt);
  const totalQuantity = input.items.reduce((s, i) => s + i.quantity, 0);
  const itemCount = Math.max(1, input.items.length);

  const lines: ImportCalculatedLine[] = input.items.map((it) => {
    const lineForeign = round2(it.quantity * it.unitPurchasePriceForeign);
    const lineBdt = round2(lineForeign * fx);

    let share = 1 / itemCount;
    if (input.allocationMethod === "value" && purchaseCostBdt > 0) {
      share = lineBdt / purchaseCostBdt;
    } else if (input.allocationMethod === "quantity" && totalQuantity > 0) {
      share = it.quantity / totalQuantity;
    }

    const allocatedImportCostBdt = round2(totalImportCostBdt * share);
    const landedCostBdt = round2(lineBdt + allocatedImportCostBdt);
    const landedCostPerUnitBdt =
      it.quantity > 0 ? round2(landedCostBdt / it.quantity) : 0;

    const targetMargin =
      it.targetSellingMarginPct ?? input.defaultTargetMarginPct ?? 35;
    const clampedMargin = Math.min(90, Math.max(0, targetMargin));
    const recommendedSellingPriceBdt =
      clampedMargin < 99
        ? round2(landedCostPerUnitBdt / (1 - clampedMargin / 100))
        : landedCostPerUnitBdt;

    const expectedUnitProfit = round2(
      recommendedSellingPriceBdt - landedCostPerUnitBdt
    );
    const expectedGrossProfitBdt = round2(expectedUnitProfit * it.quantity);
    const expectedMarginPct =
      recommendedSellingPriceBdt > 0
        ? round2((expectedUnitProfit / recommendedSellingPriceBdt) * 100)
        : 0;

    return {
      sku: it.sku,
      productName: it.productName,
      brandName: it.brandName,
      quantity: it.quantity,
      unitPurchasePriceForeign: it.unitPurchasePriceForeign,
      purchaseCostForeign: lineForeign,
      purchaseCostBdt: lineBdt,
      allocatedImportCostBdt,
      landedCostBdt,
      landedCostPerUnitBdt,
      recommendedSellingPriceBdt,
      expectedGrossProfitBdt,
      expectedMarginPct,
    };
  });

  return {
    isEstimate: true,
    fxCurrency: input.fxCurrency,
    exchangeRate: fx,
    purchaseCostForeign,
    purchaseCostBdt,
    totalFreightBdt,
    insuranceBdt,
    estimatedCustomsDutyBdt,
    estimatedTaxesBdt,
    totalImportCostBdt,
    totalLandedCostBdt,
    items: lines,
  };
}

// ----------------------------------------------------------------------------
// 5. Shipping Cost Calculator (KSA -> BD)
// ----------------------------------------------------------------------------
export type ShippingMethod =
  | "air_freight"
  | "sea_freight"
  | "courier"
  | "freight_forwarder";

export interface ShippingEstimateInput {
  shippingMethod: ShippingMethod;
  packagesCount: number;
  grossWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  freightRatePerKg: number;
  insurance: number;
  handlingFee: number;
  dgSurcharge: number;
  otherCharges: number;
  unitCount: number;
  containsAlcoholPerfume?: boolean;
  dgCarrierConfirmed?: boolean;
}

export function calculateShippingEstimate(input: ShippingEstimateInput) {
  const divisor =
    input.shippingMethod === "courier"
      ? 5000
      : input.shippingMethod === "sea_freight"
        ? 1000
        : 6000;

  const singleVolWeight =
    (input.lengthCm * input.widthCm * input.heightCm) / divisor;
  const volumetricWeightKg = round3(singleVolWeight * Math.max(1, input.packagesCount));
  const chargeableWeightKg = round3(
    Math.max(input.grossWeightKg, volumetricWeightKg)
  );
  const freightCharge = round2(chargeableWeightKg * input.freightRatePerKg);
  const totalShippingCost = round2(
    freightCharge +
      input.insurance +
      input.handlingFee +
      input.dgSurcharge +
      input.otherCharges
  );
  const costPerUnit =
    input.unitCount > 0 ? round2(totalShippingCost / input.unitCount) : 0;

  const estimatedDeliveryDays =
    input.shippingMethod === "courier"
      ? "3–6 business days (subject to DG acceptance)"
      : input.shippingMethod === "air_freight"
        ? "5–9 days (airport-to-airport)"
        : input.shippingMethod === "sea_freight"
          ? "22–35 days (port-to-port)"
          : "6–12 days (forwarder consolidated)";

  const dgReviewRequired = Boolean(input.containsAlcoholPerfume ?? true);
  const dgCarrierConfirmed = Boolean(input.dgCarrierConfirmed ?? false);

  return {
    divisor,
    volumetricWeightKg,
    chargeableWeightKg,
    freightCharge,
    totalShippingCost,
    costPerUnit,
    estimatedDeliveryDays,
    dgReviewRequired,
    dgCarrierConfirmed,
    dgAdvisory:
      dgReviewRequired && !dgCarrierConfirmed
        ? "DG Review Required: Alcohol-based perfumes are Class 3 Dangerous Goods. Shipment-specific carrier acceptance, SDS/MSDS, and IATA/IMDG packaging verification are mandatory before booking."
        : "DG confirmation recorded by operator for this shipment scenario.",
  };
}

// ----------------------------------------------------------------------------
// 6. Break-even Calculator
// ----------------------------------------------------------------------------
export interface BreakEvenInput {
  fixedCosts: number;
  variableCostPerUnit: number;
  sellingPricePerUnit: number;
  expectedSalesVolume: number;
}

export function calculateBreakEven(input: BreakEvenInput) {
  const contributionPerUnit = round2(
    input.sellingPricePerUnit - input.variableCostPerUnit
  );
  const contributionMarginPct =
    input.sellingPricePerUnit > 0
      ? round2((contributionPerUnit / input.sellingPricePerUnit) * 100)
      : 0;

  const breakEvenUnits =
    contributionPerUnit > 0
      ? Math.ceil(input.fixedCosts / contributionPerUnit)
      : null;
  const breakEvenRevenue =
    breakEvenUnits !== null
      ? round2(breakEvenUnits * input.sellingPricePerUnit)
      : null;

  const expectedNet = round2(
    input.expectedSalesVolume * contributionPerUnit - input.fixedCosts
  );
  const expectedProfit = expectedNet >= 0 ? expectedNet : 0;
  const expectedLoss = expectedNet < 0 ? Math.abs(expectedNet) : 0;

  const requiredMonthlySales = breakEvenUnits;
  const requiredDailySales =
    breakEvenUnits !== null ? round2(breakEvenUnits / 30) : null;

  return {
    contributionPerUnit,
    contributionMarginPct,
    breakEvenUnits,
    breakEvenRevenue,
    expectedProfit,
    expectedLoss,
    requiredDailySales,
    requiredMonthlySales,
  };
}

// ----------------------------------------------------------------------------
// 7. Facebook Ads ROI Tracker (Explicitly Distinguishing ROAS vs Net Contribution)
// ----------------------------------------------------------------------------
export interface MarketingRoiInput {
  actualSpend: number;
  impressions: number;
  clicks: number;
  leads: number;
  orders: number;
  revenue: number;
  productCosts: number;
  otherVariableCosts: number;
}

export function calculateMarketingRoi(input: MarketingRoiInput) {
  const ctrPct =
    input.impressions > 0 ? round2((input.clicks / input.impressions) * 100) : 0;
  const cpc = input.clicks > 0 ? round2(input.actualSpend / input.clicks) : 0;
  const cpm =
    input.impressions > 0
      ? round2((input.actualSpend / input.impressions) * 1000)
      : 0;
  const conversionRatePct =
    input.clicks > 0 ? round2((input.orders / input.clicks) * 100) : 0;
  const costPerLead =
    input.leads > 0 ? round2(input.actualSpend / input.leads) : 0;
  const customerAcquisitionCost =
    input.orders > 0 ? round2(input.actualSpend / input.orders) : 0;
  const roas =
    input.actualSpend > 0 ? round2(input.revenue / input.actualSpend) : 0;
  const contributionAfterAdvertising = round2(
    input.revenue -
      input.productCosts -
      input.otherVariableCosts -
      input.actualSpend
  );

  return {
    ctrPct,
    cpc,
    cpm,
    conversionRatePct,
    costPerLead,
    customerAcquisitionCost,
    roas,
    contributionAfterAdvertising,
    roasIsNotProfit: true as const,
  };
}

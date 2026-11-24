import { describe, expect, it } from "vitest";
import {
  calculateBangladeshCustomsEstimate,
  calculateBreakEven,
  calculateCashFlowStatement,
  calculateImportCostScenario,
  calculateMarketingRoi,
  calculateProfitAndLoss,
  calculateShippingEstimate,
} from "@/lib/finance/calculations";

describe("Part 04 Independently Verified Financial & Import Calculations", () => {
  it("computes P&L statement accurately while isolating cash receipts & inventory purchases", () => {
    const pnl = calculateProfitAndLoss({
      grossSales: 500000,
      salesReturns: 20000,
      cogs: 280000,
      operatingExpenses: 40000,
      marketingExpenses: 25000,
      shippingExpenses: 15000,
      importExpenses: 10000,
      otherExpenses: 5000,
      cashReceipts: 410000,
      inventoryPurchases: 350000,
    });

    expect(pnl.netSales).toBe(480000);
    expect(pnl.grossProfit).toBe(200000);
    expect(pnl.totalExpenses).toBe(95000);
    expect(pnl.netProfit).toBe(105000);
    expect(pnl.grossMarginPct).toBe(41.67);
    expect(pnl.netMarginPct).toBe(21.88);
    expect(pnl.cashReceipts).toBe(410000);
    expect(pnl.inventoryPurchases).toBe(350000);
  });

  it("computes Cash Flow closing balance strictly from recorded inflows and outflows", () => {
    const cf = calculateCashFlowStatement(100000, [
      { direction: "inflow", category: "sales_receipt", amount: 150000 },
      { direction: "inflow", category: "customer_payment", amount: 30000 },
      { direction: "outflow", category: "supplier_payment", amount: 80000 },
      { direction: "outflow", category: "freight_payment", amount: 12000 },
      { direction: "outflow", category: "customs_payment", amount: 18000 },
      { direction: "outflow", category: "sales_refund", amount: 5000 },
    ]);

    expect(cf.totalInflows).toBe(180000);
    expect(cf.totalOutflows).toBe(115000);
    expect(cf.netCashMovement).toBe(65000);
    expect(cf.closingCashBalance).toBe(165000);
  });

  it("calculates Bangladesh Customs cascading tax estimate with dated user assumptions", () => {
    // AV = 1000 * 32 = 32000
    // CD (25%) = 8000
    // RD (3%) = 960
    // SD base = 32000 + 8000 + 960 = 40960 -> SD (20%) = 8192
    // VAT base = 40960 + 8192 = 49152 -> VAT (15%) = 7372.80, AT (5%) = 2457.60
    // Total Taxes = 8000 + 960 + 8192 + 7372.80 + 2457.60 = 26982.40
    const res = calculateBangladeshCustomsEstimate({
      assessableValueForeign: 1000,
      exchangeRate: 32,
      customsDutyPct: 25,
      regulatoryDutyPct: 3,
      supplementaryDutyPct: 20,
      vatPct: 15,
      advanceTaxPct: 5,
      otherTaxPct: 0,
      effectiveDate: "2026-11-25",
      assumptionsNote: "User-entered test assumptions",
    });

    expect(res.isEstimate).toBe(true);
    expect(res.assessableValueBdt).toBe(32000);
    expect(res.customsDutyBdt).toBe(8000);
    expect(res.regulatoryDutyBdt).toBe(960);
    expect(res.supplementaryDutyBdt).toBe(8192);
    expect(res.vatBdt).toBe(7372.8);
    expect(res.advanceTaxBdt).toBe(2457.6);
    expect(res.totalEstimatedTaxesBdt).toBe(26982.4);
  });

  it("allocates bulk KSA-to-BD import costs across multiple perfume SKUs by value share", () => {
    const res = calculateImportCostScenario({
      fxCurrency: "SAR",
      exchangeRate: 32,
      allocationMethod: "value",
      supplierFeesForeign: 0,
      originHandlingForeign: 0,
      freightCostForeign: 100, // 3,200 BDT
      insuranceForeign: 0,
      customsAssessableValueBdt: 32000,
      customsDutyBdt: 4000,
      applicableTaxesBdt: 2800,
      clearingForwardingBdt: 2000,
      localTransportBdt: 0,
      otherExpensesBdt: 0,
      defaultTargetMarginPct: 30,
      items: [
        { sku: "SKU-A", productName: "Perfume A", brandName: "Lattafa", quantity: 10, unitPurchasePriceForeign: 50 }, // 16,000 BDT (50%)
        { sku: "SKU-B", productName: "Perfume B", brandName: "Afnan", quantity: 10, unitPurchasePriceForeign: 50 },  // 16,000 BDT (50%)
      ],
    });

    // Purchase BDT = 32,000; Import cost = 3,200 + 4,000 + 2,800 + 2,000 = 12,000; Landed = 44,000
    expect(res.purchaseCostForeign).toBe(1000);
    expect(res.purchaseCostBdt).toBe(32000);
    expect(res.totalImportCostBdt).toBe(12000);
    expect(res.totalLandedCostBdt).toBe(44000);
    expect(res.items[0].allocatedImportCostBdt).toBe(6000);
    expect(res.items[0].landedCostPerUnitBdt).toBe(2200);
  });

  it("computes volumetric weight, chargeable weight, and DG flag for perfume shipping", () => {
    // Courier divisor = 5000; (50 * 40 * 30) / 5000 = 12 kg * 2 packages = 24 kg volumetric > 18 kg gross
    const res = calculateShippingEstimate({
      shippingMethod: "courier",
      packagesCount: 2,
      grossWeightKg: 18,
      lengthCm: 50,
      widthCm: 40,
      heightCm: 30,
      freightRatePerKg: 1000,
      insurance: 500,
      handlingFee: 1000,
      dgSurcharge: 3000,
      otherCharges: 0,
      unitCount: 40,
      containsAlcoholPerfume: true,
      dgCarrierConfirmed: false,
    });

    expect(res.volumetricWeightKg).toBe(24);
    expect(res.chargeableWeightKg).toBe(24);
    expect(res.totalShippingCost).toBe(28500);
    expect(res.costPerUnit).toBe(712.5);
    expect(res.dgReviewRequired).toBe(true);
    expect(res.dgCarrierConfirmed).toBe(false);
  });

  it("computes break-even units, revenue, daily target, and expected profit", () => {
    // Fixed = 120,000; Price = 3,000; Variable = 1,800 -> Contribution = 1,200 (40%)
    // Break-even = 100 units (300,000 revenue), 3.33 units/day; At 150 units -> Profit = 60,000
    const res = calculateBreakEven({
      fixedCosts: 120000,
      variableCostPerUnit: 1800,
      sellingPricePerUnit: 3000,
      expectedSalesVolume: 150,
    });

    expect(res.contributionPerUnit).toBe(1200);
    expect(res.contributionMarginPct).toBe(40);
    expect(res.breakEvenUnits).toBe(100);
    expect(res.breakEvenRevenue).toBe(300000);
    expect(res.expectedProfit).toBe(60000);
    expect(res.expectedLoss).toBe(0);
    expect(res.requiredDailySales).toBe(3.33);
  });

  it("computes Facebook Ads ROI and shows that high ROAS can still yield negative net contribution", () => {
    // Spend = 20,000, Revenue = 80,000 (4.0x ROAS), Product Cost = 60,000, Variable = 5,000 -> Post-Ad Contribution = -5,000
    const res = calculateMarketingRoi({
      actualSpend: 20000,
      impressions: 100000,
      clicks: 2000,
      leads: 200,
      orders: 40,
      revenue: 80000,
      productCosts: 60000,
      otherVariableCosts: 5000,
    });

    expect(res.ctrPct).toBe(2);
    expect(res.cpc).toBe(10);
    expect(res.cpm).toBe(200);
    expect(res.conversionRatePct).toBe(2);
    expect(res.costPerLead).toBe(100);
    expect(res.customerAcquisitionCost).toBe(500);
    expect(res.roas).toBe(4);
    expect(res.contributionAfterAdvertising).toBe(-5000);
    expect(res.roasIsNotProfit).toBe(true);
  });
});

import { z } from "zod";

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Salary",
  "Marketing",
  "Shipping",
  "Customs",
  "Packaging",
  "Utilities",
  "Software",
  "Transportation",
  "Other Expenses",
] as const;

export const expenseSchema = z.object({
  organizationId: z.string().uuid(),
  category: z.enum(EXPENSE_CATEGORIES),
  vendorName: z.string().trim().max(160).optional().default(""),
  expenseDate: z.string().trim(),
  currency: z.string().trim().min(3).max(5).default("BDT"),
  exchangeRate: z.number().positive().default(1),
  amount: z.number().min(0),
  paymentStatus: z.enum(["paid", "unpaid"]).default("paid"),
  accountId: z.string().uuid().nullable().optional().default(null),
  receiptPath: z.string().trim().nullable().optional().default(null),
  notes: z.string().trim().max(500).optional().default(""),
});

export const financialAccountSchema = z.object({
  organizationId: z.string().uuid(),
  accountName: z.string().trim().min(2).max(100),
  accountType: z.enum(["cash", "bank", "mfs"]),
  institutionName: z.string().trim().max(100).optional().default(""),
  accountNumberMasked: z.string().trim().max(40).optional().default(""),
  currency: z.string().trim().min(3).max(5).default("BDT"),
  openingBalance: z.number().default(0),
});

export const cashTransactionSchema = z.object({
  organizationId: z.string().uuid(),
  accountId: z.string().uuid().nullable().optional().default(null),
  direction: z.enum(["inflow", "outflow"]),
  category: z.enum([
    "sales_receipt",
    "customer_payment",
    "other_inflow",
    "supplier_payment",
    "inventory_purchase",
    "freight_payment",
    "customs_payment",
    "marketing_payment",
    "operating_expense",
    "sales_refund",
    "other_outflow",
  ]),
  amount: z.number().positive(),
  txDate: z.string().trim(),
  paymentMethod: z.string().trim().default("Cash"),
  description: z.string().trim().max(300).optional().default(""),
});

export const taxConfigSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  hsCode: z.string().trim().max(30).optional().default(""),
  productDescription: z.string().trim().max(240).optional().default(""),
  countryOfOrigin: z.string().trim().min(2).default("Saudi Arabia"),
  effectiveDate: z.string().trim(),
  customsDutyPct: z.number().min(0).max(200),
  regulatoryDutyPct: z.number().min(0).max(200),
  supplementaryDutyPct: z.number().min(0).max(500),
  vatPct: z.number().min(0).max(100),
  advanceTaxPct: z.number().min(0).max(100),
  otherTaxPct: z.number().min(0).max(100),
  assumptionsNote: z.string().trim().min(5).max(500),
  isVerifiedByUser: z.boolean().default(false),
});

export const importScenarioCreateSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  scenarioMode: z.enum(["single", "bulk"]).default("single"),
  originCountry: z.string().trim().default("Saudi Arabia"),
  destinationCountry: z.string().trim().default("Bangladesh"),
  fxCurrency: z.string().trim().min(3).max(5).default("SAR"),
  exchangeRate: z.number().positive(),
  allocationMethod: z.enum(["value", "quantity", "equal"]).default("value"),
  taxConfigId: z.string().uuid().nullable().optional().default(null),
  supplierFeesForeign: z.number().min(0).default(0),
  originHandlingForeign: z.number().min(0).default(0),
  freightCostForeign: z.number().min(0).default(0),
  insuranceForeign: z.number().min(0).default(0),
  customsAssessableValueBdt: z.number().min(0).default(0),
  customsDutyBdt: z.number().min(0).default(0),
  applicableTaxesBdt: z.number().min(0).default(0),
  clearingForwardingBdt: z.number().min(0).default(0),
  localTransportBdt: z.number().min(0).default(0),
  otherExpensesBdt: z.number().min(0).default(0),
  defaultTargetMarginPct: z.number().min(0).max(90).default(35),
  items: z
    .array(
      z.object({
        sku: z.string().trim().optional().default(""),
        productName: z.string().trim().min(1),
        brandName: z.string().trim().optional().default(""),
        quantity: z.number().positive(),
        unitPurchasePriceForeign: z.number().min(0),
      })
    )
    .min(1),
});

export const shipmentCreateSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().trim().min(2).max(140),
  originCountry: z.string().trim().default("Saudi Arabia"),
  destinationCountry: z.string().trim().default("Bangladesh"),
  shippingMethod: z.enum([
    "air_freight",
    "sea_freight",
    "courier",
    "freight_forwarder",
  ]),
  carrierName: z.string().trim().max(100).optional().default(""),
  packagesCount: z.number().int().min(1).default(1),
  grossWeightKg: z.number().min(0),
  lengthCm: z.number().min(0).default(0),
  widthCm: z.number().min(0).default(0),
  heightCm: z.number().min(0).default(0),
  freightRatePerKg: z.number().min(0),
  insurance: z.number().min(0).default(0),
  handlingFee: z.number().min(0).default(0),
  dgSurcharge: z.number().min(0).default(0),
  otherCharges: z.number().min(0).default(0),
  unitCount: z.number().int().min(1).default(1),
  containsAlcoholPerfume: z.boolean().default(true),
  dgCarrierConfirmed: z.boolean().default(false),
  notes: z.string().trim().max(400).optional().default(""),
});

export const marketingCampaignCreateSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2).max(140),
  platform: z.string().trim().default("Facebook"),
  objective: z.string().trim().default("Conversions"),
  startDate: z.string().trim(),
  endDate: z.string().trim().nullable().optional().default(null),
  budget: z.number().min(0),
  actualSpend: z.number().min(0),
  impressions: z.number().int().min(0),
  reach: z.number().int().min(0),
  clicks: z.number().int().min(0),
  leads: z.number().int().min(0),
  orders: z.number().int().min(0),
  revenue: z.number().min(0),
  productCosts: z.number().min(0),
  otherVariableCosts: z.number().min(0),
});

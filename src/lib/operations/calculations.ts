export interface SaleLineCalculation {
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
}

export function calculateSaleTotals(lines: SaleLineCalculation[]) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let grandTotal = 0;

  for (const line of lines) {
    const gross = line.quantity * line.unitPrice;
    const net = Math.max(0, gross - line.discount + line.tax);
    subtotal += gross;
    discountTotal += line.discount;
    taxTotal += line.tax;
    grandTotal += net;
  }

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discountTotal: Number(discountTotal.toFixed(2)),
    taxTotal: Number(taxTotal.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
  };
}

export function evaluateStockGuard(params: {
  availableQty: number;
  requestedDelta: number;
  allowNegativeSetting: boolean;
  overrideRequested: boolean;
  isAuthorizedRole: boolean;
}): { allowed: boolean; resultingQty: number; reason?: string } {
  const resultingQty = Number((params.availableQty + params.requestedDelta).toFixed(2));
  if (resultingQty >= 0) {
    return { allowed: true, resultingQty };
  }
  if (
    params.allowNegativeSetting &&
    params.overrideRequested &&
    params.isAuthorizedRole
  ) {
    return { allowed: true, resultingQty };
  }
  return {
    allowed: false,
    resultingQty,
    reason: `Stock cannot become negative (${resultingQty}). Enable override in Business Settings with authorized role.`,
  };
}

export function calculatePurchaseOrderTotal(params: {
  items: { quantity: number; unitPrice: number }[];
  shippingCost: number;
  additionalCosts: number;
}): number {
  const itemsTotal = params.items.reduce(
    (sum, it) => sum + it.quantity * it.unitPrice,
    0
  );
  return Number(
    (itemsTotal + params.shippingCost + params.additionalCosts).toFixed(2)
  );
}

export function generateDocumentNumber(
  prefix: "INV" | "PRO" | "PUR" | "CN" | "PO",
  sequenceHint?: number
): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const suffix =
    sequenceHint !== undefined
      ? String(sequenceHint).padStart(4, "0")
      : Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${ymd}-${suffix}`;
}

export interface DemoSupplierSeed {
  supplierCode: string;
  name: string;
  country: string;
  city: string;
  contactPerson: string;
  brandsSupplied: string[];
  productCategories: string[];
  moq: number;
  currency: string;
  leadTimeDays: number;
  paymentTerms: string;
  exportCapable: boolean;
  remarks: string;
}

export const DEMO_SUPPLIER_SEEDS: DemoSupplierSeed[] = [
  {
    supplierCode: "DEMO-SUP-001",
    name: "Al-Noor Fragrance Trading (Sample Demo)",
    country: "Saudi Arabia",
    city: "Riyadh",
    contactPerson: "Sample Representative A",
    brandsSupplied: ["Lattafa", "Rasasi", "Ajmal"],
    productCategories: ["Perfume & Fragrance", "Oud & Attar"],
    moq: 24,
    currency: "SAR",
    leadTimeDays: 10,
    paymentTerms: "50% Advance / 50% BL",
    exportCapable: true,
    remarks: "Clearly labeled demo supplier record — verify real contacts before live procurement.",
  },
  {
    supplierCode: "DEMO-SUP-002",
    name: "Jeddah Scent Distribution Co. (Sample Demo)",
    country: "Saudi Arabia",
    city: "Jeddah",
    contactPerson: "Sample Representative B",
    brandsSupplied: ["Afnan", "Armaf", "Al Haramain"],
    productCategories: ["Perfume & Fragrance"],
    moq: 36,
    currency: "SAR",
    leadTimeDays: 12,
    paymentTerms: "TT Advance",
    exportCapable: true,
    remarks: "Sample demo supplier for KSA-to-BD air/sea freight workflow testing.",
  },
  {
    supplierCode: "DEMO-SUP-003",
    name: "Gulf Prestige Aromas LLC (Sample Demo)",
    country: "UAE",
    city: "Dubai",
    contactPerson: "Sample Representative C",
    brandsSupplied: ["Swiss Arabian", "Maison Francis Kurkdjian", "Dior"],
    productCategories: ["Perfume & Fragrance", "Cosmetics & Skincare"],
    moq: 12,
    currency: "USD",
    leadTimeDays: 7,
    paymentTerms: "Net 15 (Sample)",
    exportCapable: true,
    remarks: "Sample demo niche & designer fragrance distributor.",
  },
];

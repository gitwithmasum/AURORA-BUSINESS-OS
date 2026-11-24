import { z } from "zod";

export const brandSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2, "Brand name is required."),
  countryOfOrigin: z.string().trim().max(100).optional().default(""),
  description: z.string().trim().max(400).optional().default(""),
  logoPath: z.string().trim().nullable().optional().default(null),
});

export const productSchema = z.object({
  organizationId: z.string().uuid(),
  sku: z.string().trim().min(2, "SKU is required.").max(64),
  barcode: z.string().trim().max(64).optional().default(""),
  name: z.string().trim().min(2, "Product name is required.").max(160),
  categoryId: z.string().uuid("Select a valid category."),
  brandId: z.string().uuid().nullable().optional().default(null),
  defaultSupplierId: z.string().uuid().nullable().optional().default(null),
  supplierInvoiceRef: z.string().trim().max(120).optional().default(""),
  imagePath: z.string().trim().nullable().optional().default(null),
  description: z.string().trim().max(1000).optional().default(""),
  unit: z.string().trim().min(1).max(24).default("pcs"),
  purchaseCost: z.number().min(0),
  sellingPrice: z.number().min(0),
  minStock: z.number().min(0),
  status: z.enum(["active", "draft", "archived"]).default("active"),
  notes: z.string().trim().max(1000).optional().default(""),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().default({}),
});

export const warehouseSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2),
  code: z.string().trim().min(2).max(24),
  address: z.string().trim().max(240).optional().default(""),
});

export const inventoryMovementSchema = z.object({
  organizationId: z.string().uuid(),
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  movementType: z.enum(["stock_in", "stock_out", "adjustment", "transfer_out"]),
  quantity: z.number().min(0),
  batchNumber: z.string().trim().max(64).optional().default("DEFAULT"),
  unitCost: z.number().min(0).optional().default(0),
  targetWarehouseId: z.string().uuid().nullable().optional().default(null),
  notes: z.string().trim().max(400).optional().default(""),
  overrideNegative: z.boolean().optional().default(false),
});

export const supplierSchema = z.object({
  organizationId: z.string().uuid(),
  supplierCode: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(160),
  country: z.string().trim().max(80).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  address: z.string().trim().max(240).optional().default(""),
  contactPerson: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  whatsapp: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().email().or(z.literal("")).optional().default(""),
  website: z.string().trim().max(200).optional().default(""),
  registrationReference: z.string().trim().max(120).optional().default(""),
  brandsSupplied: z.array(z.string().trim()).optional().default([]),
  productCategories: z.array(z.string().trim()).optional().default([]),
  moq: z.number().int().min(1).default(1),
  wholesalePriceHint: z.number().min(0).nullable().optional().default(null),
  retailPriceHint: z.number().min(0).nullable().optional().default(null),
  currency: z.string().trim().min(3).max(5).default("SAR"),
  leadTimeDays: z.number().int().min(0).default(14),
  paymentTerms: z.string().trim().max(120).optional().default(""),
  exportCapable: z.boolean().default(false),
  verificationStatus: z.enum(["unverified", "pending_review", "verified"]).default("unverified"),
  partnershipStatus: z.enum(["prospect", "active", "paused", "archived"]).default("prospect"),
  rating: z.number().min(0).max(5).nullable().optional().default(null),
  remarks: z.string().trim().max(500).optional().default(""),
  isDemo: z.boolean().optional().default(false),
});

export const customerSchema = z.object({
  organizationId: z.string().uuid(),
  customerCode: z.string().trim().min(2).max(40),
  fullName: z.string().trim().min(2).max(140),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().email().or(z.literal("")).optional().default(""),
  address: z.string().trim().max(240).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  customerType: z.enum(["retail", "wholesale"]).default("retail"),
  segment: z.enum(["new", "regular", "vip", "inactive", "wholesale"]).default("new"),
  followUpAt: z.string().trim().nullable().optional().default(null),
  notes: z.string().trim().max(600).optional().default(""),
});

export const saleItemInputSchema = z.object({
  product_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
});

export const completeSaleSchema = z.object({
  organizationId: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional().default(null),
  saleDate: z.string().trim().optional(),
  channel: z.string().trim().min(1).default("Showroom"),
  paymentMethod: z.string().trim().min(1).default("Cash"),
  paymentStatus: z.enum(["paid", "partial", "unpaid"]).default("paid"),
  paidAmount: z.number().min(0).nullable().optional().default(null),
  notes: z.string().trim().max(400).optional().default(""),
  overrideNegative: z.boolean().optional().default(false),
  items: z.array(saleItemInputSchema).min(1, "Add at least one product line."),
});

export const purchaseOrderItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  brand: z.string().trim().optional().default(""),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
});

export const createPurchaseOrderSchema = z.object({
  organizationId: z.string().uuid(),
  supplierId: z.string().uuid(),
  purchaseDate: z.string().trim(),
  expectedDelivery: z.string().trim().nullable().optional().default(null),
  currency: z.string().trim().min(3).max(5).default("SAR"),
  exchangeRate: z.number().positive().default(1),
  shippingCost: z.number().min(0).default(0),
  additionalCosts: z.number().min(0).default(0),
  paymentTerms: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
  items: z.array(purchaseOrderItemSchema).min(1),
});

export const receivePoSchema = z.object({
  organizationId: z.string().uuid(),
  poId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  additionalCosts: z.number().min(0).default(0),
  notes: z.string().trim().max(400).optional().default(""),
  items: z
    .array(
      z.object({
        po_item_id: z.string().uuid(),
        quantity: z.number().positive(),
        batch_number: z.string().trim().optional().default("DEFAULT"),
      })
    )
    .min(1),
});

export const createInvoiceSchema = z.object({
  organizationId: z.string().uuid(),
  invoiceType: z.enum(["sales", "purchase", "proforma", "credit_note"]),
  counterpartyName: z.string().trim().min(2),
  counterpartyContact: z.string().trim().optional().default(""),
  issueDate: z.string().trim(),
  dueDate: z.string().trim().nullable().optional().default(null),
  paymentStatus: z.enum(["paid", "partial", "unpaid", "refunded"]).default("unpaid"),
  notes: z.string().trim().max(500).optional().default(""),
  termsAndConditions: z.string().trim().max(600).optional().default("Goods subject to verification policy."),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1),
        sku: z.string().trim().optional().default(""),
        quantity: z.number().positive(),
        unitPrice: z.number().min(0),
        discount: z.number().min(0).default(0),
        tax: z.number().min(0).default(0),
      })
    )
    .min(1),
});

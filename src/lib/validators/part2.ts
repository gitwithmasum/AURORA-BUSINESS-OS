import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is required."),
    email: z.string().trim().email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Include at least one uppercase letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Include at least one uppercase letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters."),
  phone: z.string().trim().max(32, "Phone number is too long.").optional().default(""),
});

export const onboardingOrgSchema = z.object({
  businessName: z.string().trim().min(2, "Business name must be at least 2 characters."),
  categorySlug: z.string().trim().min(2, "Select a business category."),
  country: z.string().trim().min(2, "Country is required."),
  currency: z.string().trim().min(3).max(5),
  timezone: z.string().trim().min(2, "Timezone is required."),
  addressLine: z.string().trim().max(240).optional().default(""),
  city: z.string().trim().max(100).optional().default(""),
  contactEmail: z
    .string()
    .trim()
    .email("Enter a valid contact email.")
    .or(z.literal(""))
    .optional()
    .default(""),
  contactPhone: z.string().trim().max(32).optional().default(""),
  logoPath: z.string().trim().nullable().optional().default(null),
});

export const businessSettingsUpdateSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID."),
  businessName: z.string().trim().min(2),
  businessType: z.string().trim().min(2).max(80),
  primaryCategorySlug: z.string().trim().min(2),
  country: z.string().trim().min(2),
  currency: z.string().trim().min(3).max(5),
  timezone: z.string().trim().min(2),
  addressLine: z.string().trim().max(240).optional().default(""),
  city: z.string().trim().max(100).optional().default(""),
  contactEmail: z
    .string()
    .trim()
    .email()
    .or(z.literal(""))
    .optional()
    .default(""),
  contactPhone: z.string().trim().max(32).optional().default(""),
  inventoryModel: z.enum(["fifo", "weighted_average", "specific_batch"]),
  financialYearStartMonth: z.number().int().min(1).max(12),
  allowNegativeStock: z.boolean(),
  vatRegistered: z.boolean(),
  defaultSalesTaxPct: z.number().min(0).max(100),
  taxAssumptionsNote: z.string().trim().max(400).optional().default(""),
});

export const customAttributeCreateSchema = z.object({
  organizationId: z.string().uuid(),
  categoryId: z.string().uuid(),
  key: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_]+$/, "Key must use lowercase letters, numbers, and underscores."),
  label: z.string().trim().min(2).max(80),
  dataType: z.enum(["text", "number", "select", "boolean", "date"]),
  options: z.array(z.string().trim().min(1)).optional().default([]),
  unit: z.string().trim().max(20).nullable().optional().default(null),
  isRequired: z.boolean().optional().default(false),
});

export const customCategoryCreateSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional().default(""),
});

export const memberRoleUpdateSchema = z.object({
  organizationId: z.string().uuid(),
  memberId: z.string().uuid(),
  roleKey: z.enum([
    "owner",
    "admin",
    "manager",
    "accountant",
    "inventory_manager",
    "salesperson",
    "viewer",
  ]),
});

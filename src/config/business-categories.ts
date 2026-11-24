export interface CategoryAttributeDefinition {
  key: string;
  label: string;
  dataType: "text" | "number" | "select" | "boolean" | "date";
  options?: string[];
  required?: boolean;
  unit?: string;
}

export interface BusinessCategorySchema {
  slug: string;
  name: string;
  description: string;
  icon: string;
  attributes: CategoryAttributeDefinition[];
}

export const BUSINESS_CATEGORY_SCHEMAS: BusinessCategorySchema[] = [
  {
    slug: "perfume-fragrance",
    name: "Perfume & Fragrance",
    description:
      "Luxury perfume, attar, and KSA-to-BD import retail with notes, concentration, batch, and authenticity attributes.",
    icon: "Sparkles",
    attributes: [
      { key: "perfume_name", label: "Perfume Name", dataType: "text", required: true },
      { key: "volume_ml", label: "Volume (ml)", dataType: "number", unit: "ml", required: true },
      {
        key: "concentration",
        label: "Concentration",
        dataType: "select",
        options: ["EDP", "EDT", "EDC", "Extrait", "Attar / Oil"],
        required: true,
      },
      {
        key: "fragrance_family",
        label: "Fragrance Family",
        dataType: "select",
        options: ["Amber / Oriental", "Woody", "Oud", "Floral", "Fresh / Aquatic", "Gourmand"],
      },
      { key: "top_notes", label: "Top Notes", dataType: "text" },
      { key: "middle_notes", label: "Middle Notes", dataType: "text" },
      { key: "base_notes", label: "Base Notes", dataType: "text" },
      {
        key: "gender_audience",
        label: "Gender / Audience",
        dataType: "select",
        options: ["Unisex", "Men", "Women"],
      },
      { key: "country_of_origin", label: "Country of Origin", dataType: "text" },
      { key: "batch_number", label: "Batch Number", dataType: "text" },
      {
        key: "authenticity_status",
        label: "Authenticity Status",
        dataType: "select",
        options: ["Pending Review", "Supplier Invoice Verified", "Sample / Unverified"],
      },
    ],
  },
  {
    slug: "fashion-clothing",
    name: "Fashion & Clothing",
    description: "Apparel, footwear, and seasonal collections.",
    icon: "Shirt",
    attributes: [
      { key: "size", label: "Size", dataType: "text", required: true },
      { key: "color", label: "Color", dataType: "text", required: true },
      { key: "material", label: "Material", dataType: "text" },
      { key: "collection", label: "Collection", dataType: "text" },
    ],
  },
  {
    slug: "electronics",
    name: "Electronics",
    description: "Devices, gadgets, and warranty-tracked SKUs.",
    icon: "Cpu",
    attributes: [
      { key: "manufacturer", label: "Manufacturer", dataType: "text", required: true },
      { key: "model", label: "Model", dataType: "text", required: true },
      { key: "serial_number", label: "Serial Number", dataType: "text" },
      { key: "warranty_months", label: "Warranty (Months)", dataType: "number", unit: "months" },
      { key: "specifications", label: "Specifications", dataType: "text" },
    ],
  },
  {
    slug: "cosmetics-skincare",
    name: "Cosmetics & Skincare",
    description: "Beauty, dermatology, and personal care items.",
    icon: "Droplets",
    attributes: [
      { key: "skin_type", label: "Skin Type", dataType: "select", options: ["All", "Oily", "Dry", "Sensitive", "Combination"] },
      { key: "net_weight", label: "Net Weight / Volume", dataType: "text" },
      { key: "shade", label: "Shade / Variant", dataType: "text" },
      { key: "shelf_life_months", label: "Shelf Life (Months)", dataType: "number", unit: "months" },
    ],
  },
  {
    slug: "grocery-retail",
    name: "Grocery & Retail",
    description: "Supermarket and fast-moving consumer goods.",
    icon: "ShoppingBasket",
    attributes: [
      { key: "pack_size", label: "Pack Size", dataType: "text", required: true },
      { key: "storage_type", label: "Storage Requirement", dataType: "select", options: ["Ambient", "Chilled", "Frozen"] },
      { key: "shelf_life_days", label: "Shelf Life (Days)", dataType: "number", unit: "days" },
    ],
  },
  {
    slug: "food-beverage",
    name: "Food & Beverage",
    description: "Packaged foods, specialty beverages, and cafe inventory.",
    icon: "Utensils",
    attributes: [
      { key: "flavor", label: "Flavor / Roast", dataType: "text" },
      { key: "serving_size", label: "Serving / Net Weight", dataType: "text" },
      { key: "halal_certified", label: "Halal Certified", dataType: "boolean" },
    ],
  },
  {
    slug: "wholesale-distribution",
    name: "Wholesale Distribution",
    description: "B2B bulk distribution and dealer supply.",
    icon: "Boxes",
    attributes: [
      { key: "case_pack_qty", label: "Units per Carton", dataType: "number", required: true },
      { key: "moq_units", label: "Minimum Order Qty", dataType: "number" },
      { key: "pallet_weight_kg", label: "Carton Weight (kg)", dataType: "number", unit: "kg" },
    ],
  },
  {
    slug: "import-export",
    name: "Import & Export",
    description: "Cross-border procurement and customs-classified goods.",
    icon: "PlaneLanding",
    attributes: [
      { key: "hs_code", label: "HS Code", dataType: "text" },
      { key: "origin_country", label: "Origin Country", dataType: "text" },
      { key: "incoterm", label: "Incoterm", dataType: "select", options: ["FOB", "CIF", "EXW", "DDP", "DAP"] },
    ],
  },
  {
    slug: "general-retail",
    name: "General Retail",
    description: "Multi-line storefront and general merchandise.",
    icon: "Store",
    attributes: [
      { key: "variant", label: "Variant", dataType: "text" },
      { key: "color", label: "Color", dataType: "text" },
    ],
  },
  {
    slug: "custom-business",
    name: "Custom Business",
    description: "Configure your own custom product attributes per SKU.",
    icon: "Sliders",
    attributes: [],
  },
];

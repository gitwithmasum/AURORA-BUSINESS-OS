export function formatCurrency(
  amount: number,
  currency: "BDT" | "SAR" | "USD" = "BDT"
): string {
  if (currency === "BDT") {
    return `৳${amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "SAR" ? 2 : 0,
  }).format(amount);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number, showSign = true): string {
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

const CATEGORY_LABELS: Record<string, string> = {
  "perfume-fragrance": "Perfume & Fragrance",
  "import-export": "Import & Export",
  "fashion-clothing": "Fashion & Clothing",
  "electronics-gadgets": "Electronics & Gadgets",
  "cosmetics-beauty": "Cosmetics & Beauty",
};

/** Format a business category slug into a display-ready label. */
export function formatCategoryLabel(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return "General Business";
  if (CATEGORY_LABELS[normalized]) return CATEGORY_LABELS[normalized];
  return normalized
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

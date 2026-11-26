import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AURORA BUSINESS OS",
    short_name: "AURORA",
    description:
      "Glassmorphism Business Management, KSA to Bangladesh Import ERP & AI Analytics Platform.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#06141b",
    theme_color: "#06141b",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Sales Register",
        short_name: "Sales",
        description: "Open quick sales and daily register",
        url: "/sales",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Inventory Control",
        short_name: "Inventory",
        description: "Manage multi-warehouse stock and batches",
        url: "/inventory",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Finance & P&L",
        short_name: "Finance",
        description: "Inspect profit & loss and cash flow",
        url: "/finance",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "AI Assistant",
        short_name: "AI Insights",
        description: "Query business intelligence insights",
        url: "/ai-assistant",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}

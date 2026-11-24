import type { ThemeId, ThemePalette } from "@/types/theme";

export const AURORA_THEMES: Record<ThemeId, ThemePalette> = {
  "midnight-blue": {
    id: "midnight-blue",
    name: "Midnight Blue",
    subtitle: "Primary Dark Glass",
    mode: "dark",
    colors: {
      background: "#06141B",
      surface: "#11212D",
      secondarySurface: "#253745",
      mutedAccent: "#4A5C6A",
      lightAccent: "#9BA8AB",
      primaryText: "#CCD0CF",
      highlight: "#60A5FA",
    },
    swatches: ["#06141B", "#11212D", "#253745", "#9BA8AB"],
  },
  "emerald-aurora": {
    id: "emerald-aurora",
    name: "Emerald Aurora",
    subtitle: "Botanical Luxury Glass",
    mode: "dark",
    colors: {
      background: "#051F20",
      surface: "#0B2B26",
      secondarySurface: "#163832",
      mutedAccent: "#235347",
      lightAccent: "#8EB69B",
      primaryText: "#DAF1DE",
      highlight: "#8EB69B",
    },
    swatches: ["#051F20", "#0B2B26", "#235347", "#8EB69B"],
  },
  "light-glass": {
    id: "light-glass",
    name: "Light Glass",
    subtitle: "Frosted Daylight",
    mode: "light",
    colors: {
      background: "#F1F7F7",
      surface: "#D5E5E5",
      secondarySurface: "#DDD3D3",
      mutedAccent: "#BDD7D8",
      lightAccent: "#F7CBCA",
      primaryText: "#5D6B6B",
      highlight: "#E09F9D",
    },
    swatches: ["#F1F7F7", "#D5E5E5", "#F7CBCA", "#5D6B6B"],
  },
};

export const THEME_LIST: ThemePalette[] = Object.values(AURORA_THEMES);

export const DEFAULT_THEME_ID: ThemeId = "midnight-blue";

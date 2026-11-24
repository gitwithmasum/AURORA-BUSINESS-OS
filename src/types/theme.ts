export type ThemeId = "midnight-blue" | "emerald-aurora" | "light-glass";

export type LanguageCode = "en" | "bn";

export interface ThemePalette {
  id: ThemeId;
  name: string;
  subtitle: string;
  mode: "dark" | "light";
  colors: {
    background: string;
    surface: string;
    secondarySurface: string;
    mutedAccent: string;
    lightAccent: string;
    primaryText: string;
    highlight: string;
  };
  swatches: [string, string, string, string];
}

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AURORA_THEMES, DEFAULT_THEME_ID } from "@/lib/theme/themes";
import type { LanguageCode, ThemeId, ThemePalette } from "@/types/theme";

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemePalette;
  setThemeId: (id: ThemeId) => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = "aurora_os_theme";
const LANG_STORAGE_KEY = "aurora_os_language";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
      if (savedTheme && savedTheme in AURORA_THEMES) {
        setThemeIdState(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
      } else {
        document.documentElement.setAttribute("data-theme", DEFAULT_THEME_ID);
      }

      const savedLang = localStorage.getItem(LANG_STORAGE_KEY) as LanguageCode | null;
      if (savedLang === "en" || savedLang === "bn") {
        setLanguageState(savedLang);
      }
    } catch {
      document.documentElement.setAttribute("data-theme", DEFAULT_THEME_ID);
    }
  }, []);

  const setThemeId = (id: ThemeId) => {
    setThemeIdState(id);
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      // Ignore storage write errors in restricted contexts
    }
  };

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage write errors
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        theme: AURORA_THEMES[themeId],
        setThemeId,
        language,
        setLanguage,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ThemeValues {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  font: string;
  fontSize: "small" | "medium" | "large";
  borderRadius: "sharp" | "medium" | "rounded";
  mode: "light" | "dark";
  logoUrl: string | null;
  logoIconUrl: string | null;
  companyName: string;
  appName: string;
  clientLayout: "classic" | "modern" | "minimal";
  advisorLayout: "classic" | "modern" | "minimal";
  customWelcomeText: string | null;
  loginSlug: string | null;
  customLoginTitle: string | null;
  customLoginSubtitle: string | null;
  logoSize: number;
  logoShape: "original" | "square" | "circle";
  logoPosition: "sidebar_top" | "sidebar_center" | "above_nav";
}

const defaultTheme: ThemeValues = {
  primary: "#2563EB",
  secondary: "#1E40AF",
  accent: "#10B981",
  background: "#F8FAFC",
  font: "Inter",
  fontSize: "medium",
  borderRadius: "medium",
  mode: "light",
  logoUrl: null,
  logoIconUrl: null,
  companyName: "FinAdvisor",
  appName: "FinAdvisor",
  clientLayout: "classic",
  advisorLayout: "classic",
  customWelcomeText: null,
  loginSlug: null,
  customLoginTitle: null,
  customLoginSubtitle: null,
  logoSize: 40,
  logoShape: "original",
  logoPosition: "sidebar_top",
};

interface ThemeContextValue {
  theme: ThemeValues;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: defaultTheme, isLoading: true });

export function useTheme() {
  return useContext(ThemeContext).theme;
}

export function useThemeLoading() {
  return useContext(ThemeContext).isLoading;
}

const BORDER_RADIUS_MAP = { sharp: "4px", medium: "8px", rounded: "16px" };
const FONT_SIZE_MAP = { small: "14px", medium: "16px", large: "18px" };

function applyThemeToDOM(t: ThemeValues) {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", t.primary);
  root.style.setProperty("--color-secondary", t.secondary);
  root.style.setProperty("--color-accent", t.accent);
  root.style.setProperty("--color-background", t.background);
  root.style.setProperty("--font-family", t.font + ", sans-serif");
  root.style.setProperty("--border-radius", BORDER_RADIUS_MAP[t.borderRadius]);
  root.style.setProperty("--font-size-base", FONT_SIZE_MAP[t.fontSize]);

  // Load Google Font
  const fontLink = document.getElementById("theme-font") as HTMLLinkElement | null;
  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(t.font)}:wght@400;500;600;700&display=swap`;
  if (fontLink) {
    fontLink.href = fontUrl;
  } else {
    const link = document.createElement("link");
    link.id = "theme-font";
    link.rel = "stylesheet";
    link.href = fontUrl;
    document.head.appendChild(link);
  }

  // TODO: Dark mode bude implementován později
  // Vždy light mode — odstraň dark class pokud existuje
  root.classList.remove("dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeValues>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Immediately ensure light mode is the default — remove any stale "dark" class
    document.documentElement.classList.remove("dark");

    async function loadTheme() {
      try {
        const supabase = createClient();

        const userResult = await Promise.race([
          supabase.auth.getUser(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
        if (!userResult || !("data" in userResult)) { setIsLoading(false); return; }
        const user = userResult.data.user;
        if (!user) { setIsLoading(false); return; }

        // Try client first, then advisor
        const { data: client } = await supabase
          .from("clients")
          .select("advisor_id")
          .eq("user_id", user.id)
          .single();

        let advisorId: string | null = null;
        if (client) {
          advisorId = client.advisor_id;
        } else {
          const { data: advisor } = await supabase
            .from("advisors")
            .select("id")
            .eq("user_id", user.id)
            .single();
          if (advisor) advisorId = advisor.id;
        }

        if (!advisorId) { setIsLoading(false); return; }

        const { data: advisor } = await supabase
          .from("advisors")
          .select("company_name, app_name, logo_url, logo_icon_url, brand_primary, brand_secondary, brand_accent_color, brand_background, brand_font, brand_font_size, brand_border_radius, brand_mode, client_layout, advisor_layout, custom_welcome_text, login_slug, custom_login_title, custom_login_subtitle, logo_size, logo_shape, logo_position")
          .eq("id", advisorId)
          .single();
        if (!advisor) { setIsLoading(false); return; }

        const t: ThemeValues = {
          primary: advisor.brand_primary || defaultTheme.primary,
          secondary: advisor.brand_secondary || defaultTheme.secondary,
          accent: advisor.brand_accent_color || defaultTheme.accent,
          background: advisor.brand_background || defaultTheme.background,
          font: advisor.brand_font || defaultTheme.font,
          fontSize: (advisor.brand_font_size as ThemeValues["fontSize"]) || defaultTheme.fontSize,
          borderRadius: (advisor.brand_border_radius as ThemeValues["borderRadius"]) || defaultTheme.borderRadius,
          mode: "light", // TODO: dark mode bude implementován později
          logoUrl: advisor.logo_url || null,
          logoIconUrl: advisor.logo_icon_url || null,
          companyName: advisor.company_name || "FinAdvisor",
          appName: advisor.app_name || advisor.company_name || "FinAdvisor",
          clientLayout: (advisor.client_layout as ThemeValues["clientLayout"]) || defaultTheme.clientLayout,
          advisorLayout: (advisor.advisor_layout as ThemeValues["advisorLayout"]) || defaultTheme.advisorLayout,
          customWelcomeText: advisor.custom_welcome_text || null,
          loginSlug: advisor.login_slug || null,
          customLoginTitle: advisor.custom_login_title || null,
          customLoginSubtitle: advisor.custom_login_subtitle || null,
          logoSize: advisor.logo_size || 40,
          logoShape: (advisor.logo_shape as ThemeValues["logoShape"]) || "original",
          logoPosition: (advisor.logo_position as ThemeValues["logoPosition"]) || "sidebar_top",
        };
        setTheme(t);
        applyThemeToDOM(t);
      } finally {
        setIsLoading(false);
      }
    }
    loadTheme();

    // Safety timeout — never show loading spinner for more than 3 seconds
    const safetyTimeout = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(safetyTimeout);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

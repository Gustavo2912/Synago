import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

interface Branding {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  organization_name: string;
}

interface BrandingContextType {
  branding: Branding | null;
  isLoading: boolean;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ⬅ אחרי התיקון ב-useUserRole:
  const { organizationId } = useUserRole();

  const fetchBranding = async () => {
    setIsLoading(true);

    if (!organizationId) {
      setBranding(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("name, logo_url, primary_color, secondary_color, accent_color, font_family")
        .eq("id", organizationId)
        .single();

      if (error) throw error;

      setBranding({
        logo_url: data.logo_url,
        primary_color: data.primary_color || "#8B5CF6",
        secondary_color: data.secondary_color || "#EC4899",
        accent_color: data.accent_color || "#10B981",
        font_family: data.font_family || "Inter",
        organization_name: data.name,
      });
    } catch (error) {
      console.error("Error fetching branding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, [organizationId]);

  // 🎨 החלפת צבעים ב-CSS
  useEffect(() => {
    if (!branding) return;

    const root = document.documentElement;

    const hexToHSL = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return "0 0% 0%";

      const r = parseInt(result[1], 16) / 255;
      const g = parseInt(result[2], 16) / 255;
      const b = parseInt(result[3], 16) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);

      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    root.style.setProperty("--primary", hexToHSL(branding.primary_color));
    root.style.setProperty("--secondary", hexToHSL(branding.secondary_color));
    root.style.setProperty("--accent", hexToHSL(branding.accent_color));
    root.style.setProperty("font-family", `${branding.font_family}, sans-serif`);
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, isLoading, refreshBranding: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used within BrandingProvider");
  return ctx;
}

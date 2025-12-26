import { createContext, useContext, useState, ReactNode, useEffect } from "react";

// נטען קבצי JSON
import en from "@/locales/en.json";
import he from "@/locales/he.json";

type Language = "he" | "en";
type Currency = "USD" | "ILS";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: "rtl" | "ltr";
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  currencySymbol: string;
}

const translations = {
  en,
  he,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("language") as Language | null;
      return saved === "he" || saved === "en" ? saved : "en";
    } catch {
      return "en";
    }
  });

  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem("currency") as Currency | null;
      return saved === "USD" || saved === "ILS" ? saved : "USD";
    } catch {
      return "USD";
    }
  });

  // פונקציית תרגום
  const t = (key: string): string => {
    return translations[language]?.[key] || key;
  };

  const dir = language === "he" ? "rtl" : "ltr";
  const currencySymbol = currency === "ILS" ? "₪" : "$";

  /* -----------------------------------------------------
     EFFECT — Update <html> direction + lang + RTL class
  ----------------------------------------------------- */
  useEffect(() => {
    const html = document.documentElement;

    html.setAttribute("dir", dir);
    html.setAttribute("lang", language);

    // ניהול class של RTL
    if (language === "he") {
      html.classList.add("rtl");
    } else {
      html.classList.remove("rtl");
    }

    localStorage.setItem("language", language);
  }, [language, dir]);

  // שמירת המטבע
  useEffect(() => {
    localStorage.setItem("currency", currency);
  }, [currency]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        dir,
        currency,
        setCurrency,
        currencySymbol,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

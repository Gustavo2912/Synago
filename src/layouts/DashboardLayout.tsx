// src/layouts/DashboardLayout.tsx

import { useUser } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import AppSidebar from "@/components/AppSidebar";
import { Navigate } from "react-router-dom";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userLoading, user, organizationId } = useUser();
  const { language } = useLanguage();

  // Loading UI
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // No session
  if (!user) return <Navigate to="/auth" replace />;

  // User exists but organization not set yet
  if (!organizationId) return <Navigate to="/register" replace />;

  return (
    <div
      className={`
        flex min-h-screen
        ${language === "he" ? "flex-row-reverse" : "flex-row"}
      `}
    >
      {/* Sidebar with side based on language */}
      <AppSidebar side={language === "he" ? "right" : "left"} />

      <main className="flex-1 p-6 overflow-y-auto bg-background/60 backdrop-blur">
        {children}
      </main>
    </div>
  );
}

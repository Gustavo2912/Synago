import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { OrgSwitcher } from "@/components/OrgSwitcher";

import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { UserProvider, useUser } from "@/contexts/UserContext";

import ProtectedRoute from "@/components/ProtectedRoute";
import OrganizationGuard from "@/components/OrganizationGuard";

/* Pages */
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Register from "@/pages/Register";
import InviteAcceptPage from "@/pages/InviteAcceptPage"; // ✅ NEW

import HomePage from "@/pages/home/HomePage";
import Dashboard from "@/pages/Dashboard";
import Organizations from "@/pages/Organizations";
import Users from "@/pages/Users";
import Campaigns from "@/pages/Campaigns";
import CampaignProfile from "@/pages/CampaignProfile";
import Donors from "@/pages/Donors";
import DonorProfile from "@/pages/DonorProfile";
import Donations from "@/pages/Donations";
import Pledges from "@/pages/Pledges";
import Payments from "@/pages/Payments";
import Yahrzeits from "@/pages/Yahrzeits";
import TorahScholar from "@/pages/TorahScholar";
import ComCom from "@/pages/ComCom";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

/* -----------------------------------------------------
   DASHBOARD LAYOUT
----------------------------------------------------- */
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { t, language } = useLanguage();
  const { userLoading, user, roles, organizationId, isGlobalSuperAdmin } =
    useUser();

  if (userLoading) {
    return <div className="p-6">Loading user…</div>;
  }

  const roleLabel = isGlobalSuperAdmin
    ? "super_admin"
    : roles.find((r) => r.organization_id === organizationId)?.role || "member";

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <div
          className={`min-h-screen flex w-full bg-gradient-subtle ${
            language === "he" ? "rtl" : ""
          }`}
        >
          <AppSidebar />

          <div className="flex-1 flex flex-col">
            <header className="h-16 border-b border-border/50 bg-card/95 backdrop-blur-xl flex items-center px-6 sticky top-0 z-10 gap-3 shadow-sm">
              <SidebarTrigger />

              <div className="flex flex-col">
                <h1 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent">
                  {t("app.title")}
                </h1>
                {user && (
                  <span className="text-xs text-muted-foreground">
                    {user.email} · {roleLabel}
                  </span>
                )}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <OrgSwitcher />
                <LanguageToggle />
              </div>
            </header>

            <div className="flex-1">
              <OrganizationGuard>{children}</OrganizationGuard>
            </div>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
};

/* -----------------------------------------------------
   APP ROOT
----------------------------------------------------- */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <UserProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <Routes>
            {/* -------- Public -------- */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />

            {/* ✅ INVITE ACCEPT FLOW */}
            <Route path="/invite/accept" element={<InviteAcceptPage />} />

            {/* -------- Home -------- */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HomePage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* -------- Dashboard -------- */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute permission="view_dashboard">
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* -------- Organizations -------- */}
            <Route
              path="/organizations"
              element={
                <ProtectedRoute permission="manage_organizations">
                  <DashboardLayout>
                    <Organizations />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* -------- Users -------- */}
            <Route
              path="/users"
              element={
                <ProtectedRoute permission="manage_users">
                  <DashboardLayout>
                    <Users />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* -------- 404 -------- */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;

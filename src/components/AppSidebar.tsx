// src/components/AppSidebar.tsx

import {
  Home,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  FileText,
  Building2,
  UserCog,
  Target,
  Calendar,
  GraduationCap,
  Wallet,
  HandCoins,
  Megaphone,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";

export function AppSidebar() {
  const { state } = useSidebar();
  const { t, language } = useLanguage();
  const { permissions, userLoading, user, setOrganizationId } = useUser();
  const navigate = useNavigate();

  if (userLoading || !user) return null;

  /** RTL */
  const side = language === "he" ? "right" : "left";

  /** Logout */
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setOrganizationId(null);
      localStorage.removeItem("supabase.auth.token");
      localStorage.removeItem("activeOrganizationId");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Error signing out");
    }
  };

  /** MENU */
  const MENU_ORDER = [
    {
      key: "view_home_page",
      title: "sidebar.home",
      icon: Home,
      url: "/home",
      alwaysShow: true,
    },

    { key: "view_dashboard", title: "sidebar.dashboard", icon: LayoutDashboard, url: "/dashboard" },

    { key: "manage_organizations", title: "sidebar.organizations", icon: Building2, url: "/organizations" },

    { key: "manage_users", title: "sidebar.team", icon: UserCog, url: "/users" },

    { key: "view_campaigns", title: "sidebar.campaigns", icon: Target, url: "/campaigns" },

    { key: "view_donors", title: "sidebar.donors", icon: Users, url: "/donors" },

    { key: "view_donations", title: "sidebar.donations", icon: HandCoins, url: "/donations" },

    { key: "view_pledges", title: "sidebar.pledges", icon: FileText, url: "/pledges" },

    { key: "view_payments", title: "sidebar.payments", icon: Wallet, url: "/payments" },

    { key: "view_yahrzeits", title: "sidebar.yahrzeits", icon: Calendar, url: "/yahrzeits" },

    { key: "view_torah_scholar", title: "sidebar.torahScholar", icon: GraduationCap, url: "/torah-scholar" },

    { key: "view_comcom", title: "sidebar.comcom", icon: Megaphone, url: "/comcom" },

    { key: "view_settings", title: "sidebar.settings", icon: Settings, url: "/settings" },
  ];

  return (
    <Sidebar
      collapsible="icon"
      side={side}
      className={cn(
        "bg-card/95 backdrop-blur-xl z-50",
        side === "left" ? "border-r" : "border-l",
        "border-border/50",
        language === "he" && "rtl"
      )}
    >
      <SidebarContent className="pt-8">
        <SidebarGroup>
          <SidebarGroupLabel>{t("app.title")}</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {MENU_ORDER.map((item) => {
                if (!item.alwaysShow && !permissions[item.key]) return null;

                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild tooltip={t(item.title)}>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-accent/50",
                            isActive && "bg-accent text-accent-foreground",
                            language === "he" && "flex-row-reverse text-right"
                          )
                        }
                      >
                        <Icon className="h-5 w-5" />
                        <span>{t(item.title)}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sign Out */}
        <div className="mt-auto p-4">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start hover:bg-accent/50",
              language === "he" && "flex-row-reverse text-right"
            )}
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            {state === "expanded" && <span className="ml-2">{t("sidebar.signOut")}</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

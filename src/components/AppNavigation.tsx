import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";

import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  GraduationCap,
  UserCog,
  Building2,
  Calendar,
  Settings,
} from "lucide-react";

// ------------------------------------------------------
// הרשאות לפי תפקיד
// ------------------------------------------------------
const PERMISSIONS = {
  admin: {
    dashboard: true,
    donors: true,
    pledges: true,
    campaigns: true,
    yahrzeits: true,
    torahScholar: true,
    team: true,
    organizations: false, // סופר אדמין בלבד
    settings: true,
  },
  manager: {
    dashboard: true,
    donors: true,
    pledges: true,
    campaigns: true,
    yahrzeits: true,
    torahScholar: true,
    team: true,
    organizations: false,
    settings: false,
  },
  accountant: {
    dashboard: true,
    donors: false,
    pledges: true,
    campaigns: false,
    yahrzeits: false,
    torahScholar: false,
    team: false,
    organizations: false,
    settings: false,
  },
  member: {
    dashboard: false,
    donors: false,
    pledges: false,
    campaigns: false,
    yahrzeits: false,
    torahScholar: false,
    team: false,
    organizations: false,
    settings: false,
  },
  donor: {
    dashboard: false,
    donors: false,
    pledges: false,
    campaigns: false,
    yahrzeits: false,
    torahScholar: false,
    team: false,
    organizations: false,
    settings: false,
  },
};

// ------------------------------------------------------
// מבנה תפריט בסיסי
// ------------------------------------------------------
const MENU_ITEMS = [
  { key: "dashboard", title: "sidebar.dashboard", url: "/dashboard", icon: LayoutDashboard },

  { key: "donors", title: "sidebar.donors", url: "/donors", icon: Users },
  { key: "pledges", title: "sidebar.pledges", url: "/pledges", icon: FileText },
  { key: "campaigns", title: "sidebar.campaigns", url: "/campaigns", icon: Target },

  { key: "yahrzeits", title: "Yahrzeits", url: "/yahrzeits", icon: Calendar },

  { key: "torahScholar", title: "Support Torah Scholar", url: "/torah-scholar", icon: GraduationCap },

  // settings – תמיד בסוף
  { key: "settings", title: "sidebar.settings", url: "/settings", icon: Settings },
];

export default function AppNavigation() {
  const { t } = useLanguage();
  const { role, isSuperAdmin, isSynagogueAdmin } = useUserRole();

  const userPermissions = PERMISSIONS[role] || PERMISSIONS.member;

  // ------------------------------------------------------
  // פונקציית רינדור של כל פריט בתפריט
  // ------------------------------------------------------
  const renderItem = (item: any) => {
    if (!userPermissions[item.key]) return null;

    return (
      <NavLink
        key={item.key}
        to={item.url}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-accent/50 cursor-pointer",
            isActive && "bg-accent text-accent-foreground"
          )
        }
      >
        <item.icon className="h-5 w-5" />
        <span>{t(item.title) || item.title}</span>
      </NavLink>
    );
  };

  return (
    <div className="space-y-1">
      {MENU_ITEMS.map(renderItem)}

      {/* ----------------------- */}
      {/* Team – רק למנהלים ואדמין */}
      {/* ----------------------- */}
      {(isSynagogueAdmin || isSuperAdmin) && (
        <NavLink
          to="/users"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-accent/50 cursor-pointer",
              isActive && "bg-accent text-accent-foreground"
            )
          }
        >
          <UserCog className="h-5 w-5" />
          <span>Team</span>
        </NavLink>
      )}

      {/* ----------------------- */}
      {/* Organizations – רק לסופר אדמין */}
      {/* ----------------------- */}
      {isSuperAdmin && (
        <NavLink
          to="/organizations"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-accent/50 cursor-pointer",
              isActive && "bg-accent text-accent-foreground"
            )
          }
        >
          <Building2 className="h-5 w-5" />
          <span>Organizations</span>
        </NavLink>
      )}
    </div>
  );
}

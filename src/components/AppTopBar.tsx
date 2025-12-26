import { useUser } from "@/contexts/UserContext";
import { Building2, Shield, User } from "lucide-react";

export function AppTopBar() {
  const { user, roles, primaryRole, isGlobalSuperAdmin, organizationId } = useUser();

  const activeRole = isGlobalSuperAdmin ? "super_admin" : primaryRole;
  const profile = roles.find(r => r.organization_id === organizationId) || null;

  return (
    <div className="w-full px-6 py-3 border-b bg-white flex items-center justify-between">
      {/* Left */}
      <div className="flex items-center gap-3">
        <User className="w-5 h-5 text-muted-foreground" />
        <div className="leading-tight">
          <div className="font-medium">
            {user?.email ?? "Unknown user"}
          </div>
          <div className="text-xs text-muted-foreground">
            {activeRole}
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm">
          {organizationId || "No organization"}
        </span>
      </div>
    </div>
  );
}

// src/components/OrgSwitcher.tsx

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { Building2 } from "lucide-react";

type OrgRow = {
  id: string;
  name: string | null;
};

export function OrgSwitcher() {
  const {
    user,
    userLoading,
    roles,
    isGlobalSuperAdmin,
    organizationId,
    setOrganizationId,
  } = useUser();

  if (userLoading || !user) return null;

  // איסוף הארגונים שהמשתמש שייך אליהם
  const roleOrgIds = useMemo(
    () =>
      Array.from(
        new Set(
          roles
            .map((r) => r.organization_id)
            .filter((id): id is string => !!id)
        )
      ),
    [roles]
  );

  const { data: organizations = [] } = useQuery<OrgRow[]>({
    queryKey: [
      "org-switcher-organizations",
      isGlobalSuperAdmin,
      roleOrgIds.join(","),
    ],
    enabled: isGlobalSuperAdmin || roleOrgIds.length > 0,
    queryFn: async () => {
      if (isGlobalSuperAdmin) {
        const { data, error } = await supabase
          .from("organizations")
          .select("id, name")
          .order("name", { ascending: true });

        if (error) throw error;
        return data || [];
      }

      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", roleOrgIds);

      if (error) throw error;
      return data || [];
    },
  });

  if (!organizations || organizations.length === 0) return null;

  // רשימת אופציות כולל "All"
  const options = isGlobalSuperAdmin
    ? [{ id: "all", name: "All Organizations" }, ...organizations]
    : organizations;

  // ערך ברירת מחדל אם אין בחירה עדיין
  const currentValue =
    organizationId ??
    (isGlobalSuperAdmin ? "all" : organizations[0]?.id);

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />

      <Select
        value={currentValue}
        onValueChange={(value) => {
          setOrganizationId(value);
        }}
      >
        <SelectTrigger className="h-8 w-[220px] text-sm">
          <SelectValue placeholder="Select organization" />
        </SelectTrigger>

        <SelectContent>
          {options.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name || org.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

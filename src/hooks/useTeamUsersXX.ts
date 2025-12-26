// src/hooks/useTeamUsers.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export type RoleRow = {
  id: string;
  user_id: string;
  organization_id: string | null;
  role: string;
  suspended: boolean | null;
  organization_name?: string | null;
};

export type UserWithRoles = {
  user_id: string;

  // from users_profiles
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  status: string | null;
  avatar_url: string | null;

  created_at: string | null;
  updated_at: string | null;

  roles: RoleRow[];
};

export function useTeamUsers() {
  const { isGlobalSuperAdmin, organizationId } = useUser();

  return useQuery({
    queryKey: ["team-users", isGlobalSuperAdmin, organizationId],
    queryFn: async () => {
      // שליפת המשתמשים (מ users_profiles)
      let usersQuery = supabase
        .from("users_profiles")
        .select("*");

      // מנהל ארגון → רואה רק משתמשים ששייכים לארגון שלו
      if (!isGlobalSuperAdmin && organizationId) {
        // נביא רק משתמשים שיש להם role לארגון הנוכחי
        const { data: rolesData, error: rolesErr } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("organization_id", organizationId);

        if (rolesErr) throw rolesErr;

        const allowedUserIds = rolesData.map((r) => r.user_id);

        if (allowedUserIds.length === 0) return [];

        usersQuery = usersQuery.in("user_id", allowedUserIds);
      }

      const { data: users, error: usersErr } = await usersQuery;
      if (usersErr) throw usersErr;

      // Load roles for all users
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select(`
          id,
          user_id,
          organization_id,
          role,
          suspended,
          organizations (name)
        `);

      if (rolesErr) throw rolesErr;

      // Normalize roles
      const rolesNormalized = roles.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        role: r.role,
        organization_id: r.organization_id,
        suspended: r.suspended,
        organization_name: r.organizations?.name || null,
      }));

      // Merge profiles + roles
      const merged: UserWithRoles[] = users.map((u: any) => ({
        user_id: u.user_id,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        phone: u.phone,
        position: u.position,
        status: u.status,
        avatar_url: u.avatar_url,
        created_at: u.created_at,
        updated_at: u.updated_at,
        roles: rolesNormalized.filter((r) => r.user_id === u.user_id),
      }));

      return merged;
    },
  });
}

// src/hooks/useTeamUsers.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export type RoleRow = {
  id: string;
  user_id: string;
  organization_id: string | null;
  organization_name: string | null;
  role: string;
  suspended: boolean | null;
  created_at: string | null;
};

export type UserWithRoles = {
  user_id: string;

  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;

  // מה־view (אם תרצה להשתמש בהם בעתיד)
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;

  // לא חובה כרגע, משאירים לשימוש עתידי
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  roles: RoleRow[];
};

export function useTeamUsers() {
  const { isGlobalSuperAdmin, organizationId } = useUser();

  return useQuery<UserWithRoles[]>({
    queryKey: ["team-users", isGlobalSuperAdmin, organizationId],
    queryFn: async () => {
      // בסיס השאילתה מה־VIEW
      let query = supabase.from("team_users_view").select("*");

      // אם המשתמש אינו super admin → מציגים רק את הארגון הנוכחי
      if (!isGlobalSuperAdmin && organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []) as any[];

      // נבנה map לפי user_id כדי לאחד את כל ה־roles של אותו משתמש
      const byUser: Record<string, UserWithRoles> = {};

      for (const row of rows) {
        const uid = row.user_id as string;
        if (!byUser[uid]) {
          byUser[uid] = {
            user_id: uid,
            first_name: row.first_name ?? null,
            last_name: row.last_name ?? null,
            email: row.email ?? null,
            phone: row.phone ?? null,
            position: row.position ?? null,
            address: row.address ?? null,
            city: row.city ?? null,
            state: row.state ?? null,
            zip: row.zip ?? null,
            country: row.country ?? null,
            status: null,
            created_at: row.user_created_at ?? null,
            updated_at: row.user_updated_at ?? null,
            roles: [],
          };
        }

        // מוסיפים role אחד למשתמש
        byUser[uid].roles.push({
          id: row.role_id,
          user_id: uid,
          organization_id: row.organization_id ?? null,
          organization_name: row.organization_name ?? null,
          role: row.role,
          suspended: row.role_suspended ?? null,
          created_at: row.role_created_at ?? null,
        });
      }

      return Object.values(byUser);
    },
  });
}

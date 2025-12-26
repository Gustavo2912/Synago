// src/hooks/useManageDonor.ts
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";

export type DonorInput = {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address_city?: string | null;
  organizations: string[]; // רשימת ארגונים לשיוך
};

/* ---------------------------------------------------
   CREATE DONOR (עם שיוך לארגונים)
--------------------------------------------------- */
export function useCreateDonor() {
  const qc = useQueryClient();
  const { organizationId, isGlobalSuperAdmin } = useUser();

  return useMutation({
    mutationFn: async (input: DonorInput) => {
      // 1) יצירת תורם
      const { data: donor, error } = await supabase
        .from("donors")
        .insert({
          display_name: input.display_name,
          first_name: input.first_name,
          last_name: input.last_name,
          phone: input.phone,
          email: input.email,
          address_city: input.address_city,
        })
        .select("id")
        .single();

      if (error) throw error;

      const donorId = donor.id;

      // 2) שיוך לארגון הראשי (גם אם לא בחר ברשימה)
      await supabase.from("donor_organizations").insert({
        donor_id: donorId,
        organization_id: organizationId,
      });

      // 3) סופר אדמין יכול לשייך לעוד ארגונים
      if (isGlobalSuperAdmin && input.organizations.length > 0) {
        const inserts = input.organizations
          .filter((o) => o !== organizationId)
          .map((org) => ({
            donor_id: donorId,
            organization_id: org,
          }));

        if (inserts.length > 0) {
          await supabase.from("donor_organizations").insert(inserts);
        }
      }

      return donor;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["donors"] });
    },
  });
}

/* ---------------------------------------------------
   UPDATE DONOR (כולל עדכון שיוך לארגונים)
--------------------------------------------------- */
export function useUpdateDonor() {
  const qc = useQueryClient();
  const { isGlobalSuperAdmin } = useUser();

  return useMutation({
    mutationFn: async ({
      donorId,
      data,
    }: {
      donorId: string;
      data: DonorInput;
    }) => {
      // 1) עדכון פרטי תורם
      const { error } = await supabase
        .from("donors")
        .update({
          display_name: data.display_name,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          email: data.email,
          address_city: data.address_city,
        })
        .eq("id", donorId);

      if (error) throw error;

      // סופר אדמין בלבד יכול לעדכן שיוכים
      if (isGlobalSuperAdmin) {
        // מחיקת כל השיוכים עבור התורם
        await supabase
          .from("donor_organizations")
          .delete()
          .eq("donor_id", donorId);

        // הוספה מחדש לפי הבחירה
        const inserts = data.organizations.map((org) => ({
          donor_id: donorId,
          organization_id: org,
        }));

        if (inserts.length > 0) {
          await supabase.from("donor_organizations").insert(inserts);
        }
      }

      return true;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["donors"] });
    },
  });
}

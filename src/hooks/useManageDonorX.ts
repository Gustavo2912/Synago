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
  organizations: string[]; // ← רשימת ארגונים המשויכים לתורם
};

/* ---------------------------------------------------
   CREATE DONOR
---------------------------------------------------*/
export function useCreateDonor() {
  const qc = useQueryClient();
  const { organizationId } = useUser();

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

      // 2) שיוך לארגון המקים (חובה)
      await supabase.from("donor_organizations").insert({
        donor_id: donor.id,
        organization_id: organizationId,
      });

      // 3) שיוך לארגונים נוספים (רק ל-super_admin)
      for (const org of input.organizations) {
        if (org !== organizationId) {
          await supabase.from("donor_organizations").insert({
            donor_id: donor.id,
            organization_id: org,
          });
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
   UPDATE DONOR
---------------------------------------------------*/
export function useUpdateDonor() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      donorId,
      data,
    }: {
      donorId: string;
      data: DonorInput;
    }) => {
      // עדכון פרטים בסיסיים
      const { error } = await supabase.from("donors").update({
        display_name: data.display_name,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        email: data.email,
        address_city: data.address_city,
      }).eq("id", donorId);

      if (error) throw error;

      // TODO: כאן נעדכן גם donor_organizations — בחלק הבא C

      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["donors"] });
    },
  });
}

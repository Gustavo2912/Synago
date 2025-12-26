// src/hooks/usePayments.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

/* -------------------------------------------------------
   TYPES
------------------------------------------------------- */
export type Payment = {
  id: string;
  donor_id: string;
  organization_id: string;
  pledge_id: string | null;

  amount: number;
  method: string | null;
  reference_number: string | null;
  notes: string | null;

  created_at: string | null;
  date: string | null;
  currency: string | null;
  status: string | null;

  donor?: any;
  organization?: any;
  pledge?: any;

  donor_name?: string;
  donor_email?: string;
  donor_phone?: string;

  organization_name?: string | null;
};

/* -------------------------------------------------------
   FETCH ALL PAYMENTS (Supports super_admin + "all")
------------------------------------------------------- */
export function useAllPayments() {
  const { organizationId, isGlobalSuperAdmin } = useUser();

  return useQuery({
    queryKey: ["payments", organizationId],
    enabled: !!organizationId,

    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select(
          `
          *,
          donor:payments_donor_fk(
            id, first_name, last_name, display_name, email, phone
          ),
          organization:payments_org_fk(
            id, name
          ),
          pledge:payments_pledge_fk(
            id, total_amount, balance_owed, due_date
          )
        `
        )
        .order("date", { ascending: false });

      // Super admin: "all" = see everything
      if (isGlobalSuperAdmin) {
        if (organizationId !== "all") {
          query = query.eq("organization_id", organizationId);
        }
      } else {
        // Normal user — always filtered
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data) return [];

      return data.map((p: any) => ({
        ...p,

        donor_name:
          p.donor?.display_name ||
          `${p.donor?.first_name || ""} ${p.donor?.last_name || ""}`.trim(),

        donor_email: p.donor?.email || "",
        donor_phone: p.donor?.phone || "",

        organization_name: p.organization?.name || null,
      }));
    },
  });
}

/* -------------------------------------------------------
   CREATE PAYMENT
------------------------------------------------------- */
export async function createPayment(input: any): Promise<Payment> {
  const { data, error } = await supabase
    .from("payments")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data as Payment;
}

export function useCreatePayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createPayment,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["payments"] });

      if (vars?.donor_id) {
        qc.invalidateQueries({
          queryKey: ["payments-for-donor", vars.donor_id],
        });
      }

      if (vars?.pledge_id) {
        qc.invalidateQueries({
          queryKey: ["payments-for-pledge", vars.pledge_id],
        });
      }
    },
  });
}

/* -------------------------------------------------------
   DELETE PAYMENT
------------------------------------------------------- */
export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw error;
}

export function useDeletePayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

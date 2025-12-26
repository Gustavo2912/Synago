// src/hooks/usePaymentsForPledges.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

/**
 * pledgeIds:
 * - undefined → load ALL payments (Dashboard)
 * - array → load payments for those pledge_ids (DonorProfile)
 */
export function usePaymentsForPledges(pledgeIds?: string[]) {
  const { organizationId, isGlobalSuperAdmin } = useUser();

  const shouldFilterByOrg =
    !isGlobalSuperAdmin || (isGlobalSuperAdmin && organizationId !== "all");

  return useQuery({
    queryKey: ["payments-for-pledges", pledgeIds, organizationId],

    enabled:
      pledgeIds === undefined ||
      (Array.isArray(pledgeIds) && pledgeIds.length > 0),

    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select(
          `
          *,
          pledge:pledge_id (
            id, total_amount, balance_owed, due_date
          ),
          donor:donor_id (
            id, first_name, last_name, display_name, email, phone
          ),
          organization:organization_id (
            id, name
          )
        `
        )
        .order("date", { ascending: false });

      /* -------------------------------------------------------
         1. DASHBOARD MODE  (pledgeIds === undefined)
      ------------------------------------------------------- */
      if (!pledgeIds) {
        if (shouldFilterByOrg) {
          query = query.eq("organization_id", organizationId);
        }
      }

      /* -------------------------------------------------------
         2. DONOR PROFILE MODE  (pledgeIds = [...])
      ------------------------------------------------------- */
      else if (pledgeIds.length > 0) {
        query = query.in("pledge_id", pledgeIds);

        if (shouldFilterByOrg) {
          query = query.eq("organization_id", organizationId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const payments = data || [];

      // Group by pledge_id (used in DonorProfile)
      const paymentsByPledgeId: Record<string, any[]> = {};
      for (const p of payments) {
        const pid = p.pledge_id;
        if (!pid) continue;
        if (!paymentsByPledgeId[pid]) paymentsByPledgeId[pid] = [];
        paymentsByPledgeId[pid].push(p);
      }

      return { payments, paymentsByPledgeId };
    },
  });
}

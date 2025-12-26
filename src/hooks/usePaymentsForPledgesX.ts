// src/hooks/usePaymentsForPledges.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

/**
 * If pledgeIds = array → filter by pledge_id
 * If pledgeIds = undefined → load ALL payments for organization
 */
export function usePaymentsForPledges(pledgeIds?: string[]) {
  const { organizationId, isGlobalSuperAdmin } = useUser();

  return useQuery({
    queryKey: ["payments-for-pledges", pledgeIds, organizationId],

    // בדשבורד נטען הכל → enabled תמיד true
    // בפרופיל, טוענים רק כשיש donor+pledges → pledgeIds.length > 0
    enabled:
      pledgeIds === undefined ||
      (Array.isArray(pledgeIds) && pledgeIds.length > 0),

    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select(
          `
          *,
          pledge:pledge_id(*),
          donor:donor_id(*),
          organization:organization_id(id, name)
        `
        )
        .order("date", { ascending: false });

      const shouldFilterByOrg =
        !isGlobalSuperAdmin || (isGlobalSuperAdmin && organizationId !== "all");

      // 🎯 מצב 1: טעינת כל התשלומים (Dashboard)
      if (!pledgeIds) {
        if (shouldFilterByOrg && organizationId) {
          query = query.eq("organization_id", organizationId);
        }
      }

      // 🎯 מצב 2: טעינת תשלומים לפי pledgeIds (DonorProfile)
      else if (Array.isArray(pledgeIds) && pledgeIds.length > 0) {
        query = query.in("pledge_id", pledgeIds);

        if (shouldFilterByOrg && organizationId) {
          query = query.eq("organization_id", organizationId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const payments = data || [];

      // Group by pledge_id (used only in DonorProfile)
      const paymentsByPledgeId: Record<string, any[]> = {};
      payments.forEach((p: any) => {
        const pid = p.pledge_id;
        if (!pid) return;
        if (!paymentsByPledgeId[pid]) paymentsByPledgeId[pid] = [];
        paymentsByPledgeId[pid].push(p);
      });

      return { payments, paymentsByPledgeId };
    },
  });
}

// src/hooks/usePaymentsForPledges.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export function usePaymentsForPledges(donorId?: string) {
  const { organizationId, isGlobalSuperAdmin } = useUser();

  const enabled = donorId ? !!donorId : !!organizationId;

  return useQuery({
    queryKey: ["payments-for-pledges", donorId, organizationId],
    enabled,

    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select(`
          *,
          pledge:pledge_id(*),
          donor:donor_id(*),
          organization:organization_id(name)
        `);

      // 📌 אם donorId הועבר → סינון לפי תורם (DonorProfile)
      if (donorId) {
        query = query.eq("donor_id", donorId);
      }

      // 📌 סינון לפי ארגון
      if (!isGlobalSuperAdmin) {
        query = query.eq("organization_id", organizationId);
      } else {
        if (organizationId !== "all") {
          query = query.eq("organization_id", organizationId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const payments = data || [];

      // Build paymentsByPledgeId only for donor view
      const paymentsByPledgeId: Record<string, any[]> = {};
      payments.forEach((p: any) => {
        if (!p.pledge_id) return;
        if (!paymentsByPledgeId[p.pledge_id]) {
          paymentsByPledgeId[p.pledge_id] = [];
        }
        paymentsByPledgeId[p.pledge_id].push(p);
      });

      return { payments, paymentsByPledgeId };
    },
  });
}

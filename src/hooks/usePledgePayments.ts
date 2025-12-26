// src/hooks/usePledgePayments.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePledgePayments(pledge_id?: string | null) {
  return useQuery({
    queryKey: ["pledge-payments", pledge_id],
    enabled: !!pledge_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("pledge_id", pledge_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSystemSettings() {
  const {
    data: settings = {},
    isLoading,
    error,
  } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value");

      if (error) throw error;

      const mapped: Record<string, string> = {};
      data.forEach((row) => {
        mapped[row.key] = row.value;
      });

      return mapped;
    },
  });

  return {
    settings,
    isLoading,
    error,
    systemEmail: settings["system_email"] || "",
  };
}

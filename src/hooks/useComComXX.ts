import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface ComComMessage {
  id: string;
  org_id: string;
  created_by: string;
  created_at: string;
  type: string;
  subject: string;
  body: string;
  target_role: string;
  sent_at: string | null;
}

export function useComCom() {
  const { organizationId } = useUser();
  const queryClient = useQueryClient();

  /* -------------------------------------------------------
     ORG VALIDATION — super_admin "all" = disabled
  -------------------------------------------------------- */
  const orgEnabled =
    !!organizationId &&
    organizationId !== "all";

  /* -------------------------------------------------------
     FETCH SYSTEM-LEVEL EMAIL (FROM address)
     from system_settings(setting_key='system_email')
  -------------------------------------------------------- */
  const {
    data: fromEmail,
    isLoading: loadingFromEmail,
    error: fromEmailError,
  } = useQuery({
    queryKey: ["system-email"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_system_setting", {
        p_key: "system_email"
      });

      if (error) throw error;
      return data; // returns string or null
    },
  });

  /* -------------------------------------------------------
     LOAD MESSAGES FOR ORG
  -------------------------------------------------------- */
  const {
    data: messages = [],
    isLoading: loadingMessages,
    error: loadError,
  } = useQuery<ComComMessage[]>({
    queryKey: ["comcom-messages", organizationId],
    enabled: orgEnabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comcom_messages")
        .select("*")
        .eq("org_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  /* -------------------------------------------------------
     CREATE MESSAGE
  -------------------------------------------------------- */
  const createMessage = useMutation({
    mutationFn: async ({
      subject,
      body,
      targetRole,
    }: {
      subject: string;
      body: string;
      targetRole: string;
    }) => {
      if (!orgEnabled) throw new Error("No organization selected");

      const { data, error } = await supabase.rpc("comcom_create_message", {
        p_org_id: organizationId,
        p_type: "email",
        p_subject: subject,
        p_body: body,
        p_target_role: targetRole,
      });

      if (error) throw error;
      return data;
    },

    onSuccess: () => {
      toast.success("Message created");
      queryClient.invalidateQueries({ queryKey: ["comcom-messages"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  /* -------------------------------------------------------
     SEND MESSAGE (EDGE FUNCTION)
  -------------------------------------------------------- */
  const sendMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "comcom-send-email",
        { body: { messageId } }
      );

      if (error) throw error;
      return data;
    },

    onSuccess: () => {
      toast.success("Message sent");
      queryClient.invalidateQueries({ queryKey: ["comcom-messages"] });
    },

    onError: (err: any) => toast.error(err.message),
  });

  return {
    /* DATA */
    messages,
    fromEmail,

    /* LOAD STATES */
    loadingMessages,
    loadingFromEmail,

    /* ERRORS */
    loadError,
    fromEmailError,

    /* MUTATIONS */
    createMessage,
    sendMessage,

    /* CONTEXT STATE */
    orgEnabled,
  };
}

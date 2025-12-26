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

export interface Recipient {
  email: string;
  full_name: string | null;
  user_id: string | null;
}

export function useComCom() {
  const { organizationId } = useUser();
  const queryClient = useQueryClient();

  const orgEnabled =
    !!organizationId && organizationId !== "all";

  /* --------------------------------------------------------
     LOAD SYSTEM EMAIL
  -------------------------------------------------------- */
  const { data: systemEmail } = useQuery({
    queryKey: ["system-email"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "SYSTEM_EMAIL")
        .single();

      if (error) {
        console.warn("No SYSTEM_EMAIL found in system_settings");
        return "no-reply@synago.org";
      }

      return data?.value || "no-reply@synago.org";
    },
  });

  /* --------------------------------------------------------
     GET MESSAGES
  -------------------------------------------------------- */
  const {
    data: messages = [],
    isLoading: loadingMessages,
    error: loadError,
  } = useQuery({
    queryKey: ["comcom-messages", organizationId],
    enabled: orgEnabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comcom_messages")
        .select("*")
        .eq("org_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  /* --------------------------------------------------------
     CREATE MESSAGE
  -------------------------------------------------------- */
  const createMessage = useMutation({
    mutationFn: async ({ subject, body, targetRole }) => {
      const { data, error } = await supabase.rpc(
        "comcom_create_message",
        {
          p_org_id: organizationId,
          p_type: "email",
          p_subject: subject,
          p_body: body,
          p_target_role: targetRole,
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Message created");

      queryClient.invalidateQueries({
        queryKey: ["comcom-messages", organizationId],
      });
    },
    onError: (err) => toast.error(err.message),
  });

  /* --------------------------------------------------------
     UPDATE MESSAGE
  -------------------------------------------------------- */
  const updateMessage = useMutation({
    mutationFn: async ({ id, subject, body, targetRole }) => {
      const { error } = await supabase
        .from("comcom_messages")
        .update({
          subject,
          body,
          target_role: targetRole,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message updated");

      queryClient.invalidateQueries({
        queryKey: ["comcom-messages", organizationId],
      });
    },
  });

  /* --------------------------------------------------------
     DELETE MESSAGE
  -------------------------------------------------------- */
  const deleteMessage = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("comcom_messages")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message deleted");

      queryClient.invalidateQueries({
        queryKey: ["comcom-messages", organizationId],
      });
    },
    onError: (err) => toast.error(err.message),
  });

  /* --------------------------------------------------------
     GET RECIPIENTS FOR ROLE
  -------------------------------------------------------- */
  const getRecipients = async (role: string): Promise<Recipient[]> => {
    const { data, error } = await supabase.rpc(
      "comcom_get_recipients_for_role",
      {
        p_org_id: organizationId,
        p_role: role,
      }
    );

    if (error) throw error;
    return data || [];
  };

  /* --------------------------------------------------------
     SEND EMAIL
  -------------------------------------------------------- */
  const sendMessage = useMutation({
    mutationFn: async ({ messageId, to, cc, bcc }) => {
      const { data, error } = await supabase.functions.invoke(
        "comcom-send-email",
        {
          body: { messageId, to, cc, bcc },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Message sent");

      queryClient.invalidateQueries({
        queryKey: ["comcom-messages", organizationId],
      });
    },
  });

  return {
    systemEmail,

    messages,
    loadingMessages,
    loadError,

    createMessage,
    updateMessage,
    deleteMessage,
    sendMessage,

    getRecipients,
    orgEnabled,
  };
}

// src/components/comcom/MessageComposer.tsx
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useUser } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------
   TYPES
------------------------------------------------------------------ */
interface Recipient {
  user_id: string;
  email: string;
  full_name: string;
  selected: boolean;
}

/* ------------------------------------------------------------------
   PROPS
------------------------------------------------------------------ */
export default function MessageComposer({
  initialMessage,
  onClose,
  onSaved,
}: {
  initialMessage?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initialMessage;

  const { t, language } = useLanguage();
  const { user, organizationId } = useUser();
  const rtl = language === "he";

  /* ------------------------------------------------------------------
     STATE
  ------------------------------------------------------------------ */
  const [subject, setSubject] = useState(initialMessage?.subject || "");
  const [body, setBody] = useState(initialMessage?.body || "");
  const [targetRole, setTargetRole] = useState(
    initialMessage?.target_role || "member"
  );

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const [saving, setSaving] = useState(false);

  /* ------------------------------------------------------------------
     LOAD RECIPIENTS WHEN ROLE SELECTED
  ------------------------------------------------------------------ */
  const loadRecipients = async () => {
    if (!organizationId) return;
    setLoadingRecipients(true);

    const { data, error } = await supabase.rpc(
      "comcom_get_recipients_for_role",
      {
        p_org_id: organizationId,
        p_role: targetRole,
      }
    );

    if (error) {
      toast.error("Failed loading recipients");
      setLoadingRecipients(false);
      return;
    }

    const mapped: Recipient[] = data.map((r: any) => ({
      ...r,
      selected: true,
    }));

    setRecipients(mapped);
    setLoadingRecipients(false);
  };

  /* ------------------------------------------------------------------
     SAVE MESSAGE + RECIPIENTS
  ------------------------------------------------------------------ */
  const saveMessage = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error(t("comcom.validation.required"));
      return;
    }
    if (!organizationId) {
      toast.error("No organization selected");
      return;
    }

    setSaving(true);

    try {
      let messageId = initialMessage?.id;

      // CREATE
      if (!messageId) {
        const { data, error } = await supabase.rpc("comcom_create_message", {
          p_org_id: organizationId,
          p_type: "email",
          p_subject: subject,
          p_body: body,
          p_target_role: targetRole,
        });

        if (error) throw error;
        messageId = data;
      }

      // SAVE RECIPIENTS
      const rows = recipients.map((r) => ({
        message_id: messageId,
        user_id: r.user_id,
        email: r.email,
        full_name: r.full_name,
        selected: r.selected,
      }));

      const { error: recErr } = await supabase
        .from("comcom_recipients_log")
        .insert(rows);

      if (recErr) throw recErr;

      toast.success("Message saved!");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Error saving message");
    }

    setSaving(false);
  };

  /* ------------------------------------------------------------------
     TOGGLING RECIPIENT SELECTION
  ------------------------------------------------------------------ */
  const toggleRecipient = (idx: number) => {
    setRecipients((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, selected: !r.selected } : r
      )
    );
  };

  /* ------------------------------------------------------------------
     RENDER
  ------------------------------------------------------------------ */
  return (
    <Card className="p-4 shadow-xl border">
      <CardHeader>
        <CardTitle>
          {isEdit ? t("comcom.editMessage") : t("comcom.createMessage")}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* SUBJECT */}
        <Input
          placeholder={t("comcom.subject")}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={rtl ? "text-right" : ""}
        />

        {/* BODY */}
        <Textarea
          placeholder={t("comcom.body")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className={rtl ? "text-right" : ""}
        />

        {/* ROLE SELECT */}
        <Select value={targetRole} onValueChange={setTargetRole}>
          <SelectTrigger>
            <SelectValue placeholder={t("comcom.selectRole")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">{t("comcom.roles.member")}</SelectItem>
            <SelectItem value="donor">{t("comcom.roles.donor")}</SelectItem>
            <SelectItem value="manager">{t("comcom.roles.manager")}</SelectItem>
            <SelectItem value="accountant">
              {t("comcom.roles.accountant")}
            </SelectItem>
            <SelectItem value="synagogue_admin">
              {t("comcom.roles.synagogueAdmin")}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* LOAD RECIPIENTS BUTTON */}
        <Button
          variant="outline"
          onClick={loadRecipients}
          disabled={loadingRecipients}
        >
          {loadingRecipients && (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          )}
          {t("comcom.loadRecipients")}
        </Button>

        {/* RECIPIENTS LIST */}
        {recipients.length > 0 && (
          <div className="border rounded p-3 max-h-80 overflow-auto">
            <div className="text-sm font-semibold mb-2">
              {t("comcom.recipientsList")} ({recipients.length})
            </div>

            {recipients.map((r, idx) => (
              <div
                key={r.user_id}
                className="flex items-center gap-3 py-1 border-b"
              >
                <input
                  type="checkbox"
                  checked={r.selected}
                  onChange={() => toggleRecipient(idx)}
                />

                <div>
                  <div className="font-medium">{r.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.email}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SAVE BUTTON */}
        <Button
          className="w-full mt-3"
          onClick={saveMessage}
          disabled={saving}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {isEdit ? t("comcom.saveChanges") : t("comcom.create")}
        </Button>

        {/* CLOSE BUTTON */}
        <Button
          variant="ghost"
          className="w-full"
          onClick={onClose}
        >
          {t("common.close")}
        </Button>
      </CardContent>
    </Card>
  );
}

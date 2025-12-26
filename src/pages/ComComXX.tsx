import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";
import { useComCom } from "@/hooks/useComCom";

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

import { Loader2, Send, Info } from "lucide-react";
import { toast } from "sonner";

export default function ComCom() {
  /* -------------------------
     ALL HOOKS MUST BE FIRST
  -------------------------- */
  const { t, language } = useLanguage();
  const rtl = language === "he";

  const { isGlobalSuperAdmin, organizationId, user } = useUser();

  const {
    messages,
    loadingMessages,
    createMessage,
    sendMessage,
    orgEnabled,
  } = useComCom();

  /* -------------------------
     LOCAL STATE
  -------------------------- */
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [targetRole, setTargetRole] = useState("member");

  /* -------------------------
     ACTIONS
  -------------------------- */
  const handleCreate = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error(t("comcom.validation.required"));
      return;
    }

    await createMessage.mutateAsync({
      subject,
      body,
      targetRole,
    });

    setSubject("");
    setBody("");
  };

  const handleSend = async (id: string) => {
    await sendMessage.mutateAsync(id);
  };

  /* -------------------------
     SUPER ADMIN MUST SELECT ORG
  -------------------------- */
  const mustChooseOrganization =
    isGlobalSuperAdmin && (!organizationId || organizationId === "all");

  return (
    <div className={`p-6 space-y-6 ${rtl ? "rtl text-right" : ""}`}>
      <h1 className="text-2xl font-bold">📧 {t("comcom.title")}</h1>

      {/* -------------------------------------------------------------------
         EMAIL INFO PANEL — ALWAYS SHOW WHEN ORG IS SELECTED
      ------------------------------------------------------------------- */}
      {!mustChooseOrganization && (
        <Card className="bg-blue-50 border-blue-300 text-blue-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4" />
              <span className="font-semibold">{t("comcom.deliveryInfo")}</span>
            </div>

            <div>
              <b>{t("comcom.from")}:</b> no-reply@synago.org
            </div>

            <div>
              <b>{t("comcom.replyTo")}:</b> {user?.email}
            </div>

            <p className="text-xs opacity-70 mt-2">
              {t("comcom.deliveryNote")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* -------------------------------------------------------------------
         SUPER ADMIN WITHOUT ORG SELECTION
      ------------------------------------------------------------------- */}
      {mustChooseOrganization ? (
        <Card className="border-yellow-400 bg-yellow-100 text-yellow-800">
          <CardContent className="p-4">
            {t("comcom.mustSelectOrg")}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* -------------------------------------------------------------------
             CREATE MESSAGE
          ------------------------------------------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>{t("comcom.createMessage")}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <Input
                placeholder={t("comcom.subject")}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={rtl ? "text-right" : ""}
              />

              <Textarea
                placeholder={t("comcom.body")}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className={rtl ? "text-right" : ""}
              />

              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger>
                  <SelectValue placeholder={t("comcom.selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">{t("comcom.roles.member")}</SelectItem>
                  <SelectItem value="donor">{t("comcom.roles.donor")}</SelectItem>
                  <SelectItem value="manager">{t("comcom.roles.manager")}</SelectItem>
                  <SelectItem value="accountant">{t("comcom.roles.accountant")}</SelectItem>
                  <SelectItem value="synagogue_admin">
                    {t("comcom.roles.synagogueAdmin")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleCreate}
                disabled={createMessage.isPending || !orgEnabled}
                className="flex gap-2 items-center"
              >
                {createMessage.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {t("comcom.create")}
              </Button>
            </CardContent>
          </Card>

          {/* -------------------------------------------------------------------
             MESSAGES LIST
          ------------------------------------------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>{t("comcom.list")}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {loadingMessages && (
                <div className="text-muted-foreground">
                  {t("comcom.loading")}
                </div>
              )}

              {!loadingMessages && messages.length === 0 && (
                <div className="text-muted-foreground">
                  {t("comcom.noMessages")}
                </div>
              )}

              {!loadingMessages &&
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 border rounded bg-white shadow-sm"
                  >
                    <div className="font-semibold">{msg.subject}</div>
                    <div className="text-sm opacity-70 whitespace-pre-wrap">
                      {msg.body}
                    </div>
                    <div className="text-xs opacity-60 mt-1">
                      {t("comcom.to")}: {msg.target_role}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sendMessage.isPending}
                      onClick={() => handleSend(msg.id)}
                      className="flex gap-2 items-center mt-2"
                    >
                      <Send className="w-4 h-4" />
                      {t("comcom.send")}
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

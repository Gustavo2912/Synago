import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";
import { useComCom, Recipient } from "@/hooks/useComCom";

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

import { Loader2, Send, Edit, Trash2, Info } from "lucide-react";
import { toast } from "sonner";

export default function ComCom() {
  /* --------------------------------------------------------------
     HOOKS
  -------------------------------------------------------------- */
  const { t, language } = useLanguage();
  const rtl = language === "he";

  const { isGlobalSuperAdmin, organizationId, user } = useUser();

  const {
    systemEmail,
    messages,
    loadingMessages,
    createMessage,
    updateMessage,
    deleteMessage,
    sendMessage,
    getRecipients,
    orgEnabled,
  } = useComCom();

  /* --------------------------------------------------------------
     LOCAL UI STATE
  -------------------------------------------------------------- */
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [targetRole, setTargetRole] = useState("member");

  const [editId, setEditId] = useState<string | null>(null);

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  const [extraCC, setExtraCC] = useState("");
  const [extraBCC, setExtraBCC] = useState("");

  /* --------------------------------------------------------------
     LOAD RECIPIENTS
  -------------------------------------------------------------- */
  const handleLoadRecipients = async () => {
    if (!targetRole) return;

    try {
      const list = await getRecipients(targetRole);
      setRecipients(list);
      setSelectedRecipients(list.map((r) => r.email));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleRecipient = (email: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(email) ? prev.filter((x) => x !== email) : [...prev, email]
    );
  };

  /* --------------------------------------------------------------
     CREATE / UPDATE MESSAGE
  -------------------------------------------------------------- */
  const handleSave = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error(t("comcom.validation.required"));
      return;
    }

    if (editId) {
      await updateMessage.mutateAsync({
        id: editId,
        subject,
        body,
        targetRole,
      });

      toast.success("Message updated");
      setEditId(null);
    } else {
      await createMessage.mutateAsync({
        subject,
        body,
        targetRole,
      });

      toast.success("Message created");
    }

    setSubject("");
    setBody("");
    setRecipients([]);
    setSelectedRecipients([]);
  };

  /* --------------------------------------------------------------
     EDIT MESSAGE
  -------------------------------------------------------------- */
  const startEdit = (msg: any) => {
    setEditId(msg.id);
    setSubject(msg.subject);
    setBody(msg.body);
    setTargetRole(msg.target_role);
    setRecipients([]);
    setSelectedRecipients([]);
  };

  /* --------------------------------------------------------------
     DELETE MESSAGE
  -------------------------------------------------------------- */
  const handleDelete = async (id: string) => {
    await deleteMessage.mutateAsync(id);
    toast.success("Message deleted");
  };

  /* --------------------------------------------------------------
     SEND MESSAGE
  -------------------------------------------------------------- */
  const handleSend = async (id: string) => {
    if (selectedRecipients.length === 0) {
      toast.error("No recipients selected");
      return;
    }

    const to = recipients.filter((r) => selectedRecipients.includes(r.email));

    await sendMessage.mutateAsync({
      messageId: id,
      to,
      cc: extraCC ? extraCC.split(",").map((s) => s.trim()) : [],
      bcc: extraBCC ? extraBCC.split(",").map((s) => s.trim()) : [],
    });

    toast.success("Message sent!");
  };

  /* --------------------------------------------------------------
     SUPER ADMIN MUST SELECT ORG FIRST
  -------------------------------------------------------------- */
  const mustChooseOrganization =
    isGlobalSuperAdmin && (!organizationId || organizationId === "all");

  return (
    <div className={`p-6 space-y-6 ${rtl ? "rtl text-right" : ""}`}>
      <h1 className="text-2xl font-bold">📧 {t("comcom.title")}</h1>

      {/* --------------------------------------------------------------
         EMAIL INFO PANEL
      -------------------------------------------------------------- */}
      {!mustChooseOrganization && (
        <Card className="bg-blue-50 border-blue-300 text-blue-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span className="font-semibold">{t("comcom.deliveryInfo")}</span>
            </div>

            <div>
              <b>{t("comcom.from")}:</b> {systemEmail}
            </div>

            <div>
              <b>{t("comcom.replyTo")}:</b> {user?.email}
            </div>

            <p className="text-xs opacity-70 mt-1">{t("comcom.deliveryNote")}</p>
          </CardContent>
        </Card>
      )}

      {/* --------------------------------------------------------------
         ORG NOT SELECTED
      -------------------------------------------------------------- */}
      {mustChooseOrganization ? (
        <Card className="border-yellow-400 bg-yellow-100 text-yellow-800">
          <CardContent className="p-4">
            {t("comcom.mustSelectOrg")}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* --------------------------------------------------------------
             CREATE OR EDIT MESSAGE
          -------------------------------------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>
                {editId ? t("comcom.editMessage") : t("comcom.createMessage")}
              </CardTitle>
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
                  <SelectItem value="accountant">
                    {t("comcom.roles.accountant")}
                  </SelectItem>
                  <SelectItem value="synagogue_admin">
                    {t("comcom.roles.synagogueAdmin")}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* LOAD RECIPIENTS BUTTON */}
              <Button onClick={handleLoadRecipients} variant="secondary">
                {t("comcom.loadRecipients")}
              </Button>

              {/* RECIPIENTS LIST */}
              {recipients.length > 0 && (
                <Card className="p-3 border">
                  <b>{t("comcom.recipientsList")} ({recipients.length})</b>

                  <div className="mt-3 space-y-1 max-h-64 overflow-auto">
                    {recipients.map((r) => (
                      <label
                        key={r.email}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(r.email)}
                          onChange={() => toggleRecipient(r.email)}
                        />
                        <span>{r.full_name || r.email}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2">
                    <Input
                      placeholder="CC (comma separated)"
                      value={extraCC}
                      onChange={(e) => setExtraCC(e.target.value)}
                    />
                    <Input
                      placeholder="BCC (comma separated)"
                      value={extraBCC}
                      onChange={(e) => setExtraBCC(e.target.value)}
                    />
                  </div>
                </Card>
              )}

              <Button
                onClick={handleSave}
                disabled={
                  createMessage.isPending ||
                  updateMessage.isPending ||
                  !orgEnabled
                }
                className="flex gap-2 items-center"
              >
                {(createMessage.isPending || updateMessage.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {editId ? t("comcom.update") : t("comcom.create")}
              </Button>

              {editId && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditId(null);
                    setSubject("");
                    setBody("");
                    setRecipients([]);
                    setSelectedRecipients([]);
                  }}
                >
                  {t("common.close")}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* --------------------------------------------------------------
             LIST OF MESSAGES
          -------------------------------------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>{t("comcom.list")}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {loadingMessages && (
                <div className="text-muted-foreground">{t("comcom.loading")}</div>
              )}

              {!loadingMessages && messages.length === 0 && (
                <div className="text-muted-foreground">{t("comcom.noMessages")}</div>
              )}

              {!loadingMessages &&
                messages.map((msg) => (
                  <Card key={msg.id} className="p-4 border bg-white shadow-sm">
                    <div className="font-semibold">{msg.subject}</div>
                    <div className="text-sm opacity-70 whitespace-pre-wrap">
                      {msg.body}
                    </div>
                    <div className="text-xs opacity-60 mt-1">
                      {t("comcom.to")}: {msg.target_role}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleSend(msg.id)}
                        disabled={sendMessage.isPending}
                        className="flex gap-1 items-center"
                      >
                        <Send className="w-4 h-4" />
                        {t("comcom.send")}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(msg)}
                        className="flex gap-1 items-center"
                      >
                        <Edit className="w-4 h-4" />
                        {t("common.edit")}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(msg.id)}
                        className="flex gap-1 items-center"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t("common.delete")}
                      </Button>
                    </div>
                  </Card>
                ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";
import { useComCom } from "@/hooks/useComCom";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Loader2, Send, Edit, Trash2, PlusCircle, Info } from "lucide-react";
import { toast } from "sonner";

import MessageComposer from "@/components/MessageComposer";

export default function ComCom() {
  /* -------------------------------
     HOOKS
  --------------------------------*/
  const { t, language } = useLanguage();
  const rtl = language === "he";

  const { isGlobalSuperAdmin, organizationId, user } = useUser();

  const {
    messages,
    loadingMessages,
    sendMessage,
    deleteMessage,
    orgEnabled,
    refreshMessages,
  } = useComCom();

  /* -------------------------------
     LOCAL STATE
  --------------------------------*/
  const [showComposer, setShowComposer] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);

  const mustChooseOrganization =
    isGlobalSuperAdmin && (!organizationId || organizationId === "all");

  /* -------------------------------
     ACTIONS
  --------------------------------*/
  const handleSend = async (id: string) => {
    const ok = await sendMessage.mutateAsync(id);
    if (ok) toast.success("Message sent");
  };

  const handleEdit = (msg: any) => {
    setEditingMessage(msg);
    setShowComposer(true);
  };

  const handleDelete = async (msgId: string) => {
    if (!confirm(t("comcom.confirmDelete"))) return;

    await deleteMessage.mutateAsync(msgId);
    toast.success(t("comcom.deleted"));
  };

  const handleCreateNew = () => {
    setEditingMessage(null);
    setShowComposer(true);
  };

  /* -------------------------------
     RENDER
  --------------------------------*/
  return (
    <div className={`p-6 space-y-6 ${rtl ? "rtl text-right" : ""}`}>
      <h1 className="text-2xl font-bold">📧 {t("comcom.title")}</h1>

      {/* -----------------------------------------------------
         EMAIL HEADER INFO
      ------------------------------------------------------ */}
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

      {/* -----------------------------------------------------
         REQUIRE ORG (SUPER ADMIN)
      ------------------------------------------------------ */}
      {mustChooseOrganization ? (
        <Card className="border-yellow-400 bg-yellow-100 text-yellow-800">
          <CardContent className="p-4">
            {t("comcom.mustSelectOrg")}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* -----------------------------------------------------
             CREATE MESSAGE BUTTON
          ------------------------------------------------------ */}
          <div className="flex justify-end">
            <Button onClick={handleCreateNew} className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              {t("comcom.new")}
            </Button>
          </div>

          {/* -----------------------------------------------------
             COMPOSER OPEN
          ------------------------------------------------------ */}
          {showComposer && (
            <MessageComposer
              initialMessage={editingMessage}
              onClose={() => setShowComposer(false)}
              onSaved={() => {
                setShowComposer(false);
                refreshMessages();
              }}
            />
          )}

          {/* -----------------------------------------------------
             MESSAGES LIST
          ------------------------------------------------------ */}
          <Card>
            <CardHeader>
              <CardTitle>{t("comcom.list")}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {loadingMessages && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
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
                    <div className="font-semibold text-lg">{msg.subject}</div>

                    <div className="text-sm opacity-70 whitespace-pre-wrap mt-1">
                      {msg.body}
                    </div>

                    <div className="text-xs opacity-60 mt-1">
                      {t("comcom.to")}: {msg.target_role}
                    </div>

                    <div className="flex gap-2 mt-3">
                      {/* SEND */}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={sendMessage.isPending}
                        onClick={() => handleSend(msg.id)}
                        className="flex gap-2 items-center"
                      >
                        <Send className="w-4 h-4" />
                        {t("comcom.send")}
                      </Button>

                      {/* EDIT */}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEdit(msg)}
                        className="flex gap-2 items-center"
                      >
                        <Edit className="w-4 h-4" />
                        {t("comcom.edit")}
                      </Button>

                      {/* DELETE */}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(msg.id)}
                        className="flex gap-2 items-center"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t("common.delete")}
                      </Button>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCampaigns, useDeleteCampaign, type Campaign } from "@/hooks/useCampaigns";
import AddCampaignDialog from "@/components/AddCampaignDialog";
import EditCampaignDialog from "@/components/EditCampaignDialog";
import { Plus, Trash2, Edit3, Target as UserIcon } from "lucide-react";

export default function Campaigns() {
  const { t, currencySymbol } = useLanguage();
  const { data: campaigns } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();

  const [showAdd, setShowAdd] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);

  const onDelete = (c: Campaign) => {
    // ניתן להוסיף confirm אם תרצה
    deleteCampaign.mutate(c.id);
  };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          {t("campaigns.title") || "Campaigns"}
        </h1>

        <Button
          className="flex items-center gap-2"
          onClick={() => setShowAdd(true)}
        >
          <Plus size={16} />
          {t("campaigns.create") || "Create Campaign"}
        </Button>
      </div>

      {/* GRID OF CARDS */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {campaigns?.map((c) => (
          <Card key={c.id} className="flex flex-col overflow-hidden">
            {/* Banner */}
            {c.banner_url && (
              <div className="h-32 w-full overflow-hidden">
                <img
                  src={c.banner_url}
                  alt={c.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <CardHeader className="flex flex-row justify-between items-start gap-2">
              <div>
                <CardTitle className="text-lg font-semibold">
                  {c.name}
                </CardTitle>

                {c.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {c.description}
                  </p>
                )}
              </div>

              <div className="flex gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setEditCampaign(c)}
                >
                  <Edit3 size={16} />
                </Button>

                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onDelete(c)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="mt-2 space-y-3 text-sm text-gray-700">

              {/* GOAL AMOUNT */}
              {c.goal_amount != null && (
                <div>
                  <span className="font-semibold">
                    {t("campaigns.goalAmount") || "Goal"}:
                  </span>{" "}
                  {currencySymbol}
                  {c.goal_amount}
                </div>
              )}

              {/* BANNER URL DISPLAY */}
              {c.banner_url && (
                <div className="text-xs break-all">
                  <span className="font-semibold">
                    {t("campaigns.bannerUrl") || "Banner URL"}:
                  </span>{" "}
                  <a
                    href={c.banner_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline break-all"
                  >
                    {c.banner_url}
                  </a>
                </div>
              )}

              {/* DATES + CREATED */}
              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                {c.start_date && (
                  <span>
                    {t("campaigns.startDate") || "Start"}:{" "}
                    {new Date(c.start_date).toLocaleDateString()}
                  </span>
                )}

                {c.end_date && (
                  <span>
                    {t("campaigns.endDate") || "End"}:{" "}
                    {new Date(c.end_date).toLocaleDateString()}
                  </span>
                )}

                <span>
                  {t("campaigns.createdAt") || "Created"}:{" "}
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* EMPTY STATE */}
      {(!campaigns || campaigns.length === 0) && (
        <div className="text-center text-gray-500 mt-10">
          {t("campaigns.empty") || "No campaigns yet."}
        </div>
      )}

      {/* ADD DIALOG */}
      <AddCampaignDialog open={showAdd} onClose={() => setShowAdd(false)} />

      {/* EDIT DIALOG */}
      <EditCampaignDialog
        open={!!editCampaign}
        onClose={() => setEditCampaign(null)}
        campaign={editCampaign}
      />
    </div>
  );
}

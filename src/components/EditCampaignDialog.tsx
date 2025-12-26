import { useEffect, useState, ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUpdateCampaign } from "@/hooks/useCampaigns";
import { supabase } from "@/integrations/supabase/client";
import type { Campaign } from "@/hooks/useCampaigns";

type Props = {
  open: boolean;
  onClose: () => void;
  campaign: Campaign | null;
};

export default function EditCampaignDialog({ open, onClose, campaign }: Props) {
  const { t } = useLanguage();
  const updateCampaign = useUpdateCampaign();

  const [form, setForm] = useState({
    name: "",
    description: "",
    goal_amount: "",
    start_date: "",
    end_date: "",
    banner_url: "",
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (campaign) {
      setForm({
        name: campaign.name || "",
        description: campaign.description || "",
        goal_amount: campaign.goal_amount?.toString() || "",
        start_date: campaign.start_date || "",
        end_date: campaign.end_date || "",
        banner_url: campaign.banner_url || "",
      });
    }
  }, [campaign]);

  const update = (key: string, value: any) =>
    setForm((f) => ({
      ...f,
      [key]: value,
    }));

  const handleBannerUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { data, error } = await supabase.storage
        .from("campaign-banners")
        .upload(filePath, file);

      if (error) {
        console.error("Banner upload error", error);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("campaign-banners")
        .getPublicUrl(data.path);

      update("banner_url", publicData.publicUrl);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!campaign) return;

    await updateCampaign.mutateAsync({
      id: campaign.id,
      data: {
        name: form.name,
        description: form.description || null,
        goal_amount: form.goal_amount ? parseFloat(form.goal_amount) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        banner_url: form.banner_url || null,
      },
    });

    onClose();
  };

  if (!open || !campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("campaigns.edit") || "Edit Campaign"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* NAME */}
          <div>
            <Label>{t("campaigns.name") || "Name"}</Label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <Label>{t("campaigns.description") || "Description"}</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          {/* GOAL */}
          <div>
            <Label>{t("campaigns.goalAmount") || "Goal Amount"}</Label>
            <Input
              type="number"
              value={form.goal_amount}
              onChange={(e) => update("goal_amount", e.target.value)}
            />
          </div>

          {/* DATES */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("campaigns.startDate") || "Start Date"}</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => update("start_date", e.target.value)}
              />
            </div>

            <div>
              <Label>{t("campaigns.endDate") || "End Date"}</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => update("end_date", e.target.value)}
              />
            </div>
          </div>

          {/* BANNER UPLOAD */}
          <div>
            <Label>{t("campaigns.banner") || "Banner Image"}</Label>
            <Input type="file" accept="image/*" onChange={handleBannerUpload} />

            {uploading && (
              <div className="text-sm text-gray-500 mt-1">
                {t("campaigns.uploading") || "Uploading..."}
              </div>
            )}

            {/* BANNER PREVIEW */}
            {form.banner_url && (
              <>
                <div className="mt-2">
                  <img
                    src={form.banner_url}
                    alt="banner preview"
                    className="w-full h-32 object-cover rounded-md border"
                  />
                </div>

                {/* BANNER URL DISPLAY */}
                <div className="text-xs mt-2 break-all">
                  <span className="font-semibold">
                    {t("campaigns.bannerUrl") || "Banner URL"}:
                  </span>{" "}
                  <a
                    href={form.banner_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline break-all"
                  >
                    {form.banner_url}
                  </a>
                </div>
              </>
            )}
          </div>

          {/* SAVE BUTTON */}
          <Button className="w-full" onClick={save} disabled={!form.name}>
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

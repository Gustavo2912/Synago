import { useState, ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCreateCampaign } from "@/hooks/useCampaigns";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AddCampaignDialog({ open, onClose }: Props) {
  const { t } = useLanguage();
  const createCampaign = useCreateCampaign();

  const [form, setForm] = useState({
    name: "",
    description: "",
    goal_amount: "",
    start_date: "",
    end_date: "",
    banner_url: "",
  });

  const [uploading, setUploading] = useState(false);

  const update = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const uploadBanner = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}.${ext}`;
      const filePath = `banners/${fileName}`;

      const { data, error } = await supabase.storage
        .from("campaign-banners")
        .upload(filePath, file);

      if (error) {
        console.error("Upload error", error);
        return;
      }

      const { data: pub } = supabase.storage
        .from("campaign-banners")
        .getPublicUrl(data.path);

      update("banner_url", pub.publicUrl);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const payload = {
      name: form.name,
      description: form.description || null,
      goal_amount: form.goal_amount ? parseFloat(form.goal_amount) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      banner_url: form.banner_url || null,
    };

    await createCampaign.mutateAsync(payload);

    // cleanup
    setForm({
      name: "",
      description: "",
      goal_amount: "",
      start_date: "",
      end_date: "",
      banner_url: "",
    });

    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("campaigns.create") || "Create Campaign"}</DialogTitle>
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

          {/* MANUAL BANNER URL INPUT */}
          <div>
            <Label>{t("campaigns.bannerUrl") || "Banner URL"}</Label>
            <Input
              placeholder="https://example.com/banner.jpg"
              value={form.banner_url}
              onChange={(e) => update("banner_url", e.target.value)}
            />
          </div>

          {/* FILE UPLOAD */}
          <div>
            <Label>{t("campaigns.banner") || "Banner Image"}</Label>
            <Input type="file" accept="image/*" onChange={uploadBanner} />

            {uploading && (
              <div className="text-sm text-gray-500 mt-1">
                {t("campaigns.uploading") || "Uploading..."}
              </div>
            )}
          </div>

          {/* PREVIEW + URL */}
          {form.banner_url && (
            <div className="space-y-2">
              <img
                src={form.banner_url}
                alt="banner preview"
                className="w-full h-32 object-cover rounded-md border"
              />

              <div className="text-xs break-all">
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
            </div>
          )}

          {/* SAVE */}
          <Button
            className="w-full"
            onClick={save}
            disabled={!form.name}
          >
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

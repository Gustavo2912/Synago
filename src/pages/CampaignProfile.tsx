import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

import {
  useCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
} from "@/hooks/useCampaigns";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";

export default function CampaignProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: campaign, isLoading } = useCampaign(id || "");
  const updateMutation = useUpdateCampaign();
  const deleteMutation = useDeleteCampaign();

  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    goal_amount: "",
    start_date: "",
    end_date: "",
    banner_url: "",
  });

  if (isLoading || !campaign)
    return <div className="p-8 text-center">{t("common.loading")}</div>;

  /** ----------------------------
   *  OPEN EDIT MODAL WITH DATA
   ---------------------------- */
  const handleEdit = () => {
    setFormData({
      name: campaign.name,
      description: campaign.description ?? "",
      goal_amount: campaign.goal_amount.toString(),
      start_date: campaign.start_date ?? "",
      end_date: campaign.end_date ?? "",
      banner_url: campaign.banner_url ?? "",
    });
    setDialogOpen(true);
  };

  /** ----------------------------
   *  SAVE CAMPAIGN
   ---------------------------- */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        id: campaign.id,
        data: {
          name: formData.name,
          description: formData.description,
          goal_amount: Number(formData.goal_amount),
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          banner_url: formData.banner_url || null,
        },
      });

      toast.success("Campaign updated");
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /** ----------------------------
   *  DELETE CAMPAIGN
   ---------------------------- */
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await deleteMutation.mutateAsync(campaign.id);
      toast.success("Campaign deleted");
      navigate("/campaigns");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /** ----------------------------
   *  BANNER PREVIEW COMPONENT
   ---------------------------- */
  const BannerPreview = () => {
    if (!campaign.banner_url) return <div>-</div>;

    const url = campaign.banner_url.trim();

    const isImage =
      url.match(/\.(jpg|jpeg|png|gif|webp)$/i) !== null;

    const isVideo =
      url.match(/\.(mp4|mov|avi|webm)$/i) !== null;

    return (
      <div className="mt-3">
        {/* Show the raw URL */}
        <div className="text-sm text-muted-foreground break-all">{url}</div>

        {/* Render preview */}
        {isImage && (
          <img
            src={url}
            alt="Campaign Banner"
            className="mt-3 max-h-64 rounded-lg border shadow-md object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        )}

        {isVideo && (
          <video
            src={url}
            className="mt-3 max-h-64 rounded-lg border shadow-md"
            controls
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        )}

        {!isImage && !isVideo && (
          <div className="mt-2 text-xs text-muted-foreground">
            URL is not an image or video (preview not available)
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Button variant="ghost" onClick={() => navigate("/campaigns")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="flex justify-between items-center mt-6">
        <h1 className="text-4xl font-bold">{campaign.name}</h1>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>

          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">

          <div>
            <b>Description:</b> {campaign.description || "-"}
          </div>

          <div>
            <b>Goal:</b> {campaign.goal_amount.toLocaleString()}
          </div>

          <div>
            <b>Period:</b> {campaign.start_date} → {campaign.end_date}
          </div>

          <div>
            <b>Banner Preview:</b>
            <BannerPreview />
          </div>
        </CardContent>
      </Card>

      {/* =========================================================
          EDIT DIALOG
      ========================================================= */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Goal Amount</Label>
              <Input
                type="number"
                value={formData.goal_amount}
                onChange={(e) =>
                  setFormData({ ...formData, goal_amount: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Banner URL</Label>
              <Input
                value={formData.banner_url}
                onChange={(e) =>
                  setFormData({ ...formData, banner_url: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>

              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

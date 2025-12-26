// src/pages/Campaigns.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useLanguage } from "@/contexts/LanguageContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  useCampaigns,
  useDeleteCampaign,
  type Campaign
} from "@/hooks/useCampaigns";

import { useAllDonations } from "@/hooks/useDonations";
import { usePledges } from "@/hooks/usePledges";

import AddCampaignDialog from "@/components/AddCampaignDialog";
import EditCampaignDialog from "@/components/EditCampaignDialog";

import {
  Plus,
  Trash2,
  Edit3,
  Target as UserIcon
} from "lucide-react";

export default function Campaigns() {
  const { t, currency } = useLanguage();
  const fallbackCurrency = currency || "ILS";

  const { data: campaigns = [] } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();

  // כל הדוניישנס והפלדג׳ים (מופעלים כבר לפי הרשאות / ארגון בקלאיינטים)
  const { data: donations = [] } = useAllDonations();
  const { data: pledges = [] } = usePledges();

  const [showAdd, setShowAdd] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);

  const onDelete = (c: Campaign) => {
    deleteCampaign.mutate(c.id);
  };

  /* ---------------------------------------------
     SETTINGS לכל הארגונים → מטבע רשמי
  ---------------------------------------------- */
  const { data: orgSettingsList = [] } = useQuery({
    queryKey: ["all-org-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("organization_id, default_currency");

      if (error) throw error;
      return data || [];
    },
  });

  const orgCurrencyMap = useMemo(() => {
    const map = new Map<string, string>();
    (orgSettingsList as any[]).forEach((s) => {
      if (s.organization_id) {
        map.set(s.organization_id, s.default_currency || fallbackCurrency);
      }
    });
    return map;
  }, [orgSettingsList, fallbackCurrency]);

  /* ---------------------------------------------
     סטטיסטיקות לכל קמפיין
     כלל שסוכם: C → Donations + amount_paid של Pledges
  ---------------------------------------------- */
  const statsByCampaign = useMemo(() => {
    type Stats = {
      totalDonations: number;
      totalPledgePaid: number;
    };
    const map = new Map<string, Stats>();

    // תרומות ישירות לקמפיין
    (donations as any[]).forEach((d) => {
      const cid = d.campaign_id as string | null | undefined;
      if (!cid) return;

      const amount = Number(d.amount || 0);
      if (!map.has(cid)) {
        map.set(cid, { totalDonations: 0, totalPledgePaid: 0 });
      }
      const cur = map.get(cid)!;
      cur.totalDonations += amount;
    });

    // סכומים ששולמו בפועל ב־pledges
    (pledges as any[]).forEach((p) => {
      const cid = p.campaign_id as string | null | undefined;
      if (!cid) return;

      const paid = Number(p.amount_paid || 0);
      if (!map.has(cid)) {
        map.set(cid, { totalDonations: 0, totalPledgePaid: 0 });
      }
      const cur = map.get(cid)!;
      cur.totalPledgePaid += paid;
    });

    return map;
  }, [donations, pledges]);

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          {t("campaigns.title") || "Campaigns"}
        </h1>

        <Button className="flex items-center gap-2" onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          {t("campaigns.create") || "Create Campaign"}
        </Button>
      </div>

      {/* CAMPAIGN CARDS */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((c) => {
          const orgCurrency =
            (c.organization_id && orgCurrencyMap.get(c.organization_id)) ||
            fallbackCurrency;

          const stats = statsByCampaign.get(c.id) || {
            totalDonations: 0,
            totalPledgePaid: 0,
          };

          const totalReceived =
            Number(stats.totalDonations || 0) +
            Number(stats.totalPledgePaid || 0);

          const goal = Number(c.goal_amount || 0);
          const remaining = goal > 0 ? Math.max(goal - totalReceived, 0) : null;
          const percent = goal > 0 ? (totalReceived / goal) * 100 : null;
          const clampedPercent = percent != null
            ? Math.min(Math.max(percent, 0), 200) // מאפשר גם מעל 100% אך מגביל קצת
            : null;

          let progressLabel = "";
          if (percent == null) {
            progressLabel = t("campaigns.noGoal") || "No goal set";
          } else if (percent >= 100) {
            progressLabel = t("campaigns.goalReached") || "Goal reached";
          } else {
            progressLabel = `${percent.toFixed(1)}%`;
          }

          return (
            <Card key={c.id} className="flex flex-col overflow-hidden">

              {/* BANNER */}
              {c.banner_url && (
                <div className="h-32 w-full overflow-hidden">
                  <img
                    src={c.banner_url}
                    className="w-full h-full object-cover"
                    alt={c.name}
                  />
                </div>
              )}

              <CardHeader className="flex justify-between gap-3">
                <div className="flex-1">
                  <CardTitle className="text-lg">{c.name}</CardTitle>

                  {c.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {c.description}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
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

              <CardContent className="space-y-3 text-sm text-gray-700 pb-4">
                {/* GOAL + RECEIVED + REMAINING */}
                <div className="space-y-1">
                  {c.goal_amount != null && (
                    <div>
                      <span className="font-semibold">
                        {t("campaigns.goalAmount") || "Goal"}:{" "}
                      </span>
                      {orgCurrency} {Number(c.goal_amount).toLocaleString()}
                    </div>
                  )}

                  <div>
                    <span className="font-semibold">
                      {t("campaigns.received") || "Received"}:{" "}
                    </span>
                    {orgCurrency} {totalReceived.toLocaleString()}
                  </div>

                  {remaining != null && (
                    <div>
                      <span className="font-semibold">
                        {t("campaigns.remaining") || "Remaining"}:{" "}
                      </span>
                      {orgCurrency} {remaining.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* PROGRESS BAR */}
                {percent != null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{progressLabel}</span>
                      <span>
                        {orgCurrency} {totalReceived.toLocaleString()}{" "}
                        / {orgCurrency} {goal.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-full ${
                          percent >= 100
                            ? "bg-green-500"
                            : "bg-blue-500"
                        }`}
                        style={{
                          width: `${Math.min(clampedPercent || 0, 100)}%`,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* DATES */}
                <div className="text-xs text-gray-500 space-x-4">
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
                </div>

                {/* CREATED */}
                <p className="text-xs text-gray-500">
                  {t("campaigns.createdAt") || "Created"}:{" "}
                  {new Date(c.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* EMPTY */}
      {!campaigns.length && (
        <div className="text-center text-gray-500 mt-10">
          {t("campaigns.empty") || "No campaigns yet."}
        </div>
      )}

      {/* MODALS */}
      <AddCampaignDialog open={showAdd} onClose={() => setShowAdd(false)} />

      <EditCampaignDialog
        open={!!editCampaign}
        onClose={() => setEditCampaign(null)}
        campaign={editCampaign}
      />
    </div>
  );
}

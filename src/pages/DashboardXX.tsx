import React, { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";

import { useDonors } from "@/hooks/useDonors";
import { useAllDonations } from "@/hooks/useDonations";
import { usePledges } from "@/hooks/usePledges";
import { useCampaigns } from "@/hooks/useCampaigns";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function Dashboard() {
  const { t } = useLanguage();
  const { organizationId, isGlobalSuperAdmin } = useUser();

  const { data: donors = [] } = useDonors({ search: "", organizationId });
  const { data: donations = [] } = useAllDonations();
  const { data: pledges = [] } = usePledges();
  const { data: campaigns = [] } = useCampaigns();

  /* ===================================================================
     KPI CALCULATIONS
  =================================================================== */

  const totalDonors = donors.length;

  const totalDonationsAmount = donations.reduce(
    (sum, d) => sum + Number(d.amount || 0),
    0
  );

  const totalPledgesAmount = pledges.reduce(
    (sum, p) => sum + Number(p.total_amount || 0),
    0
  );

  const activeCampaigns = campaigns.length;

  /* ===================================================================
     CHARTS — NEW DONORS OVER TIME
  =================================================================== */
  const donorsOverTime = useMemo(() => {
    const map = {};
    donors.forEach((d) => {
      const date = (d.created_at || "").substring(0, 10);
      if (!map[date]) map[date] = 0;
      map[date]++;
    });

    return Object.keys(map).sort().map((date) => ({
      date,
      count: map[date],
    }));
  }, [donors]);

  /* ===================================================================
     CHARTS — NEW DONATIONS OVER TIME
  =================================================================== */
  const donationsOverTime = useMemo(() => {
    const map = {};
    donations.forEach((d) => {
      const date = (d.date || "").substring(0, 10);
      if (!map[date]) map[date] = 0;
      map[date] += Number(d.amount);
    });

    return Object.keys(map).sort().map((date) => ({
      date,
      amount: map[date],
    }));
  }, [donations]);

  /* ===================================================================
     TOP DONORS
  =================================================================== */
  const topDonors = useMemo(() => {
    const map = {};

    donations.forEach((d) => {
      if (!map[d.donor_id]) {
        map[d.donor_id] = { id: d.donor_id, name: d.donor_name, total: 0 };
      }
      map[d.donor_id].total += Number(d.amount);
    });

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [donations]);

  /* ===================================================================
     CAMPAIGN PROGRESS
  =================================================================== */
  const campaignProgress = campaigns.map((c) => {
    const raised = donations
      .filter((d) => d.campaign_id === c.id)
      .reduce((sum, d) => sum + Number(d.amount), 0);

    return {
      id: c.id,
      name: c.name,
      goal: Number(c.goal_amount || 0),
      raised,
      progress:
        c.goal_amount > 0
          ? Math.round((raised / c.goal_amount) * 100)
          : 0,
    };
  });

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">

      <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.totalDonors")}</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{totalDonors}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.totalDonations")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              USD {totalDonationsAmount.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600">
              {donations.length} {t("dashboard.count")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.totalPledges")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              USD {totalPledgesAmount.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600">
              {pledges.length} {t("dashboard.count")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.activeCampaigns")}</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {activeCampaigns}
          </CardContent>
        </Card>
      </div>

      {/* NEW DONORS OVER TIME CHART */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.newDonorsOverTime")}</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={donorsOverTime}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* NEW DONATIONS OVER TIME */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.newDonationsOverTime")}</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={donationsOverTime}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#4ade80" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* TOP DONORS */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.topDonors.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {topDonors.map((d) => (
            <div key={d.id} className="flex justify-between border-b py-2">
              <span>{d.name}</span>
              <span className="font-semibold">
                USD {d.total.toLocaleString()}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* CAMPAIGN PROGRESS */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.campaignProgress.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {campaignProgress.map((c) => (
            <div key={c.id}>
              <div className="flex justify-between mb-1 text-sm">
                <span>{c.name}</span>
                <span>{c.progress}%</span>
              </div>

              <div className="w-full bg-gray-200 rounded h-3">
                <div
                  className="bg-blue-500 h-3 rounded"
                  style={{ width: `${c.progress}%` }}
                ></div>
              </div>

              <div className="text-xs text-gray-600 mt-1">
                {t("dashboard.raised")}: ${c.raised.toLocaleString()} / ${c.goal.toLocaleString()}
              </div>
            </div>
          ))}

        </CardContent>
      </Card>
    </div>
  );
}

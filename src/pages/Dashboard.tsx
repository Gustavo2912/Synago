// src/pages/Dashboard.tsx
import React, { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";

import { useDonors } from "@/hooks/useDonors";
import { useAllDonations } from "@/hooks/useDonations";
import { usePledges } from "@/hooks/usePledges";
import { usePaymentsForPledges } from "@/hooks/usePaymentsForPledges";
import { supabase } from "@/integrations/supabase/client";

import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer
} from "recharts";

import {
  Users,
  HandCoins,
  Receipt,
  BadgeDollarSign,
  Rocket,
  HandHeart,
  Handshake,
  CreditCard,
  ReceiptText,
  Target,
  BarChart3,
  LayoutDashboard,
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function Dashboard() {
  const { t } = useLanguage();
  const { organizationId, isGlobalSuperAdmin } = useUser();

  /* -------------------------------------------------
     LOAD DATA
  ------------------------------------------------- */
  const { data: donors = [] } = useDonors({ organizationId });
  const { data: donations = [] } = useAllDonations({}, organizationId);
  const { data: pledges = [] } = usePledges(organizationId);
  const paymentsQuery = usePaymentsForPledges(); // (donorId not needed here)

  const payments = paymentsQuery.data?.payments ?? [];

  /* -------------------------------------------------
     KPI VALUES
  ------------------------------------------------- */
  const totalDonors = donors.length;

  const totalDonationsAmount = donations.reduce(
    (s, d) => s + Number(d.amount || 0),
    0
  );
  const totalDonationsCount = donations.length;

  const totalPledgesAmount = pledges.reduce(
    (s, p) => s + Number(p.total_amount || 0),
    0
  );
  const totalPledgesCount = pledges.length;

  const totalPaymentsAmount = payments.reduce(
    (s, p) => s + Number(p.amount || 0),
    0
  );
  const totalPaymentsCount = payments.length;

  /* -------------------------------------------------
     LOAD CAMPAIGNS
  ------------------------------------------------- */
  const [campaigns, setCampaigns] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!organizationId) return;
    
    let q = supabase.from("campaigns").select("*");
    
    if (!isGlobalSuperAdmin) {
      q = q.eq("organization_id", organizationId);
    } else {
      if (organizationId !== "all") {
        q = q.eq("organization_id", organizationId);
      }
    }
    
    q.then(({ data }) => setCampaigns(data || []));
  }, [organizationId, isGlobalSuperAdmin]);


  /* -------------------------------------------------
     TIME SERIES HELPERS
  ------------------------------------------------- */
  const aggregateOverTime = (items: any[], dateField: string) => {
    const map: Record<string, number> = {};

    items.forEach((x) => {
      if (!x[dateField]) return;
      const d = new Date(x[dateField]).toISOString().slice(0, 10);
      if (!map[d]) map[d] = 0;
      map[d] += 1;
    });

    return Object.entries(map).map(([date, value]) => ({ date, value }));
  };

  const donorsOverTime = aggregateOverTime(donors, "created_at");
  const donationsOverTime = aggregateOverTime(donations, "date");
  const paymentsOverTime = aggregateOverTime(payments, "date");

  /* -------------------------------------------------
     TOP DONORS
  ------------------------------------------------- */
  const topDonors = useMemo(() => {
    const map: Record<string, { name: string; amount: number }> = {};

    donors.forEach((d) => {
      const userDonations = donations.filter((x) => x.donor_id === d.id);
      const sum = userDonations.reduce((s, x) => s + Number(x.amount || 0), 0);

      if (sum > 0) {
        map[d.id] = {
          name: d.display_name || `${d.first_name || ""} ${d.last_name || ""}`,
          amount: sum,
        };
      }
    });

    return Object.values(map)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [donors, donations]);

  /* -------------------------------------------------
     CAMPAIGN PROGRESS
  ------------------------------------------------- */
  const campaignProgress = campaigns.map((c) => {
    const raised = donations
      .filter((d) => d.campaign_id === c.id)
      .reduce((s, d) => s + Number(d.amount || 0), 0);

    return {
      name: c.name,
      goal: Number(c.goal_amount || 0),
      raised,
    };
  });

  /* -------------------------------------------------
     COLORS
  ------------------------------------------------- */
  const colors = ["#4ade80", "#60a5fa", "#f87171", "#fbbf24", "#a78bfa"];

  /* -------------------------------------------------
     RENDER
  ------------------------------------------------- */
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">

      {/* PAGE TITLE */}
      <div className="flex items-center gap-2">
        <LayoutDashboard className="w-7 h-7 text-purple-600" />
        <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" /> {t("dashboard.totalDonors")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-blue-600">
            {totalDonors}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandHeart className="w-5 h-5" /> {t("dashboard.totalDonations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalDonationsAmount.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {totalDonationsCount} donations
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="w-5 h-5" /> {t("dashboard.totalPledges")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              ${totalPledgesAmount.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {totalPledgesCount} pledges
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> {t("dashboard.totalPayments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              ${totalPaymentsAmount.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {totalPaymentsCount} payments
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" /> {t("dashboard.activeCampaigns")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-purple-600">
            {campaigns.length}
          </CardContent>
        </Card>

      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Donors Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.newDonorsOverTime")}</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={donorsOverTime}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area dataKey="value" stroke="#3b82f6" fill="#93c5fd" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donations Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.newDonationsOverTime")}</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={donationsOverTime}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line dataKey="value" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payments Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.newPaymentsOverTime")}</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={paymentsOverTime}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line dataKey="value" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Donors */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.topDonors")}</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDonors}>
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Campaign Progress */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.campaignProgress")}</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignProgress}>
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="raised" stackId="a" fill="#22c55e" />
                <Bar dataKey="goal" stackId="a" fill="#e5e7eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

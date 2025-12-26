import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';

interface DateRange {
  start: Date;
  end: Date;
}

interface DashboardStats {
  totalGross: number;
  totalNet: number;
  donationCount: number;
  average: number;
  receiptSuccessRate: number;
  pledgesTotalCommitted: number;
  pledgesTotalPaid: number;
  pledgesOutstanding: number;
  activePledgesCount: number;
}

export function useDashboardStats(range: DateRange, organizationId?: string | null, isSuperAdmin: boolean = false) {
  const [stats, setStats] = useState<DashboardStats>({
    totalGross: 0,
    totalNet: 0,
    donationCount: 0,
    average: 0,
    receiptSuccessRate: 0,
    pledgesTotalCommitted: 0,
    pledgesTotalPaid: 0,
    pledgesOutstanding: 0,
    activePledgesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [range.start, range.end]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch donation stats
      let donationsQuery = supabase
        .from('donations')
        .select('amount, net_amount, receipt_sent, status')
        .gte('created_at', startOfDay(range.start).toISOString())
        .lte('created_at', endOfDay(range.end).toISOString())
        .eq('status', 'Succeeded');

      // Filter by organization if not super admin
      if (!isSuperAdmin && organizationId) {
        donationsQuery = donationsQuery.eq('organization_id', organizationId);
      }

      const { data, error } = await donationsQuery;

      if (error) throw error;

      const totalGross = data?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
      const totalNet = data?.reduce((sum, d) => sum + Number(d.net_amount || d.amount), 0) || 0;
      const donationCount = data?.length || 0;
      const receiptsSent = data?.filter(d => d.receipt_sent).length || 0;

      // Fetch pledge stats
      let pledgesQuery = supabase
        .from('pledges')
        .select('total_amount, amount_paid, balance_owed, status');

      // Filter by organization if not super admin
      if (!isSuperAdmin && organizationId) {
        pledgesQuery = pledgesQuery.eq('organization_id', organizationId);
      }

      const { data: pledgesData, error: pledgesError } = await pledgesQuery;

      if (pledgesError) throw pledgesError;

      const pledgesTotalCommitted = pledgesData?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0;
      const pledgesTotalPaid = pledgesData?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;
      const pledgesOutstanding = pledgesData?.reduce((sum, p) => sum + Number(p.balance_owed), 0) || 0;
      const activePledgesCount = pledgesData?.filter(p => p.status === 'active').length || 0;

      setStats({
        totalGross,
        totalNet,
        donationCount,
        average: donationCount > 0 ? totalGross / donationCount : 0,
        receiptSuccessRate: donationCount > 0 ? (receiptsSent / donationCount) * 100 : 0,
        pledgesTotalCommitted,
        pledgesTotalPaid,
        pledgesOutstanding,
        activePledgesCount,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading };
}

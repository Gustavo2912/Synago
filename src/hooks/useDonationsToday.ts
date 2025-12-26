import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';

interface Donation {
  id: string;
  created_at: string;
  donor_name: string;
  phone?: string;
  email?: string;
  type: string;
  designation?: string;
  payment_method: string;
  amount: number;
  fee?: number;
  net_amount?: number;
  status: string;
  receipt_sent: boolean;
}

export function useDonationsToday() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonations();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('donations-today')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donations',
        },
        () => {
          fetchDonations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const today = new Date();
      
      const { data, error } = await supabase
        .from('donations')
        .select(`
          id,
          created_at,
          type,
          designation,
          payment_method,
          amount,
          fee,
          net_amount,
          status,
          receipt_sent,
          donor:donors (
            name,
            phone,
            email
          )
        `)
        .gte('created_at', startOfDay(today).toISOString())
        .lte('created_at', endOfDay(today).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(d => ({
        id: d.id,
        created_at: d.created_at,
        donor_name: (d.donor as any)?.name || 'Unknown',
        phone: (d.donor as any)?.phone,
        email: (d.donor as any)?.email,
        type: d.type,
        designation: d.designation,
        payment_method: d.payment_method,
        amount: Number(d.amount),
        fee: d.fee ? Number(d.fee) : undefined,
        net_amount: d.net_amount ? Number(d.net_amount) : undefined,
        status: d.status,
        receipt_sent: d.receipt_sent,
      })) || [];

      setDonations(formattedData);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  return { donations, loading, refetch: fetchDonations };
}

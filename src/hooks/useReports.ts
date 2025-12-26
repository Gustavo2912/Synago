import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

export type DonationReportRow = {
  id: string;
  date: string;
  donorName: string;
  phone?: string;
  email?: string;
  type: 'Regular' | 'Nedarim' | 'Aliyot' | 'Yahrzeit' | 'Other';
  designation?: string;
  paymentMethod: 'Cash' | 'Check' | 'Transfer' | 'CreditCard' | 'Zelle' | 'Other';
  amount: number;
  fee?: number;
  netAmount?: number;
  totalCharged?: number;
  receiptNumber: string;
  status: 'Pending' | 'Succeeded' | 'Failed' | 'Refunded' | 'Disputed';
};

export type ReportFilters = {
  startDate: string;
  endDate: string;
  donationTypes?: string[];
  paymentMethods?: string[];
  donorQuery?: string;
};

export async function fetchDonationReport(filters: ReportFilters): Promise<DonationReportRow[]> {
  let query = supabase
    .from('donations')
    .select(`
      id,
      created_at,
      amount,
      fee,
      net_amount,
      type,
      designation,
      payment_method,
      receipt_number,
      status,
      donors!inner (
        name,
        phone,
        email
      )
    `);

  // Date range filter
  query = query
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  // Donation types filter
  if (filters.donationTypes && filters.donationTypes.length > 0) {
    query = query.in('type', filters.donationTypes as any);
  }

  // Payment methods filter
  if (filters.paymentMethods && filters.paymentMethods.length > 0) {
    query = query.in('payment_method', filters.paymentMethods as any);
  }

  // Donor search filter
  if (filters.donorQuery) {
    query = query.or(
      `donors.name.ilike.%${filters.donorQuery}%,donors.email.ilike.%${filters.donorQuery}%,donors.phone.ilike.%${filters.donorQuery}%`
    );
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((row: any) => {
    const amount = Number(row.amount);
    const fee = row.fee ? Number(row.fee) : 0;
    const netAmount = row.net_amount ? Number(row.net_amount) : amount - fee;
    const totalCharged = amount + fee;

    return {
      id: row.id,
      date: row.created_at,
      donorName: row.donors?.name || 'Unknown',
      phone: row.donors?.phone,
      email: row.donors?.email,
      type: row.type,
      designation: row.designation,
      paymentMethod: row.payment_method,
      amount,
      fee: fee || undefined,
      netAmount,
      totalCharged,
      receiptNumber: row.receipt_number,
      status: row.status,
    };
  });
}

export async function exportReport(
  format: 'csv' | 'xlsx',
  filters: ReportFilters
): Promise<Blob> {
  const data = await fetchDonationReport(filters);

  // Prepare data for export
  const exportData = data.map((row) => ({
    'Date': new Date(row.date).toLocaleDateString(),
    'Receipt #': row.receiptNumber,
    'Donor': row.donorName,
    'Phone': row.phone || '',
    'Email': row.email || '',
    'Type': row.type,
    'Designation': row.designation || '',
    'Payment Method': row.paymentMethod,
    'Amount': row.amount,
    'Fee': row.fee || 0,
    'Net Amount': row.netAmount,
    'Total Charged': row.totalCharged,
    'Status': row.status,
  }));

  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Donations');

  // Set column widths
  const columnWidths = [
    { wch: 12 }, // Date
    { wch: 15 }, // Receipt #
    { wch: 20 }, // Donor
    { wch: 15 }, // Phone
    { wch: 25 }, // Email
    { wch: 10 }, // Type
    { wch: 20 }, // Designation
    { wch: 15 }, // Payment Method
    { wch: 10 }, // Amount
    { wch: 10 }, // Fee
    { wch: 12 }, // Net Amount
    { wch: 12 }, // Total Charged
    { wch: 12 }, // Status
  ];
  worksheet['!cols'] = columnWidths;

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  } else {
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// React Query hook
export function useDonationReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['donation-report', filters],
    queryFn: () => fetchDonationReport(filters),
    enabled: !!filters.startDate && !!filters.endDate,
  });
}

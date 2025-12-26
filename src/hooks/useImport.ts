import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

export type DonorInput = {
  phone: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  addressCity?: string;
  notes?: string;
};

export type DonationInput = {
  phone: string;
  amount: number;
  date?: string;
  type?: 'Regular' | 'Nedarim' | 'Aliyot' | 'Yahrzeit' | 'Other';
  designation?: string;
  paymentMethod?: 'Cash' | 'Check' | 'Transfer' | 'CreditCard' | 'Zelle' | 'Other';
  notes?: string;
};

export type PledgeInput = {
  phone: string;
  totalAmount: number;
  startDate?: string;
  frequency?: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
  notes?: string;
};

export type ParseResult<T> = {
  rows: T[];
  headers: string[];
  warnings: string[];
};

export async function parseCsvOrXlsx(
  file: File
): Promise<ParseResult<Record<string, string>>> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (jsonData.length === 0) {
    return { rows: [], headers: [], warnings: ['File is empty'] };
  }

  const headers = jsonData[0].map((h: any) => String(h).trim());
  const rows: Record<string, string>[] = [];
  const warnings: string[] = [];

  for (let i = 1; i < jsonData.length; i++) {
    const rowData = jsonData[i];
    if (rowData.every((cell: any) => !cell)) {
      warnings.push(`Row ${i + 1}: Empty row, skipping`);
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = rowData[idx] ? String(rowData[idx]).trim() : '';
    });
    rows.push(row);
  }

  return { rows, headers, warnings };
}

export async function fetchExistingDonorsSnapshot(): Promise<
  Array<{ id: string; phone: string; email?: string }>
> {
  const { data, error } = await supabase
    .from('donors')
    .select('id, phone, email');

  if (error) throw error;
  return data || [];
}

export async function validateDonors(rows: DonorInput[]): Promise<{
  valid: DonorInput[];
  toMerge: Array<{ incoming: DonorInput; existingId: string; reason: 'phone' | 'email' }>;
  errors: Array<{ row: DonorInput; issues: string[] }>;
}> {
  const valid: DonorInput[] = [];
  const toMerge: Array<{ incoming: DonorInput; existingId: string; reason: 'phone' | 'email' }> = [];
  const errors: Array<{ row: DonorInput; issues: string[] }> = [];

  // Fetch existing donors
  const existing = await fetchExistingDonorsSnapshot();
  const phoneMap = new Map(existing.map((d) => [d.phone, d.id]));
  const emailMap = new Map(
    existing.filter((d) => d.email).map((d) => [d.email!, d.id])
  );

  for (const row of rows) {
    const issues: string[] = [];

    // Validate phone (required)
    if (!row.phone || row.phone.trim() === '') {
      issues.push('Phone is required');
    }

    // Check for duplicates
    if (row.phone && phoneMap.has(row.phone)) {
      toMerge.push({
        incoming: row,
        existingId: phoneMap.get(row.phone)!,
        reason: 'phone',
      });
      continue;
    }

    if (row.email && emailMap.has(row.email)) {
      toMerge.push({
        incoming: row,
        existingId: emailMap.get(row.email)!,
        reason: 'email',
      });
      continue;
    }

    if (issues.length > 0) {
      errors.push({ row, issues });
    } else {
      valid.push(row);
    }
  }

  return { valid, toMerge, errors };
}

export async function simulateDonorImport(input: {
  valid: DonorInput[];
  toMerge: Array<{ incoming: DonorInput; existingId: string }>;
}): Promise<{ toAdd: number; toMerge: number; toSkip: number; detailsCsv: Blob }> {
  const toAdd = input.valid.length;
  const toMerge = input.toMerge.length;
  const toSkip = 0;

  // Generate details CSV
  const details: any[] = [];

  input.valid.forEach((row) => {
    details.push({
      Action: 'ADD',
      Phone: row.phone,
      Name: row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim(),
      Email: row.email || '',
      City: row.addressCity || '',
    });
  });

  input.toMerge.forEach(({ incoming, existingId }) => {
    details.push({
      Action: 'MERGE',
      Phone: incoming.phone,
      Name: incoming.displayName || `${incoming.firstName || ''} ${incoming.lastName || ''}`.trim(),
      Email: incoming.email || '',
      'Existing ID': existingId,
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(details);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Preview');

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const detailsCsv = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  return { toAdd, toMerge, toSkip, detailsCsv };
}

export async function commitDonorImport(input: {
  valid: DonorInput[];
  toMerge: Array<{ incoming: DonorInput; existingId: string }>;
  onProgress?: (p: {
    processed: number;
    added: number;
    merged: number;
    skipped: number;
  }) => void;
}): Promise<{ added: number; merged: number; skipped: number; resultCsv: Blob }> {
  let added = 0;
  let merged = 0;
  let skipped = 0;
  let processed = 0;

  const results: any[] = [];

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  // Add new donors
  for (const row of input.valid) {
    try {
      const { data, error } = await supabase
        .from('donors')
        .insert({
          phone: row.phone,
          name: row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Unknown',
          first_name: row.firstName,
          last_name: row.lastName,
          display_name: row.displayName,
          email: row.email,
          address_city: row.addressCity,
          notes: row.notes,
          created_by_user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      added++;
      results.push({
        Status: 'ADDED',
        Phone: row.phone,
        Name: row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim(),
        'Donor ID': data.id,
      });
    } catch (err: any) {
      skipped++;
      results.push({
        Status: 'FAILED',
        Phone: row.phone,
        Error: err.message,
      });
    }

    processed++;
    input.onProgress?.({ processed, added, merged, skipped });
  }

  // Merge existing donors
  for (const { incoming, existingId } of input.toMerge) {
    try {
      const updateData: any = {};
      if (incoming.firstName) updateData.first_name = incoming.firstName;
      if (incoming.lastName) updateData.last_name = incoming.lastName;
      if (incoming.displayName) updateData.display_name = incoming.displayName;
      if (incoming.email) updateData.email = incoming.email;
      if (incoming.addressCity) updateData.address_city = incoming.addressCity;
      if (incoming.notes) updateData.notes = incoming.notes;

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('donors')
          .update(updateData)
          .eq('id', existingId);

        if (error) throw error;
      }

      merged++;
      results.push({
        Status: 'MERGED',
        Phone: incoming.phone,
        'Existing ID': existingId,
      });
    } catch (err: any) {
      skipped++;
      results.push({
        Status: 'FAILED',
        Phone: incoming.phone,
        Error: err.message,
      });
    }

    processed++;
    input.onProgress?.({ processed, added, merged, skipped });
  }

  // Generate result CSV
  const worksheet = XLSX.utils.json_to_sheet(results);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Results');

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const resultCsv = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  return { added, merged, skipped, resultCsv };
}

export async function validateDonations(rows: DonationInput[]): Promise<{
  valid: DonationInput[];
  linkFailed: Array<{
    row: DonationInput;
    reason: 'missing_donor' | 'invalid_amount' | 'invalid_date';
  }>;
  errors: Array<{ row: DonationInput; issues: string[] }>;
}> {
  const valid: DonationInput[] = [];
  const linkFailed: Array<{
    row: DonationInput;
    reason: 'missing_donor' | 'invalid_amount' | 'invalid_date';
  }> = [];
  const errors: Array<{ row: DonationInput; issues: string[] }> = [];

  // Fetch existing donors
  const existing = await fetchExistingDonorsSnapshot();
  const phoneMap = new Map(existing.map((d) => [d.phone, d.id]));

  for (const row of rows) {
    const issues: string[] = [];

    // Validate phone (required to link donor)
    if (!row.phone || row.phone.trim() === '') {
      issues.push('Phone is required');
    } else if (!phoneMap.has(row.phone)) {
      linkFailed.push({ row, reason: 'missing_donor' });
      continue;
    }

    // Validate amount
    if (!row.amount || isNaN(row.amount) || row.amount <= 0) {
      linkFailed.push({ row, reason: 'invalid_amount' });
      continue;
    }

    // Validate date
    if (row.date && isNaN(Date.parse(row.date))) {
      linkFailed.push({ row, reason: 'invalid_date' });
      continue;
    }

    if (issues.length > 0) {
      errors.push({ row, issues });
    } else {
      valid.push(row);
    }
  }

  return { valid, linkFailed, errors };
}

export async function simulateDonationImport(input: {
  valid: DonationInput[];
}): Promise<{ toAdd: number; toSkip: number; detailsCsv: Blob }> {
  const toAdd = input.valid.length;
  const toSkip = 0;

  const details: any[] = input.valid.map((row) => ({
    Action: 'ADD',
    Phone: row.phone,
    Amount: row.amount,
    Date: row.date || new Date().toISOString(),
    Type: row.type || 'Regular',
    'Payment Method': row.paymentMethod || 'Cash',
    Designation: row.designation || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(details);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Preview');

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const detailsCsv = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  return { toAdd, toSkip, detailsCsv };
}

export async function commitDonationImport(input: {
  valid: DonationInput[];
  onProgress?: (p: { processed: number; added: number; skipped: number }) => void;
}): Promise<{ added: number; skipped: number; resultCsv: Blob }> {
  let added = 0;
  let skipped = 0;
  let processed = 0;

  const results: any[] = [];

  // Fetch donor phone to ID mapping
  const existing = await fetchExistingDonorsSnapshot();
  const phoneMap = new Map(existing.map((d) => [d.phone, d.id]));

  for (const row of input.valid) {
    try {
      const donorId = phoneMap.get(row.phone);
      if (!donorId) {
        throw new Error('Donor not found');
      }

      const { data, error } = await supabase
        .from('donations')
        .insert({
          donor_id: donorId,
          amount: row.amount,
          type: row.type || 'Regular',
          payment_method: row.paymentMethod || 'Cash',
          designation: row.designation,
          notes: row.notes,
          created_at: row.date || new Date().toISOString(),
          status: 'Succeeded',
        })
        .select()
        .single();

      if (error) throw error;

      added++;
      results.push({
        Status: 'ADDED',
        Phone: row.phone,
        Amount: row.amount,
        'Receipt Number': data.receipt_number,
        'Donation ID': data.id,
      });
    } catch (err: any) {
      skipped++;
      results.push({
        Status: 'FAILED',
        Phone: row.phone,
        Amount: row.amount,
        Error: err.message,
      });
    }

    processed++;
    input.onProgress?.({ processed, added, skipped });
  }

  // Generate result CSV
  const worksheet = XLSX.utils.json_to_sheet(results);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Results');

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const resultCsv = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  return { added, skipped, resultCsv };
}

export async function validatePledges(rows: PledgeInput[]): Promise<{
  valid: PledgeInput[];
  linkFailed: Array<{
    row: PledgeInput;
    reason: 'missing_donor' | 'invalid_amount' | 'invalid_date';
  }>;
  errors: Array<{ row: PledgeInput; issues: string[] }>;
}> {
  const valid: PledgeInput[] = [];
  const linkFailed: Array<{
    row: PledgeInput;
    reason: 'missing_donor' | 'invalid_amount' | 'invalid_date';
  }> = [];
  const errors: Array<{ row: PledgeInput; issues: string[] }> = [];

  const existing = await fetchExistingDonorsSnapshot();
  const phoneMap = new Map(existing.map((d) => [d.phone, d.id]));

  for (const row of rows) {
    const issues: string[] = [];

    if (!row.phone || row.phone.trim() === '') {
      issues.push('Phone is required');
    } else if (!phoneMap.has(row.phone)) {
      linkFailed.push({ row, reason: 'missing_donor' });
      continue;
    }

    if (!row.totalAmount || isNaN(row.totalAmount) || row.totalAmount <= 0) {
      linkFailed.push({ row, reason: 'invalid_amount' });
      continue;
    }

    if (row.startDate && isNaN(Date.parse(row.startDate))) {
      linkFailed.push({ row, reason: 'invalid_date' });
      continue;
    }

    if (issues.length > 0) {
      errors.push({ row, issues });
    } else {
      valid.push(row);
    }
  }

  return { valid, linkFailed, errors };
}

export async function simulatePledgeImport(input: {
  valid: PledgeInput[];
}): Promise<{ toAdd: number; toSkip: number; detailsCsv: Blob }> {
  const toAdd = input.valid.length;
  const toSkip = 0;

  const details: any[] = input.valid.map((row) => ({
    Action: 'ADD',
    Phone: row.phone,
    'Total Amount': row.totalAmount,
    'Start Date': row.startDate || new Date().toISOString(),
    Frequency: row.frequency || 'monthly',
    Notes: row.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(details);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Preview');

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const detailsCsv = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  return { toAdd, toSkip, detailsCsv };
}

export async function commitPledgeImport(input: {
  valid: PledgeInput[];
  onProgress?: (p: { processed: number; added: number; skipped: number }) => void;
}): Promise<{ added: number; skipped: number; resultCsv: Blob }> {
  let added = 0;
  let skipped = 0;
  let processed = 0;

  const results: any[] = [];

  const existing = await fetchExistingDonorsSnapshot();
  const phoneMap = new Map(existing.map((d) => [d.phone, d.id]));

  for (const row of input.valid) {
    try {
      const donorId = phoneMap.get(row.phone);
      if (!donorId) {
        throw new Error('Donor not found');
      }

      const { data, error } = await supabase
        .from('pledges')
        .insert({
          donor_id: donorId,
          total_amount: row.totalAmount,
          start_date: row.startDate || new Date().toISOString().split('T')[0],
          frequency: row.frequency || 'monthly',
          notes: row.notes,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      added++;
      results.push({
        Status: 'ADDED',
        Phone: row.phone,
        'Total Amount': row.totalAmount,
        'Pledge ID': data.id,
      });
    } catch (err: any) {
      skipped++;
      results.push({
        Status: 'FAILED',
        Phone: row.phone,
        'Total Amount': row.totalAmount,
        Error: err.message,
      });
    }

    processed++;
    input.onProgress?.({ processed, added, skipped });
  }

  const worksheet = XLSX.utils.json_to_sheet(results);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Results');

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const resultCsv = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  return { added, skipped, resultCsv };
}

// ============= Yahrzeit Import =============

export type YahrzeitInput = {
  phone: string;
  deceasedName: string;
  hebrewDate: string;
  secularDate: string;
  relationship?: string;
  notes?: string;
  contactEmail?: string;
  contactPhone?: string;
};

export async function validateYahrzeits(rows: YahrzeitInput[]): Promise<{
  valid: YahrzeitInput[];
  linkFailed: Array<{
    row: YahrzeitInput;
    reason: 'missing_donor' | 'invalid_date' | 'missing_required';
  }>;
  errors: Array<{ row: YahrzeitInput; issues: string[] }>;
}> {
  const valid: YahrzeitInput[] = [];
  const linkFailed: Array<{
    row: YahrzeitInput;
    reason: 'missing_donor' | 'invalid_date' | 'missing_required';
  }> = [];
  const errors: Array<{ row: YahrzeitInput; issues: string[] }> = [];

  // Fetch existing donors
  const existing = await fetchExistingDonorsSnapshot();
  const phoneMap = new Map(existing.map((d) => [d.phone, d.id]));

  for (const row of rows) {
    const issues: string[] = [];

    // Check required fields
    if (!row.phone) issues.push('Missing phone');
    if (!row.deceasedName) issues.push('Missing deceased name');
    if (!row.hebrewDate) issues.push('Missing Hebrew date');
    if (!row.secularDate) issues.push('Missing secular date');

    if (issues.length > 0) {
      linkFailed.push({ row, reason: 'missing_required' });
      continue;
    }

    // Check if donor exists
    if (!phoneMap.has(row.phone)) {
      linkFailed.push({ row, reason: 'missing_donor' });
      continue;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(row.secularDate)) {
      linkFailed.push({ row, reason: 'invalid_date' });
      continue;
    }

    valid.push(row);
  }

  return { valid, linkFailed, errors };
}

export async function simulateYahrzeitImport(input: {
  valid: YahrzeitInput[];
}): Promise<{ toAdd: number; toSkip: number; detailsCsv: Blob }> {
  const details = input.valid.map((row) => ({
    Phone: row.phone,
    'Deceased Name': row.deceasedName,
    'Hebrew Date': row.hebrewDate,
    'Secular Date': row.secularDate,
    Relationship: row.relationship || '',
    Notes: row.notes || '',
    'Contact Email': row.contactEmail || '',
    'Contact Phone': row.contactPhone || '',
    Action: 'Will Add',
  }));

  const worksheet = XLSX.utils.json_to_sheet(details);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Simulation');

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const detailsCsv = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  return {
    toAdd: input.valid.length,
    toSkip: 0,
    detailsCsv,
  };
}

export async function commitYahrzeitImport(input: {
  valid: YahrzeitInput[];
  onProgress?: (p: { processed: number; added: number; skipped: number }) => void;
}): Promise<{ added: number; skipped: number; resultCsv: Blob }> {
  let added = 0;
  let skipped = 0;
  let processed = 0;
  const results: any[] = [];

  // Fetch existing donors
  const existing = await fetchExistingDonorsSnapshot();
  const phoneMap = new Map(existing.map((d) => [d.phone, d.id]));

  for (const row of input.valid) {
    try {
      const donorId = phoneMap.get(row.phone);
      if (!donorId) {
        throw new Error('Donor not found');
      }

      const { data, error } = await supabase.from('yahrzeits').insert({
        donor_id: donorId,
        deceased_name: row.deceasedName,
        hebrew_date: row.hebrewDate,
        secular_date: row.secularDate,
        relationship: row.relationship || null,
        notes: row.notes || null,
        contact_email: row.contactEmail || null,
        contact_phone: row.contactPhone || null,
      }).select().single();

      if (error) throw error;

      added++;
      results.push({
        Status: 'SUCCESS',
        Phone: row.phone,
        'Deceased Name': row.deceasedName,
        'Yahrzeit ID': data.id,
      });
    } catch (err: any) {
      skipped++;
      results.push({
        Status: 'FAILED',
        Phone: row.phone,
        'Deceased Name': row.deceasedName,
        Error: err.message,
      });
    }

    processed++;
    input.onProgress?.({ processed, added, skipped });
  }

  const worksheet = XLSX.utils.json_to_sheet(results);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Results');

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const resultCsv = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  return { added, skipped, resultCsv };
}

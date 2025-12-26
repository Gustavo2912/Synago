import { supabase } from '@/integrations/supabase/client';

interface Donor {
  id: string;
  display: string;
}

export async function searchDonors(query: string): Promise<Donor[]> {
  try {
    const { data, error } = await supabase
      .from('donors')
      .select('id, name, email, phone')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;

    return data?.map(d => ({
      id: d.id,
      display: `${d.name}${d.email ? ` (${d.email})` : ''}${d.phone ? ` - ${d.phone}` : ''}`,
    })) || [];
  } catch (error) {
    console.error('Error searching donors:', error);
    return [];
  }
}

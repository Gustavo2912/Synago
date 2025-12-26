import { supabase } from "@/integrations/supabase/client";

export async function uploadHomeImage(
  file: File,
  path: string
): Promise<string> {
  const { error } = await supabase.storage
    .from("home-pages")
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from("home-pages")
    .getPublicUrl(path);

  return data.publicUrl;
}

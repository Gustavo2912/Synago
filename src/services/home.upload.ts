// src/services/home.upload.ts
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "home-media";

export async function uploadHomeImage(params: {
  file: File;
  path: string; // path דטרמיניסטי כדי שנוכל upsert
  upsert?: boolean;
}) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(params.path, params.file, {
      cacheControl: "3600",
      upsert: params.upsert ?? true,
      contentType: params.file.type || undefined,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(params.path);
  return data.publicUrl;
}

export async function removeHomeImage(path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

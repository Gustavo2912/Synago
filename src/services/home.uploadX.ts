// src/pages/home/home.upload.ts
import { supabase } from "@/integrations/supabase/client";

export async function uploadHomeImage(params: {
  file: File;
  organizationId: string | "all";
}) {
  const ext = params.file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;

  const basePath =
    params.organizationId === "all"
      ? "home/global"
      : `home/org/${params.organizationId}`;

  const path = `${basePath}/${fileName}`;

  const { error } = await supabase.storage
    .from("home-media") // ⬅️ זהה בדיוק ל-bucket
    .upload(path, params.file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("home-media")
    .getPublicUrl(path);

  return data.publicUrl;
}

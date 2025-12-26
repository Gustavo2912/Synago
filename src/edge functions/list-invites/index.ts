import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ---------- CORS ---------- */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  /* ---------- Preflight ---------- */
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { organization_id, summary } = body;

    const now = new Date().toISOString();

    let query = supabase
      .from("invites")
      .select(`
        id,
        email,
        role,
        organization_id,
        created_at,
        expires_at,
        accepted_at,
        cancelled_at
      `)
      .is("accepted_at", null)
      .is("cancelled_at", null)
      .gt("expires_at", now);

    // סינון ארגון – רק אם לא ALL
    if (organization_id && organization_id !== "all") {
      query = query.eq("organization_id", organization_id);
    }

    const { data, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    /* ---------- Summary Mode ---------- */
    if (summary) {
      const map: Record<string, number> = {};
      for (const invite of data ?? []) {
        map[invite.organization_id] =
          (map[invite.organization_id] || 0) + 1;
      }

      return new Response(
        JSON.stringify({ summary: map }),
        { status: 200, headers: corsHeaders }
      );
    }

    /* ---------- List Mode ---------- */
    return new Response(
      JSON.stringify({ invites: data }),
      { status: 200, headers: corsHeaders }
    );

  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

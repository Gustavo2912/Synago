import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // ✅ Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { organization_id, summary } = await req.json();

    let query = supabase
      .from("invites")
      .select("organization_id")
      .is("accepted_at", null)
      .is("cancelled_at", null)
      .gt("expires_at", new Date().toISOString());

    // ✅ חשוב: לא להכניס "all" ל־UUID
    if (organization_id && organization_id !== "all") {
      query = query.eq("organization_id", organization_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    // -------- SUMMARY --------
    if (summary) {
      const result: Record<string, number> = {};
      for (const row of data ?? []) {
        result[row.organization_id] =
          (result[row.organization_id] ?? 0) + 1;
      }

      return new Response(
        JSON.stringify({ summary: result }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // -------- FULL LIST --------
    return new Response(
      JSON.stringify({ invites: data ?? [] }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});

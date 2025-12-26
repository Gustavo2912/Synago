import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { user_id, status } = await req.json();

    if (!user_id || !status) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
    );

    if (status === "active") {
      await supabase.auth.admin.updateUserById(user_id, { ban_duration: null });
    } else {
      await supabase.auth.admin.updateUserById(user_id, { ban_duration: "indefinite" });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400 });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

/* ================= ENV ================= */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/* ================= SETUP ================= */

const adminClient = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/* ================= HANDLER ================= */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    /* ---------- AUTH (who creates user) ---------- */
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: caller } =
      await adminClient.auth.getUser(token);

    if (!caller?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    /* ---------- INPUT ---------- */
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      position,
      organization_id,
      role,
    } = await req.json();

    if (!email || !password || !organization_id || !role) {
      return json(
        { error: "Missing required fields" },
        400
      );
    }

    /* ---------- CREATE AUTH USER ---------- */
    const { data: createdUser, error: createUserError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name,
          last_name,
        },
      });

    if (createUserError || !createdUser?.user) {
      return json(
        { error: createUserError?.message || "Failed to create user" },
        400
      );
    }

    const userId = createdUser.user.id;

    /* ---------- CREATE PROFILE ---------- */
    await adminClient.from("profiles").insert({
      user_id: userId,
      email,
      first_name,
      last_name,
      phone,
      position,
    });

    /* ---------- CREATE ROLE ---------- */
    await adminClient.from("user_roles").insert({
      user_id: userId,
      organization_id,
      role,
      suspended: false,
    });

    return json({ success: true });
  } catch (err: any) {
    console.error("add-user error:", err);
    return json(
      { error: err.message || "Server error" },
      500
    );
  }
});

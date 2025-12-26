import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import { verify } from "https://deno.land/x/djwt@v2.9/mod.ts";

/* ================= ENV ================= */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INVITE_JWT_SECRET = Deno.env.get("INVITE_JWT_SECRET")!;

/* ================= SETUP ================= */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toCryptoKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

/* ================= HANDLER ================= */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    /* ---------- AUTH USER ---------- */
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const tokenJwt = authHeader.replace("Bearer ", "");
    const { data: authData } = await adminClient.auth.getUser(tokenJwt);

    if (!authData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const user = authData.user;

    /* ---------- BODY ---------- */
    const { token } = await req.json();
    if (!token) {
      return json({ error: "token is required" }, 400);
    }

    /* ---------- VERIFY INVITE TOKEN ---------- */
    let payload: any;
    try {
      payload = await verify(token, await toCryptoKey(INVITE_JWT_SECRET));
    } catch {
      return json({ error: "Invalid or expired invite token" }, 401);
    }

    const invite_id = payload?.invite_id;
    if (!invite_id) {
      return json({ error: "Invalid token payload" }, 400);
    }

    /* ---------- LOAD INVITE ---------- */
    const { data: invite } = await adminClient
      .from("invites")
      .select("id,email,organization_id,role,expires_at,accepted_at")
      .eq("id", invite_id)
      .maybeSingle();

    if (!invite) {
      return json({ error: "Invite not found" }, 404);
    }

    if (invite.accepted_at) {
      return json(
        {
          error: "INVITE_ALREADY_ACCEPTED",
          message: "This invitation was already accepted.",
        },
        409 // Conflict
      );
    }

    if (new Date(invite.expires_at) <= new Date()) {
      return json({ error: "Invite expired" }, 410);
    }

    /* ---------- EMAIL MATCH ---------- */
    if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return json(
        { error: "Invite email does not match logged in user" },
        403
      );
    }

    /* ---------- PREVENT DUPLICATE ROLE ---------- */
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", invite.organization_id)
      .maybeSingle();

    if (existingRole) {
      return json(
        { error: "User already belongs to this organization" },
        409
      );
    }

    /* ---------- CREATE USER ROLE ---------- */
    await adminClient.from("user_roles").insert({
      user_id: user.id,
      organization_id: invite.organization_id,
      role: invite.role,
      suspended: false,
    });

    /* ---------- MARK INVITE ACCEPTED ---------- */
    await adminClient
      .from("invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return json({ success: true });
  } catch (err: any) {
    console.error("accept-invite error:", err);
    return json({ error: err.message || "Server error" }, 500);
  }
});

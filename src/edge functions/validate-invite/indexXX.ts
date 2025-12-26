import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import { verify } from "https://deno.land/x/djwt@v2.9/mod.ts";

/* ================= ENV ================= */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INVITE_JWT_SECRET = Deno.env.get("INVITE_JWT_SECRET")!;

/* ================= SETUP ================= */

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

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
    const { token } = await req.json();
    if (!token) {
      return json({ error: "token is required" }, 400);
    }

    /* ---------- VERIFY TOKEN ---------- */
    let payload: any;
    try {
      payload = await verify(
        token,
        await toCryptoKey(INVITE_JWT_SECRET)
      );
    } catch {
      return json({ error: "INVALID_TOKEN" }, 401);
    }

    const invite_id = payload?.invite_id;
    if (!invite_id) {
      return json({ error: "INVALID_TOKEN_PAYLOAD" }, 400);
    }

    /* ---------- LOAD INVITE ---------- */
    const { data: invite } = await adminClient
      .from("invites")
      .select(
        "id,email,organization_id,role,expires_at,accepted_at,cancelled_at"
      )
      .eq("id", invite_id)
      .maybeSingle();

    if (!invite) {
      return json({ error: "INVITE_NOT_FOUND" }, 404);
    }

    if (invite.cancelled_at) {
      return json({ error: "INVITE_CANCELLED" }, 410);
    }

    if (invite.accepted_at) {
      return json({ error: "INVITE_ALREADY_ACCEPTED" }, 410);
    }

    if (new Date(invite.expires_at) <= new Date()) {
      return json({ error: "INVITE_EXPIRED" }, 410);
    }

    /* ---------- CHECK USER + MEMBERSHIP ---------- */
    let user_exists = false;
    let already_member = false;

    const { data: users } =
      await adminClient.auth.admin.listUsers({
        email: invite.email,
      });

    if (users?.users?.length) {
      user_exists = true;
      const userId = users.users[0].id;

      const { data: role } = await adminClient
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("organization_id", invite.organization_id)
        .maybeSingle();

      if (role) {
        already_member = true;
      }
    }

    /* ---------- LOAD ORG NAME ---------- */
    const { data: org } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", invite.organization_id)
      .single();

    return json({
      email: invite.email,
      role: invite.role,
      organization_id: invite.organization_id,
      organization_name: org?.name ?? "Organization",
      user_exists,
      already_member,
    });
  } catch (err: any) {
    console.error("validate-invite error:", err);
    return json({ error: "Server error" }, 500);
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import { verify } from "https://deno.land/x/djwt@v2.9/mod.ts";

/* ================= ENV ================= */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INVITE_JWT_SECRET =
  Deno.env.get("INVITE_JWT_SECRET")!;

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
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function toCryptoKey(secret: string) {
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
      return json({ error: "token required" }, 400);
    }

    /* ---------- VERIFY JWT ---------- */
    let payload: any;
    try {
      payload = await verify(
        token,
        await toCryptoKey(INVITE_JWT_SECRET)
      );
    } catch {
      return json(
        { error: "Invalid or expired invite token" },
        401
      );
    }

    const invite_id = payload?.invite_id;
    if (!invite_id) {
      return json({ error: "Invalid token payload" }, 400);
    }

    /* ---------- LOAD INVITE ---------- */
    const { data: invite } = await adminClient
      .from("invites")
      .select(
        `
        email,
        role,
        organization_id,
        expires_at,
        accepted_at,
        cancelled_at,
        organizations(name)
      `
      )
      .eq("id", invite_id)
      .maybeSingle();

    if (!invite) {
      return json({ error: "Invite not found" }, 404);
    }

    if (invite.accepted_at || invite.cancelled_at) {
      return json(
        { error: "Invite is no longer active" },
        409
      );
    }

    if (new Date(invite.expires_at) <= new Date()) {
      return json({ error: "Invite expired" }, 410);
    }

    /* ---------- 🔑 CHECK USER EXISTS (CRITICAL FIX) ---------- */
    const { data: authUser } =
      await adminClient
        .from("auth.users")
        .select("id")
        .eq("email", invite.email.toLowerCase())
        .maybeSingle();

    const user_exists = !!authUser;

    /* ---------- RESPONSE ---------- */
    return json({
      email: invite.email,
      role: invite.role,
      organization_name:
        invite.organizations?.name ?? "an organization",
      user_exists,
    });
  } catch (err: any) {
    console.error("validate-invite error:", err);
    return json(
      { error: err.message || "Server error" },
      500
    );
  }
});

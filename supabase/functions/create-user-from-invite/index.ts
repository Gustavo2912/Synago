import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import { verify } from "https://deno.land/x/djwt@v2.9/mod.ts";

/* ================= ENV ================= */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INVITE_JWT_SECRET = Deno.env.get("INVITE_JWT_SECRET")!;

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
    const { token, password, first_name, last_name } = await req.json();

    if (!token || !password) {
      return json({ error: "token and password are required" }, 400);
    }

    /* ---------- VERIFY INVITE TOKEN ---------- */
    let payload: any;
    try {
      payload = await verify(token, await toCryptoKey(INVITE_JWT_SECRET));
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
      .select("id,email,organization_id,role,expires_at,accepted_at,cancelled_at")
      .eq("id", invite_id)
      .maybeSingle();

    if (!invite) return json({ error: "INVITE_NOT_FOUND" }, 404);
    if (invite.cancelled_at) return json({ error: "INVITE_CANCELLED" }, 410);
    if (invite.accepted_at) return json({ error: "INVITE_ALREADY_ACCEPTED" }, 410);
    if (new Date(invite.expires_at) <= new Date())
      return json({ error: "INVITE_EXPIRED" }, 410);

    const email = invite.email.toLowerCase().trim();

    /* ---------- CREATE AUTH USER ---------- */
    const { data: created, error: createErr } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: first_name ?? null,
          last_name: last_name ?? null,
        },
      });

    if (createErr || !created?.user) {
      return json(
        { error: createErr?.message || "FAILED_TO_CREATE_USER" },
        500
      );
    }

    const userId = created.user.id;

    /* ---------- ASSIGN ROLE ---------- */
    const { error: roleErr } = await adminClient
      .from("user_roles")
      .insert({
        user_id: userId,
        organization_id: invite.organization_id,
        role: invite.role,
        suspended: false,
      });

    if (roleErr) {
      console.error("ROLE INSERT ERROR:", roleErr);

      // rollback
      await adminClient.auth.admin.deleteUser(userId);

      return json(
        {
          error: "FAILED_TO_ASSIGN_ROLE",
          details: roleErr.message,
        },
        500
      );
    }

    /* ---------- MARK INVITE ACCEPTED ---------- */
    await adminClient
      .from("invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return json({ success: true });
  } catch (err: any) {
    console.error("create-user-from-invite:", err);
    return json({ error: "SERVER_ERROR" }, 500);
  }
});

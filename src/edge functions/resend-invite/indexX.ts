import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.9/mod.ts";

/* ================= ENV ================= */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("APP_RESEND_API_KEY")!;
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

async function toCryptoKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function getSetting(key: string): Promise<string> {
  const { data, error } = await adminClient
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error || !data?.value) {
    throw new Error(`${key} is not configured`);
  }

  return data.value;
}

/* ================= HANDLER ================= */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    /* ---------- AUTH ---------- */
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const { data: authData } =
      await adminClient.auth.getUser(accessToken);

    if (!authData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    /* ---------- INPUT ---------- */
    const { invite_id } = await req.json();
    if (!invite_id) {
      return json({ error: "invite_id is required" }, 400);
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

    /* ---------- ONLY ACTIVE INVITES CAN BE RESENT ---------- */
    if (
      invite.accepted_at ||
      invite.cancelled_at ||
      new Date(invite.expires_at) <= new Date()
    ) {
      return json({
        success: true,
        skipped: true,
        reason: "Invite is not active",
      });
    }

    /* ---------- SETTINGS ---------- */
    const SYSTEM_EMAIL = await getSetting("SYSTEM_EMAIL");
    const APP_URL = await getSetting("APP_URL");

    /* ---------- LOAD ORGANIZATION NAME ---------- */
    const { data: org, error: orgError } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", invite.organization_id)
      .single();

    if (orgError || !org?.name) {
      throw new Error("Failed to load organization name");
    }

    const organizationName = org.name;

    /* ---------- CREATE TOKEN ---------- */
    const secondsLeft = Math.floor(
      (new Date(invite.expires_at).getTime() - Date.now()) / 1000
    );

    const token = await create(
      { alg: "HS256", typ: "JWT" },
      {
        invite_id: invite.id,
        exp: getNumericDate(secondsLeft),
      },
      await toCryptoKey(INVITE_JWT_SECRET)
    );

    const inviteLink =
      `${APP_URL}/#/invite/accept?token=${token}`;

    /* ---------- SEND EMAIL ---------- */
    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Synago <${SYSTEM_EMAIL}>`,
          to: [invite.email],
          subject: `Reminder: Invitation to join ${organizationName}`,
          html: `
            <p>
              This is a reminder to join
              <b>${organizationName}</b>
              on <b>Synago</b>.
            </p>

            <p>
              Assigned role: <b>${invite.role}</b>
            </p>

            <p>
              <a href="${inviteLink}">
                Click here to accept the invitation
              </a>
            </p>

            <p style="font-size:12px;color:#666;">
              This invitation will expire on
              ${new Date(invite.expires_at).toLocaleDateString()}.
            </p>
          `,
        }),
      }
    );

    if (!resendResponse.ok) {
      const text = await resendResponse.text();
      console.error("Resend error:", text);
      return json(
        { error: "FAILED_TO_SEND_EMAIL", details: text },
        500
      );
    }

    return json({ success: true });
  } catch (err: any) {
    console.error("resend-invite error:", err);
    return json(
      { error: err.message || "Server error" },
      500
    );
  }
});

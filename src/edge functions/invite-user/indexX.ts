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
    const { data: inviterData } =
      await adminClient.auth.getUser(accessToken);

    if (!inviterData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const inviterId = inviterData.user.id;

    /* ---------- INPUT ---------- */
    const { email, role, organization_id } = await req.json();

    if (!email || !role || !organization_id) {
      return json(
        { error: "email, role, organization_id required" },
        400
      );
    }

    /* ---------- BLOCK ONLY IF ACTIVE INVITE EXISTS ---------- */
    const { data: activeInvite } = await adminClient
      .from("invites")
      .select("id")
      .eq("email", email)
      .eq("organization_id", organization_id)
      .eq("role", role)
      .is("accepted_at", null)
      .is("cancelled_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (activeInvite) {
      return json(
        {
          error: "ACTIVE_INVITE_EXISTS",
          message: "An active invitation already exists",
        },
        409
      );
    }

    /* ---------- SETTINGS ---------- */
    const SYSTEM_EMAIL = await getSetting("SYSTEM_EMAIL");
    const APP_URL = await getSetting("APP_URL");

    /* ---------- LOAD ORGANIZATION NAME ---------- */
    const { data: org, error: orgError } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();

    if (orgError || !org?.name) {
      throw new Error("Failed to load organization name");
    }

    const organizationName = org.name;

    /* ---------- CREATE INVITE ---------- */
    const expiresInSeconds = 60 * 60 * 24 * 7; // 7 days

    const { data: invite, error: inviteError } =
      await adminClient
        .from("invites")
        .insert({
          email,
          organization_id,
          role,
          invited_by: inviterId,
          expires_at: new Date(
            Date.now() + expiresInSeconds * 1000
          ).toISOString(),
        })
        .select()
        .single();

    if (inviteError || !invite) {
      console.error("invite insert error:", inviteError);
      return json({ error: "Failed to create invite" }, 500);
    }

    /* ---------- CREATE TOKEN ---------- */
    const token = await create(
      { alg: "HS256", typ: "JWT" },
      {
        invite_id: invite.id,
        exp: getNumericDate(expiresInSeconds),
      },
      await toCryptoKey(INVITE_JWT_SECRET)
    );

    const inviteLink = `${APP_URL}/#/invite/accept?token=${token}`;

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
          to: [email],
          subject: `Invitation to join ${organizationName}`,
          html: `
            <p>
              You were invited to join
              <b>${organizationName}</b>
              on <b>Synago</b>.
            </p>

            <p>
              Assigned role: <b>${role}</b>
            </p>

            <p>
              <a href="${inviteLink}">
                Click here to accept the invitation
              </a>
            </p>

            <p style="font-size:12px;color:#666;">
              This invitation will expire in 7 days.
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
    console.error("invite-user error:", err);
    return json(
      { error: err.message || "Server error" },
      500
    );
  }
});

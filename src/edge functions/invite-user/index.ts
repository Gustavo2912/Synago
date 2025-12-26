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

  if (error || !data?.value) throw new Error(`${key} is not configured`);
  return data.value;
}

/* ================= HANDLER ================= */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    /* ---------- AUTH ---------- */
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const accessToken = authHeader.replace("Bearer ", "");
    const { data: inviterData, error: inviterError } =
      await adminClient.auth.getUser(accessToken);

    if (inviterError || !inviterData?.user) return json({ error: "Unauthorized" }, 401);

    const inviterId = inviterData.user.id;

    /* ---------- INPUT ---------- */
    const { email, role, organization_id } = await req.json();
    if (!email || !role || !organization_id) {
      return json({ error: "email, role, organization_id required" }, 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    /* ---------- SETTINGS ---------- */
    const SYSTEM_EMAIL = await getSetting("SYSTEM_EMAIL");
    const APP_URL = await getSetting("APP_URL");

    const expiresInSeconds = 60 * 60 * 24 * 7; // 7 days
    const newExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    /* ---------- FIND EXISTING INVITE (ANY STATUS) ---------- */
    const { data: existingInvites, error: findError } = await adminClient
      .from("invites")
      .select("id, accepted_at, cancelled_at, expires_at")
      .eq("email", normalizedEmail)
      .eq("organization_id", organization_id)
      .order("created_at", { ascending: false });

    if (findError) {
      console.error("invite lookup error:", findError);
      return json({ error: "Failed to check existing invites" }, 500);
    }

    const existing = (existingInvites ?? [])[0] ?? null;

    /* ---------- IF ACCEPTED -> BLOCK (USER SHOULD ALREADY BE MEMBER) ---------- */
    if (existing?.accepted_at) {
      return json(
        {
          error: "INVITE_ALREADY_ACCEPTED",
          message: "This invitation was already accepted.",
        },
        409
      );
    }

    /* ---------- IF ACTIVE (not cancelled, not expired) -> FRIENDLY 409 ---------- */
    if (existing && !existing.cancelled_at && new Date(existing.expires_at) > new Date()) {
      return json(
        {
          error: "INVITE_ALREADY_ACTIVE",
          message: "An active invitation already exists for this user and organization.",
        },
        409
      );
    }

    /* ---------- CREATE OR REOPEN INVITE ---------- */
    let inviteId: string;

    if (existing) {
      // reopen/update cancelled or expired invite
      const { data: updated, error: updateError } = await adminClient
        .from("invites")
        .update({
          role,
          invited_by: inviterId,
          cancelled_at: null,
          accepted_at: null,
          expires_at: newExpiresAt,
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (updateError || !updated) {
        console.error("invite update error:", updateError);
        return json({ error: "Failed to update invite" }, 500);
      }

      inviteId = updated.id;
    } else {
      const { data: inserted, error: insertError } = await adminClient
        .from("invites")
        .insert({
          email: normalizedEmail,
          organization_id,
          role,
          invited_by: inviterId,
          expires_at: newExpiresAt,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.error("invite insert error:", insertError);
        return json({ error: "Failed to create invite" }, 500);
      }

      inviteId = inserted.id;
    }

    /* ---------- CREATE TOKEN ---------- */
    const token = await create(
      { alg: "HS256", typ: "JWT" },
      { invite_id: inviteId, exp: getNumericDate(expiresInSeconds) },
      await toCryptoKey(INVITE_JWT_SECRET)
    );

    /* ---------- LOAD ORG NAME ---------- */
    const { data: org } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();

    const organizationName = org?.name ?? "an organization";

    /* ---------- SEND EMAIL ---------- */
    const inviteLink = `${APP_URL}/#/invite/accept?token=${token}`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Synago <${SYSTEM_EMAIL}>`,
        to: [normalizedEmail],
        subject: `Invitation to join ${organizationName}`,
        html: `
          <p>You were invited to join <b>${organizationName}</b> on <b>Synago</b>.</p>
          <p>Assigned role: <b>${role}</b></p>
          <p><a href="${inviteLink}">Click here to accept the invitation</a></p>
          <p style="font-size:12px;color:#666;">This invitation will expire in 7 days.</p>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const text = await resendResponse.text();
      console.error("Resend error:", text);
      return json({ error: "Failed to send invite email" }, 500);
    }

    return json({ success: true });
  } catch (err: any) {
    console.error("invite-user error:", err);
    return json({ error: err.message || "Server error" }, 500);
  }
});

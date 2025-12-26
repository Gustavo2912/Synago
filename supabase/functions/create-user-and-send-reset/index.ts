import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

/* ================= ENV ================= */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("APP_RESEND_API_KEY")!;

/* ================= SETUP ================= */

const adminClient = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ================= HELPERS ================= */

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await adminClient.auth.getUser(token);
    if (!authData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    /* ---------- INPUT ---------- */
    const {
      email,
      first_name,
      last_name,
      phone,
      position,
      role,
      organization_id,
    } = await req.json();

    if (!email || !role || !organization_id) {
      return json(
        { error: "email, role, organization_id required" },
        400
      );
    }

    /* ---------- SETTINGS ---------- */
    const APP_URL = await getSetting("APP_URL");
    const SYSTEM_EMAIL = await getSetting("SYSTEM_EMAIL");

    /* ---------- ORG NAME ---------- */
    const { data: org } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();

    const organizationName = org?.name ?? "your organization";

    /* ---------- CREATE USER ---------- */
    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          first_name,
          last_name,
          phone,
          position,
        },
      });

    if (createError || !created?.user) {
      return json(
        { error: createError?.message || "Failed to create user" },
        500
      );
    }

    const userId = created.user.id;

    /* ---------- ASSIGN ROLE ---------- */
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: userId,
        organization_id,
        role,
        suspended: false,
      });

    if (roleError) {
      return json(
        { error: "Failed to assign role" },
        500
      );
    }

    /* ---------- GENERATE RESET LINK ---------- */
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${APP_URL}/auth/reset-password`,
        },
      });

    const resetLink =
      linkData?.properties?.action_link;

    if (linkError || !resetLink) {
      return json(
        { error: "Failed to generate reset password link" },
        500
      );
    }

    /* ---------- SEND EMAIL (RESEND) ---------- */
    const resendRes = await fetch(
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
          subject: `Set your password for ${organizationName}`,
          html: `
            <p>Hello,</p>

            <p>
              You were added to <b>${organizationName}</b>
              on <b>Synago</b>.
            </p>

            <p>
              Click the button below to set your password
              and access your account.
            </p>

            <p>
              <a href="${resetLink}"
                 style="
                   display:inline-block;
                   padding:10px 16px;
                   background:#4f46e5;
                   color:#fff;
                   text-decoration:none;
                   border-radius:6px;
                 ">
                Set your password
              </a>
            </p>

            <p style="font-size:12px;color:#666">
              If you didn’t expect this email, you can ignore it.
            </p>
          `,
        }),
      }
    );

    if (!resendRes.ok) {
      const text = await resendRes.text();
      console.error("Resend error:", text);
      return json(
        { error: "Failed to send reset email" },
        500
      );
    }

    return json({ success: true });

  } catch (err: any) {
    console.error("create-user-and-send-reset:", err);
    return json(
      { error: err.message || "Server error" },
      500
    );
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

/* ---------------------------------- */
/* CORS                               */
/* ---------------------------------- */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ---------------------------------- */
/* Helpers                            */
/* ---------------------------------- */

// Determine subscription tier by members estimate
function getTierByMemberEstimate(count: number) {
  if (count <= 50) return "tier_1";
  if (count <= 100) return "tier_2";
  if (count <= 250) return "tier_3";
  return "tier_4";
}

// Create or fetch user by email
async function getOrCreateUser(
  admin: ReturnType<typeof createClient>,
  email: string,
  password: string
): Promise<{ userId: string; isNew: boolean }> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (!error && data?.user) {
    return { userId: data.user.id, isNew: true };
  }

  // User already exists → find it
  if (error?.message?.includes("already")) {
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data: list, error: listErr } =
        await admin.auth.admin.listUsers({ page, perPage });

      if (listErr) throw listErr;

      const found = list.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (found) {
        return { userId: found.id, isNew: false };
      }

      if (list.users.length < perPage) break;
      page++;
    }
  }

  throw new Error("Failed to create or find user");
}

/* ---------------------------------- */
/* Main handler                       */
/* ---------------------------------- */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase env vars");
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    /* ---------------------------------- */
    /* 1. Create / get admin user         */
    /* ---------------------------------- */
    const { userId, isNew } = await getOrCreateUser(
      admin,
      body.adminEmail,
      body.adminPassword
    );

    /* ---------------------------------- */
    /* 2. Create organization             */
    /* ---------------------------------- */
    const subscriptionTier = getTierByMemberEstimate(body.memberCount);

    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .insert({
        name: body.organizationName,
        contact_name: body.contactName,
        contact_email: body.contactEmail,
        contact_phone: body.contactPhone || null,
        city: body.city || null,
        state: body.state || null,
        country: body.country || null,
        member_count: body.memberCount, // Members Estimate
        subscription_tier: subscriptionTier,
        subscription_status: "inactive", // ❗ per requirement
        created_by_user_id: userId,
      })
      .select()
      .single();

    if (orgErr) {
      if (isNew) {
        await admin.auth.admin.deleteUser(userId);
      }
      throw orgErr;
    }

    /* ---------------------------------- */
    /* 3. Assign role (suspended)         */
    /* ---------------------------------- */
    const { data: existingRole } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", org.id)
      .maybeSingle();

    if (!existingRole) {
      const { error: roleErr } = await admin.from("user_roles").insert({
        user_id: userId,
        organization_id: org.id,
        role: "synagogue_admin",
        suspended: true, // ❗ initial suspended
      });

      if (roleErr) throw roleErr;
    }

    /* ---------------------------------- */
    /* 4. Create user profile if missing  */
    /* ---------------------------------- */
    const { data: profile } = await admin
      .from("users_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) {
      const [firstName, ...rest] = (body.contactName || "").split(" ");
      const lastName = rest.join(" ") || null;

      await admin.from("users_profiles").insert({
        user_id: userId,
        email: body.adminEmail,
        first_name: firstName || null,
        last_name: lastName,
        phone: body.contactPhone || null,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    /* ---------------------------------- */
    /* Success                            */
    /* ---------------------------------- */
    return new Response(
      JSON.stringify({
        success: true,
        organizationId: org.id,
        userId,
        subscription_tier: subscriptionTier,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err: any) {
    console.error("register-organization error:", err);

    return new Response(
      JSON.stringify({
        error: err.message || "Unknown error",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

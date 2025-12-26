import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

// ---------------- CORS ----------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper: get or create user by email
async function getOrCreateUser(
  admin: ReturnType<typeof createClient>,
  email: string,
  password: string
): Promise<{ userId: string; isNew: boolean }> {
  console.log("🔐 getOrCreateUser for:", email);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (!error && data?.user) {
    console.log("✅ Created new user:", data.user.id);
    return { userId: data.user.id, isNew: true };
  }

  if (
    error &&
    (error.message?.includes("already been registered") ||
      error.message?.includes("already registered"))
  ) {
    console.log("ℹ️ User already exists, searching via listUsers…");

    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data: list, error: listErr } =
        await admin.auth.admin.listUsers({
          page,
          perPage,
        });

      if (listErr) {
        throw new Error("Failed to find existing user by email");
      }

      const found = list.users.find(
        (u: any) =>
          u.email &&
          (u.email as string).toLowerCase() === email.toLowerCase()
      );

      if (found) {
        console.log("✅ Found existing user:", found.id);
        return { userId: found.id, isNew: false };
      }

      if (list.users.length < perPage) break;
      page += 1;
    }

    throw new Error("User exists but could not be fetched");
  }

  throw new Error("Failed to create user: " + error?.message);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    console.log("📩 register-organization body:", body);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase env vars");
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // =====================================================
    // 1. GET OR CREATE USER
    // =====================================================
    const { userId, isNew } = await getOrCreateUser(
      admin,
      body.adminEmail,
      body.adminPassword
    );

    // =====================================================
    // 2. CREATE ORGANIZATION (inactive + country)
    // =====================================================
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .insert({
        name: body.organizationName,
        contact_name: body.contactName,
        contact_email: body.contactEmail,
        contact_phone: body.contactPhone || null,
        city: body.city || null,
        state: body.state || null,
        country: body.country || null,          // ✅ NEW
        member_count: body.memberCount,
        subscription_status: "inactive",        // ✅ CHANGED
        created_by_user_id: userId,
      })
      .select()
      .single();

    if (orgErr) {
      if (isNew) {
        await admin.auth.admin.deleteUser(userId);
      }
      throw new Error("Failed to create organization: " + orgErr.message);
    }

    // =====================================================
    // 3. ASSIGN ROLE (suspended = true)
    // =====================================================
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
        suspended: true,                         // ✅ CHANGED
      });

      if (roleErr) {
        throw new Error("Failed to assign role: " + roleErr.message);
      }
    }

    // =====================================================
    // 4. CREATE USER PROFILE (unchanged)
    // =====================================================
    const { data: existingProfile } = await admin
      .from("users_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingProfile) {
      const [firstName, ...rest] = (body.contactName || "")
        .trim()
        .split(" ");
      const lastName = rest.join(" ").trim() || null;

      await admin.from("users_profiles").insert({
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email: body.contactEmail || body.adminEmail,
        first_name: firstName || null,
        last_name: lastName,
        phone: body.contactPhone || null,
        status: "active",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        organizationId: org.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err: any) {
    console.error("register-organization error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

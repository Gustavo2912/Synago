// Supabase Edge Function: register-organization
// File: supabase/functions/register-organization/index.ts

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

  // 1) Try to create user
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (!error && data?.user) {
    console.log("✅ Created new user:", data.user.id);
    return { userId: data.user.id, isNew: true };
  }

  // 2) If user already exists, try to find them
  if (
    error &&
    (error.message?.includes("already been registered") ||
      error.message?.includes("already registered"))
  ) {
    console.log("ℹ️ User already exists, searching via listUsers…");

    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listErr) {
        console.error("❌ listUsers failed:", listErr);
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

      if (list.users.length < perPage) {
        break; // no more users
      }

      page += 1;
    }

    throw new Error(
      "User with this email already exists but could not be fetched"
    );
  }

  console.error("❌ Failed to create user:", error);
  throw new Error("Failed to create user: " + error.message);
}

serve(async (req) => {
  // Preflight
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
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
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
    console.log("👤 Using user:", { userId, isNew });

    // =====================================================
    // 2. CREATE ORGANIZATION
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
        member_count: body.memberCount,
        subscription_status: "active",
      })
      .select()
      .single();

    if (orgErr) {
      console.error("❌ Failed to create organization:", orgErr);

      // אם המשתמש חדש – למחוק אותו, כדי לא להשאיר יתומים
      if (isNew && userId) {
        try {
          await admin.auth.admin.deleteUser(userId);
          console.log("🧹 Rolled back newly-created user:", userId);
        } catch (delErr) {
          console.error("⚠️ Failed to delete new user during rollback:", delErr);
        }
      }

      throw new Error("Failed to create organization: " + orgErr.message);
    }

    console.log("🏢 Created organization:", org.id);

    // =====================================================
    // 3. ASSIGN ROLE (user_roles)
    //    אם כבר קיימת שורה כזו – לא להוסיף שוב
    // =====================================================
    const { data: existingRole, error: existingRoleErr } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", org.id)
      .maybeSingle();

    if (existingRoleErr) {
      console.error("⚠️ Failed to check existing role:", existingRoleErr);
      // לא זורקים כאן – רק לוג
    }

    if (!existingRole) {
      const { error: roleErr } = await admin.from("user_roles").insert({
        user_id: userId,
        organization_id: org.id,
        role: "synagogue_admin",
        suspended: false,
      });

      if (roleErr) {
        console.error("❌ Failed to assign user role:", roleErr);
        throw new Error("Failed to assign user role: " + roleErr.message);
      }

      console.log("✅ Role synagogue_admin assigned:", { userId, orgId: org.id });
    } else {
      console.log("ℹ️ Role already exists for user+org, skipping insert");
    }

    // =====================================================
    // 4. CREATE USER PROFILE (IF NOT EXISTS)
    // =====================================================
    const { data: existingProfile, error: existingProfileErr } = await admin
      .from("users_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingProfileErr) {
      console.error(
        "⚠️ Failed to check existing user profile:",
        existingProfileErr
      );
      // גם כאן – לא זורקים, רק מדווחים; נמשיך לנסות ליצור
    }

    if (!existingProfile) {
      const [firstName, ...rest] = (body.contactName || "")
        .trim()
        .split(" ");
      const lastName = rest.join(" ").trim() || null;

      const { error: profileErr } = await admin.from("users_profiles").insert({
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email: body.contactEmail || body.adminEmail,
        first_name: firstName || null,
        last_name: lastName || null,
        phone: body.contactPhone || null,
        status: "active",
        avatar_url: null,
      });

      if (profileErr) {
        console.error("❌ Failed to create user profile:", profileErr);
        throw new Error("Failed to create user profile: " + profileErr.message);
      }

      console.log("✅ Created users_profiles entry for:", userId);
    } else {
      console.log("ℹ️ User profile already exists, skipping");
    }

    // =====================================================
    // SUCCESS RESPONSE
    // =====================================================
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
      JSON.stringify({
        error: err?.message || "Unknown error",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization");

    const {
      email,
      first_name,
      last_name,
      phone,
      position,
      organization_id,
      role,
      send_invite,
    } = await req.json();

    if (!email || !organization_id || !role) {
      throw new Error("email, organization_id and role are required");
    }

    /* -------------------------------------------
       1. FIND OR CREATE AUTH USER
    ------------------------------------------- */
    let userId: string;
    let isNewUser = false;

    const { data: list } = await admin.auth.admin.listUsers({
      filter: { email },
      perPage: 1,
    } as any);

    if (list?.users?.length) {
      userId = list.users[0].id;
    } else {
      isNewUser = true;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: !send_invite,
      });

      if (error || !data?.user) throw error;
      userId = data.user.id;
    }

    /* -------------------------------------------
       2. UPSERT PROFILE (OPTIONAL, SAFE)
    ------------------------------------------- */
    await admin.from("users").upsert(
      {
        id: userId,
        email,
        first_name,
        last_name,
        phone,
        position,
      },
      { onConflict: "id" }
    );

    /* -------------------------------------------
       3. ENSURE ROLE FOR ORGANIZATION
    ------------------------------------------- */
    const { data: existingRole } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", organization_id)
      .maybeSingle();

    if (!existingRole) {
      const { error } = await admin.from("user_roles").insert({
        user_id: userId,
        organization_id,
        role,
        suspended: false,
      });

      if (error) throw error;
    }

    /* -------------------------------------------
       4. SEND INVITE EMAIL (ONLY EMAIL)
    ------------------------------------------- */
    if (send_invite) {
      // כאן תחבר Resend
      // ❗ לא תלוי ב־Supabase Invite
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        added_role: !existingRole,
        invited: send_invite,
      }),
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("add-user error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

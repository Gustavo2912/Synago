import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("APP_RESEND_API_KEY"));

// Safe formatter for numbers inside Deno edge runtime
const formatCurrency = (n: number) =>
  new Intl.NumberFormat("he-IL").format(n);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- 1. Extract and verify JWT ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(
      Deno.env.get("APP_SUPABASE_URL")!,
      Deno.env.get("APP_SERVICE_ROLE_KEY")!,

      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: jwtUser, error: jwtError } =
      await supabaseAdmin.auth.getUser(token);

    if (jwtError || !jwtUser?.user) {
      throw new Error("Unauthorized or invalid JWT");
    }

    const inviterId = jwtUser.user.id;

    // --- 2. Fetch role of inviter ---
    const { data: inviterRole } = await supabaseAdmin
      .from("user_roles")
      .select("role, organization_id")
      .eq("user_id", inviterId)
      .maybeSingle();

    if (!inviterRole) throw new Error("Inviter role not found");

    const inviterIsSuper = inviterRole.role === "super_admin";

    // --- 3. Parse body ---
    const { pledgeId }: { pledgeId: string } = await req.json();
    if (!pledgeId) throw new Error("Missing pledgeId");

    // --- 4. Fetch pledge with donor + org ---
    const { data: pledge, error: pledgeError } = await supabaseAdmin
      .from("pledges")
      .select(`
        id,
        total_amount,
        amount_paid,
        status,
        organization_id,
        donor:donors (
          display_name,
          first_name,
          last_name,
          email
        )
      `)
      .eq("id", pledgeId)
      .single();

    if (pledgeError || !pledge) throw new Error("Pledge not found");

    // --- 5. Permission: can inviter operate on this pledge? ---
    if (!inviterIsSuper) {
      if (inviterRole.organization_id !== pledge.organization_id) {
        throw new Error("Permission denied for this organization");
      }
    }

    // --- 6. Check completion status ---
    if (pledge.status !== "completed") {
      return new Response(
        JSON.stringify({ message: "Pledge is not completed yet" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 7. Validate donor email ---
    const donor = pledge.donor;
    if (!donor?.email) {
      return new Response(
        JSON.stringify({ message: "Donor has no email address" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const donorName =
      donor.display_name ||
      `${donor.first_name || ""} ${donor.last_name || ""}`.trim() ||
      "Donor";

    // --- 8. Send email via Resend ---
    const emailResponse = await resend.emails.send({
      from: "Donations <onboarding@resend.dev>",
      to: [donor.email],
      subject: "Thank You for Completing Your Pledge! / תודה על השלמת התחייבותך",
      html: `
        <div style="font-family: Arial; max-width: 600px; margin: auto;">
          <h1 style="color: #8B5CF6;">Thank You! / תודה רבה!</h1>
          <p>Dear ${donorName},</p>
          <p>You have completed your pledge of <strong>₪${formatCurrency(
            pledge.total_amount
          )}</strong>.</p>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
            <h3 style="color: #8B5CF6;">Pledge Summary</h3>
            <p><strong>Total:</strong> ₪${formatCurrency(pledge.total_amount)}</p>
            <p><strong>Paid:</strong> ₪${formatCurrency(pledge.amount_paid)}</p>
            <p><strong>Status:</strong> Completed</p>
          </div>

          <p>Thank you for your generosity!</p>
          <hr>

          <div dir="rtl" style="text-align: right;">
            <p>שלום ${donorName},</p>
            <p>השלמת את התחייבותך בסך <strong>₪${formatCurrency(
              pledge.total_amount
            )}</strong>.</p>
            <p>תודה על תמיכתך!</p>
          </div>
        </div>
      `,
    });

    console.log("Completion email sent:", emailResponse);

    // --- 9. Update DB so we don't send again ---
    await supabaseAdmin
      .from("pledges")
      .update({ completion_email_sent: new Date().toISOString() })
      .eq("id", pledgeId);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("send-pledge-completion-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

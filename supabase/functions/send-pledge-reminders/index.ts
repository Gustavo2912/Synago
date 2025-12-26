import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

// Initialize Resend
const resend = new Resend(Deno.env.get("APP_RESEND_API_KEY"));

// Global CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Pledge {
  id: string;
  total_amount: number;
  amount_paid: number;
  balance_owed: number;
  frequency: string;
  last_reminder_sent: string | null;
  donor: {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

serve(async (req: Request): Promise<Response> => {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const APP_SUPABASE_URL = Deno.env.get("APP_SUPABASE_URL")!;
    const APP_SERVICE_ROLE_KEY = Deno.env.get("APP_SERVICE_ROLE_KEY")!;


    if (!APP_SUPABASE_URL || !APP_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase env variables");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    console.log("Fetching pledges requiring reminders…");

    // Fetch pledges with a balance owed
    const { data: pledges, error } = await supabase
      .from("pledges")
      .select(
        `
        id,
        total_amount,
        amount_paid,
        balance_owed,
        frequency,
        last_reminder_sent,
        donor:donors (
          id,
          display_name,
          first_name,
          last_name,
          email
        )
      `
      )
      .eq("status", "active")
      .eq("reminder_enabled", true)
      .gt("balance_owed", 0);

    if (error) throw error;

    if (!pledges || pledges.length === 0) {
      console.log("No pledges need reminders.");
      return new Response(
        JSON.stringify({ message: "No reminders to send", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = { sent: 0, failed: 0, errors: [] as string[] };

    for (const pledge of pledges as Pledge[]) {
      try {
        const donorEmail = pledge.donor.email;
        if (!donorEmail) continue;

        const donorName =
          pledge.donor.display_name ||
          `${pledge.donor.first_name ?? ""} ${pledge.donor.last_name ?? ""}`.trim() ||
          "Valued Donor";

        // Send the email
        await resend.emails.send({
          from: "Synagogue Donations <onboarding@resend.dev>",
          to: [donorEmail],
          subject: "Pledge Payment Reminder",
          html: `
          <div style="font-family: Arial; max-width: 600px; margin: auto;">
            <h2>Pledge Payment Reminder</h2>
            <p>Dear ${donorName},</p>
            <p>This is a reminder regarding your pledge:</p>

            <div style="padding: 15px; background: #fafafa; border-radius: 8px; margin: 20px 0;">
              <p><strong>Total Pledge:</strong> $${pledge.total_amount.toFixed(2)}</p>
              <p><strong>Paid:</strong> $${pledge.amount_paid.toFixed(2)}</p>
              <p><strong>Remaining:</strong> $${pledge.balance_owed.toFixed(2)}</p>
              <p><strong>Frequency:</strong> ${pledge.frequency}</p>
            </div>

            <p>Thank you for your continued support.</p>
          </div>
        `,
        });

        console.log(`Reminder sent to ${donorEmail}`);

        // Update last_reminder_sent
        await supabase
          .from("pledges")
          .update({ last_reminder_sent: new Date().toISOString() })
          .eq("id", pledge.id);

        results.sent++;
      } catch (e: any) {
        console.error("Failed for pledge", pledge.id, e);
        results.failed++;
        results.errors.push(e.message);
      }
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-pledge-reminders error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

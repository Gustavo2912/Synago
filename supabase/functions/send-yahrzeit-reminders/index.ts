import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Types for clarity
interface Yahrzeit {
  id: string;
  deceased_name: string;
  hebrew_date: string;
  secular_date: string;
  relationship?: string;
  reminder_enabled: boolean;
  last_reminder_sent?: string | null;
  contact_email?: string | null;

  donors: {
    name: string;
    email?: string | null;
    phone?: string | null;
  };

  organizations: {
    name: string;
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Load env variables
    const APP_SUPABASE_URL = Deno.env.get("APP_SUPABASE_URL")!;
    const APP_SERVICE_ROLE_KEY = Deno.env.get("APP_SERVICE_ROLE_KEY")!;
    const APP_RESEND_API_KEY = Deno.env.get("APP_RESEND_API_KEY")!;

    const supabase = createClient(APP_SUPABASE_URL, APP_SERVICE_ROLE_KEY);
    const resend = new Resend(APP_RESEND_API_KEY);

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const seven = new Date(today);
    seven.setDate(seven.getDate() + 7);
    const sevenStr = seven.toISOString().split("T")[0];

    console.log("Checking yahrzeits for:", todayStr, "and", sevenStr);

    // Fetch relevant yahrzeits
    const { data: yahrzeits, error } = await supabase
      .from("yahrzeits")
      .select(
        `
        id,
        deceased_name,
        hebrew_date,
        secular_date,
        relationship,
        reminder_enabled,
        last_reminder_sent,
        contact_email,
        donors (
          name,
          email,
          phone
        ),
        organizations (
          name
        )
      `
      )
      .eq("reminder_enabled", true)
      .or(`secular_date.eq.${todayStr},secular_date.eq.${sevenStr}`);

    if (error) throw error;

    if (!yahrzeits || yahrzeits.length === 0) {
      return new Response(
        JSON.stringify({ message: "No yahrzeits for today" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing yahrzeits:", yahrzeits.length);

    let sent = 0;
    let failed = 0;

    for (const y of yahrzeits as Yahrzeit[]) {
      const lastSent = y.last_reminder_sent
        ? new Date(y.last_reminder_sent)
        : null;

      // Prevent duplicate emails within 24 hours
      if (lastSent) {
        const diffHours =
          (today.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
        if (diffHours < 24) {
          console.log("Skipping", y.id, "- sent recently");
          continue;
        }
      }

      const email = y.contact_email || y.donors.email;
      if (!email) {
        failed++;
        console.log("Skipping", y.id, "- no email");
        continue;
      }

      const isToday = y.secular_date === todayStr;
      const timing = isToday ? "today" : "in 7 days";

      try {
        await resend.emails.send({
          from: `${y.organizations.name} <onboarding@resend.dev>`,
          to: [email],
          subject: `Yahrzeit Reminder: ${y.deceased_name}`,
          html: `
            <div style="font-family: Arial; max-width:600px; margin:auto">
              <h2>Yahrzeit Reminder</h2>

              <p>Dear ${y.donors.name},</p>
              <p>
                This is a reminder that the yahrzeit of 
                <strong>${y.deceased_name}</strong>
                ${y.relationship ? ` (${y.relationship})` : ""} 
                is ${timing}.
              </p>

              <div style="background:#f0f0f0; padding:15px; border-radius:8px;">
                <p><strong>Hebrew Date:</strong> ${y.hebrew_date}</p>
                <p><strong>Secular Date:</strong> 
                   ${new Date(y.secular_date).toLocaleDateString("en-US")}
                </p>
              </div>

              <p>May their memory be a blessing.</p>

              <p style="font-size:12px; color:#777; margin-top:30px;">
                Automated reminder from ${y.organizations.name}
              </p>
            </div>
          `,
        });

        // Update timestamp
        await supabase
          .from("yahrzeits")
          .update({ last_reminder_sent: new Date().toISOString() })
          .eq("id", y.id);

        sent++;
        console.log("Sent reminder for:", y.deceased_name);
      } catch (e) {
        failed++;
        console.error("Email failed", y.id, e);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Done",
        sent,
        failed,
        total: yahrzeits.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Fatal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

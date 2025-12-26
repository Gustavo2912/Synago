// Supabase Edge Function - auth-email
// Compatible with Supabase CLI 2.58.x

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  try {
    const payload = await req.json();
    const { user, email_data } = payload;

    if (!user?.email || !email_data?.token) {
      console.error("Invalid payload:", payload);
      return new Response(
        JSON.stringify({ error: "Missing email or token" }),
        { status: 400, headers: cors }
      );
    }

    const token = email_data.token;

    const subject = "קוד אימות / Verification Code";

    const html = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .code { font-size: 32px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>קוד האימות שלך</h2>
        <div class="code">${token}</div>
        <p>Enter this code in the app to continue.</p>
      </body>
      </html>
    `;

    const apiKey = Deno.env.get("APP_RESEND_API_KEY");
    if (!apiKey) {
      console.error("Missing APP_RESEND_API_KEY in environment");
      return new Response(JSON.stringify({ error: "Missing API key" }), {
        status: 500,
        headers: cors,
      });
    }

    const sendEmail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Synago <onboarding@resend.dev>",
        to: [user.email],
        subject,
        html,
      }),
    });

    const responseData = await sendEmail.json();
    console.log("Email sent:", responseData);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...cors },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Unknown error" }),
      { status: 500, headers: cors }
    );
  }
});

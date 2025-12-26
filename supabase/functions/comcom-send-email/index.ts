// FULL COMCOM EMAIL SENDER (FIXED VERSION)
// Edge Runtime — Deno — NO NPM INSTALL REQUIRED

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("APP_RESEND_API_KEY");
const RESEND_URL = "https://api.resend.com/emails";

// Verify keys
if (!RESEND_API_KEY) {
  console.error("❌ Missing APP_RESEND_API_KEY!");
}

// Supabase (Service Role)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request) => {
  // ---- CORS ----
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const { messageId, to, cc, bcc } = await req.json();
    console.log("📥 Incoming payload:", { messageId, to, cc, bcc });

    if (!messageId) throw new Error("Missing messageId");

    // -----------------------------------------------------------
    // 1️⃣ LOAD MESSAGE
    // -----------------------------------------------------------
    const { data: msg, error: msgErr } = await supabase
      .from("comcom_messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (msgErr || !msg) {
      console.error("❌ Message load failed:", msgErr);
      throw new Error("Message not found");
    }

    console.log("📄 Loaded message:", msg);

    // -----------------------------------------------------------
    // 2️⃣ LOAD SYSTEM EMAIL
    // -----------------------------------------------------------
    const { data: sys } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "SYSTEM_EMAIL")
      .single();

    const FROM_EMAIL = sys?.value || "no-reply@synago.cloud";
    console.log("📤 Using FROM:", FROM_EMAIL);

    // -----------------------------------------------------------
    // 3️⃣ LOAD SENDER EMAIL  (REPLY-TO)
    // -----------------------------------------------------------
    const senderEmail = msg.created_by_email || msg.reply_to_email;

    if (!senderEmail) {
      console.error("❌ Message missing created_by_email field!");
      throw new Error(
        "Message missing created_by_email. Update DB schema accordingly."
      );
    }

    console.log("👤 Using REPLY-TO:", senderEmail);

    // -----------------------------------------------------------
    // 4️⃣ BUILD EMAIL PAYLOAD FOR RESEND
    // -----------------------------------------------------------
    const emailPayload = {
      from: FROM_EMAIL,
      to: to.map((r: any) => r.email),
      cc: cc?.length > 0 ? cc : undefined,
      bcc: bcc?.length > 0 ? bcc : undefined,
      subject: msg.subject,
      html: `<div>${msg.body.replace(/\n/g, "<br>")}</div>`,

      // IMPORTANT FIX
      reply_to: senderEmail,
    };

    console.log("📦 Send payload:", emailPayload);

    // -----------------------------------------------------------
    // 5️⃣ SEND TO RESEND
    // -----------------------------------------------------------
    const resendResp = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = await resendResp.json();
    console.log("📬 Resend response:", resendData);

    if (!resendResp.ok) {
      throw new Error("Resend failed: " + JSON.stringify(resendData));
    }

    // -----------------------------------------------------------
    // 6️⃣ LOG RECIPIENTS
    // -----------------------------------------------------------
    if (to.length > 0) {
      const logRows = to.map((r: any) => ({
        message_id: messageId,
        email: r.email,
        full_name: r.full_name,
        sent_at: new Date().toISOString(),
      }));

      await supabase.from("comcom_recipient_log").insert(logRows);
      console.log("📝 Logged recipients:", logRows.length);
    }

    // -----------------------------------------------------------
    // 7️⃣ MARK MESSAGE AS SENT
    // -----------------------------------------------------------
    await supabase
      .from("comcom_messages")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", messageId);

    console.log("✅ Message sent & updated!");

    // -----------------------------------------------------------
    // 8️⃣ RESPONSE TO CLIENT
    // -----------------------------------------------------------
    return new Response(JSON.stringify({ success: true, resend: resendData }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    console.error("❌ ERROR:", err);

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ONESIGNAL_APP_ID = "e15416de-5735-4b28-8b25-7c2f5a3c39cf";
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY") || "YOUR_ONESIGNAL_REST_API_KEY";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { message_id, sender_handle, sender_name, chat_id, content } = await req.json();

    if (!message_id || !sender_handle || !chat_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get all participants in this chat (excluding sender)
    const { data: participants } = await supabase
      .from("chat_participants")
      .select("user_handle")
      .eq("chat_id", chat_id)
      .neq("user_handle", sender_handle);

    if (!participants || participants.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No recipients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get users with their OneSignal external IDs
    const recipientHandles = participants.map((p) => p.user_handle);
    const { data: users } = await supabase
      .from("users")
      .select("handle, onesignal_id")
      .in("handle", recipientHandles)
      .not("onesignal_id", "is", null);

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No users with push tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send push to each user
    const notification = {
      app_id: ONESIGNAL_APP_ID,
      contents: {
        en: `${sender_name}: ${content?.substring(0, 50)}${content?.length > 50 ? "..." : ""}`,
      },
      headings: { en: "New Message" },
      data: { chat_id, sender_handle },
      android_channel_id: "mzansichat_messages",
    };

    const results = await Promise.all(
      users.map(async (user) => {
        if (!user.onesignal_id) return null;
        
        try {
          const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${ONESIGNAL_API_KEY}`,
            },
            body: JSON.stringify({
              ...notification,
              include_external_user_ids: [user.handle],
            }),
          });
          return await response.json();
        } catch (err) {
          console.error("OneSignal error:", err);
          return null;
        }
      })
    );

    return new Response(JSON.stringify({ success: true, sent: results.filter(Boolean).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
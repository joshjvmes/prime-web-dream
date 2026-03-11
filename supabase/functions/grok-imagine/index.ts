import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── AES-GCM helpers ──
const IV_LENGTH = 12;
const SALT = new TextEncoder().encode("primeos-ai-key-v1");

async function deriveEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("AI_KEY_ENCRYPTION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: SALT, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function decryptApiKey(encrypted: string): Promise<string> {
  const key = await deriveEncryptionKey();
  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

async function getXAIKey(userId: string): Promise<string | null> {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: keyData } = await db.from("user_ai_keys").select("encrypted_key").eq("user_id", userId).eq("provider", "xai").maybeSingle();
  if (!keyData?.encrypted_key) return null;
  try {
    return await decryptApiKey(keyData.encrypted_key);
  } catch {
    return keyData.encrypted_key;
  }
}

async function getUserId(authHeader: string): Promise<string | null> {
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

// ── Image Generation ──
async function generateImage(apiKey: string, prompt: string, n: number = 1): Promise<Response> {
  const model = "grok-imagine-image";
  console.log(`[grok-imagine] IMAGE request — model: ${model}, n: ${n}, prompt length: ${prompt.length}`);

  const resp = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, prompt, n: Math.min(n, 4), response_format: "url" }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[grok-imagine] IMAGE error — status: ${resp.status}, body: ${errText}`);
    return new Response(JSON.stringify({ error: `xAI image generation failed (${resp.status})`, details: errText }), {
      status: resp.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await resp.json();
  console.log(`[grok-imagine] IMAGE success — ${(data.data || []).length} image(s) returned`);
  const urls = (data.data || []).map((d: any) => d.url);

  return new Response(JSON.stringify({ type: "image", urls }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Video Submit (returns requestId immediately) ──
async function submitVideo(apiKey: string, prompt: string, duration?: number, imageUrl?: string): Promise<Response> {
  const model = "grok-imagine-video";
  const body: any = { model, prompt };
  if (duration) body.duration = duration;
  if (imageUrl) body.image_url = imageUrl;

  console.log(`[grok-imagine] VIDEO SUBMIT — model: ${model}, prompt length: ${prompt.length}, duration: ${duration || "default"}`);

  const submitResp = await fetch("https://api.x.ai/v1/videos/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const rawBody = await submitResp.text();
  console.log(`[grok-imagine] VIDEO SUBMIT response — status: ${submitResp.status}, body: ${rawBody}`);

  if (!submitResp.ok) {
    return new Response(JSON.stringify({ error: `xAI video submit failed (${submitResp.status})`, details: rawBody }), {
      status: submitResp.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let submitData: any;
  try {
    submitData = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Failed to parse xAI video submit response", details: rawBody }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // If xAI returned the video URL immediately
  if (submitData.data?.[0]?.url) {
    console.log(`[grok-imagine] VIDEO ready immediately`);
    return new Response(JSON.stringify({ type: "video", url: submitData.data[0].url, status: "done" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const requestId = submitData.id || submitData.request_id;
  if (!requestId) {
    console.error(`[grok-imagine] VIDEO SUBMIT — no requestId in response: ${rawBody}`);
    return new Response(JSON.stringify({ error: "No request ID returned from video generation", details: rawBody }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[grok-imagine] VIDEO SUBMIT — requestId: ${requestId}, returning to client for polling`);
  return new Response(JSON.stringify({ type: "video", requestId, status: "pending" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Video Poll (single status check) ──
async function pollVideo(apiKey: string, requestId: string): Promise<Response> {
  console.log(`[grok-imagine] VIDEO POLL — requestId: ${requestId}`);

  const pollResp = await fetch(`https://api.x.ai/v1/videos/${requestId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const rawBody = await pollResp.text();
  console.log(`[grok-imagine] VIDEO POLL response — status: ${pollResp.status}, body: ${rawBody}`);

  if (!pollResp.ok) {
    return new Response(JSON.stringify({ status: "error", error: `Poll failed (${pollResp.status})`, details: rawBody }), {
      status: pollResp.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let pollData: any;
  try {
    pollData = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ status: "error", error: "Failed to parse poll response", details: rawBody }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (pollData.status === "completed" || pollData.status === "done") {
    const videoUrl = pollData.video?.url || pollData.data?.[0]?.url || pollData.url || pollData.video_url;
    console.log(`[grok-imagine] VIDEO POLL — completed, url: ${videoUrl}`);
    return new Response(JSON.stringify({ status: "done", url: videoUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (pollData.status === "failed" || pollData.status === "error") {
    console.error(`[grok-imagine] VIDEO POLL — failed: ${rawBody}`);
    return new Response(JSON.stringify({ status: "failed", error: "Video generation failed", details: pollData }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Still processing
  console.log(`[grok-imagine] VIDEO POLL — still pending (status: ${pollData.status})`);
  return new Response(JSON.stringify({ status: "pending" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Main handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userId = await getUserId(authHeader);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = await getXAIKey(userId);
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "xAI API key not configured. Set up your key in Settings → AI." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, prompt, n, duration, image_url, requestId } = await req.json();

    // Video poll route
    if (type === "video-poll") {
      if (!requestId) {
        return new Response(JSON.stringify({ error: "requestId is required for video-poll" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return pollVideo(apiKey, requestId);
    }

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "video") {
      return submitVideo(apiKey, prompt, duration, image_url);
    }

    return generateImage(apiKey, prompt, n || 1);
  } catch (e) {
    console.error("grok-imagine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

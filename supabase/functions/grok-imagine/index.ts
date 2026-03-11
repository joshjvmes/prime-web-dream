import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Auth helper ──
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

// ── Lovable AI Gateway image generation ──
async function generateImageViaGateway(prompt: string, n: number = 1): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "Image generation not configured (missing gateway key)" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const urls: string[] = [];
  const count = Math.min(n, 4);

  for (let i = 0; i < count; i++) {
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("Lovable AI image error:", resp.status, errText);
        if (resp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (resp.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in workspace settings." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        continue;
      }

      const data = await resp.json();
      const images = data.choices?.[0]?.message?.images;
      if (images?.length) {
        for (const img of images) {
          const imgUrl = img.image_url?.url || img.url;
          if (imgUrl) urls.push(imgUrl);
        }
      }
    } catch (e) {
      console.error("Image generation iteration error:", e);
    }
  }

  if (urls.length === 0) {
    return new Response(JSON.stringify({ error: "Image generation failed — no images returned" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ type: "image", urls }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── xAI Video Generation (async with polling) ──
async function generateVideo(
  apiKey: string,
  prompt: string,
  duration?: number,
  imageUrl?: string
): Promise<Response> {
  const body: any = { model: "grok-2-video", prompt };
  if (duration) body.duration = duration;
  if (imageUrl) body.image_url = imageUrl;

  const submitResp = await fetch("https://api.x.ai/v1/videos/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!submitResp.ok) {
    const errText = await submitResp.text();
    console.error("xAI video submit error:", submitResp.status, errText);
    return new Response(JSON.stringify({ error: `Video generation failed (${submitResp.status}). Make sure your xAI API key is configured in Settings → AI.` }), {
      status: submitResp.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const submitData = await submitResp.json();

  if (submitData.data?.[0]?.url) {
    return new Response(JSON.stringify({ type: "video", url: submitData.data[0].url, status: "done" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const requestId = submitData.id || submitData.request_id;
  if (!requestId) {
    return new Response(JSON.stringify({ error: "No request ID returned from video generation" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let delay = 3000;
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.3, 10000);

    const pollResp = await fetch(`https://api.x.ai/v1/videos/${requestId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!pollResp.ok) continue;

    const pollData = await pollResp.json();
    if (pollData.status === "completed" || pollData.status === "done") {
      const videoUrl = pollData.data?.[0]?.url || pollData.url || pollData.video_url;
      return new Response(JSON.stringify({ type: "video", url: videoUrl, status: "done" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (pollData.status === "failed" || pollData.status === "error") {
      return new Response(JSON.stringify({ error: "Video generation failed", details: pollData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Video generation timed out after ~2 minutes" }), {
    status: 504,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── xAI key helpers ──
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

    const { type, prompt, n, duration, image_url } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Video requires xAI key
    if (type === "video") {
      const apiKey = await getXAIKey(userId);
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "Video generation requires an xAI API key. Set up your key in Settings → AI." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return generateVideo(apiKey, prompt, duration, image_url);
    }

    // Image: use Lovable AI Gateway (no user API key needed)
    return generateImageViaGateway(prompt, n || 1);
  } catch (e) {
    console.error("grok-imagine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

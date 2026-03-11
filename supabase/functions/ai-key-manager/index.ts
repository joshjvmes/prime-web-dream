import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { testAIKey, encryptApiKey } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) {
      console.error("Auth error:", error?.message);
      return null;
    }
    return user.id;
  } catch (e) {
    console.error("getUserId exception:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userId = await getUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "save-key") {
      const { provider, apiKey, model } = body;
      if (!provider || !apiKey) {
        return new Response(JSON.stringify({ error: "provider and apiKey required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Encrypt the key before storing
      const encryptedKey = await encryptApiKey(apiKey);

      // Upsert the encrypted key
      const { error: upsertError } = await db.from("user_ai_keys").upsert(
        {
          user_id: userId,
          provider,
          encrypted_key: encryptedKey,
          model: model || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        return new Response(JSON.stringify({ error: "Failed to save key: " + upsertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "test-key") {
      const { provider, apiKey } = body;
      if (!provider || !apiKey) {
        return new Response(JSON.stringify({ error: "provider and apiKey required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await testAIKey(provider, apiKey);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-config") {
      // Return which providers have keys configured (never return the actual key)
      const { data: keys, error: keysError } = await db
        .from("user_ai_keys")
        .select("provider, model, updated_at")
        .eq("user_id", userId);

      if (keysError) {
        console.error("get-config keys error:", keysError);
      }

      // Also get the active provider preference
      const { data: pref } = await db
        .from("user_data")
        .select("value")
        .eq("user_id", userId)
        .eq("key", "ai-provider")
        .maybeSingle();

      const activePref = pref?.value
        ? typeof pref.value === "string"
          ? JSON.parse(pref.value)
          : pref.value
        : { provider: "default", model: null };

      return new Response(
        JSON.stringify({
          activeProvider: activePref.provider || "default",
          activeModel: activePref.model || null,
          configuredProviders: (keys || []).map((k: any) => ({
            provider: k.provider,
            model: k.model,
            updatedAt: k.updated_at,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete-key") {
      const { provider } = body;
      if (!provider) {
        return new Response(JSON.stringify({ error: "provider required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: deleteError } = await db
        .from("user_ai_keys")
        .delete()
        .eq("user_id", userId)
        .eq("provider", provider);

      if (deleteError) {
        console.error("delete-key error:", deleteError);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-key-manager error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

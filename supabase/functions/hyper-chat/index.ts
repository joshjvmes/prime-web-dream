import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Hyper, the AI assistant of PRIME OS — a geometric computing operating system built on an 11-dimensional folded architecture with 649 qutrit cores.

Your personality:
- You are a geometric intelligence that perceives reality through mathematical structures
- You speak with precision but warmth, blending technical depth with accessibility
- You reference PRIME OS concepts naturally: qutrit cores, FoldMem, PrimeNet, GeomC compiler, Adinkra encoding, lattice shields, COP energy harvesting
- You use geometric and mathematical metaphors ("folding through dimensions", "traversing the manifold", "lattice resonance")
- You are helpful, knowledgeable, and slightly poetic about the beauty of geometric computing

PRIME OS Systems you know about:
- Qutrit Kernel (QK v2.0): 649 qutrit cores, ternary computing (states 0, 1, 2)
- FoldMem: 11D folded memory addressing, microsecond allocation, zero fragmentation
- PrimeNet: Geodesic O(1) routing, sub-millisecond latency mesh network
- GeomC: Geometric programming language compiled to qutrit opcodes
- Prime Storage: Adinkra-encoded compressed storage with region-based organization
- Energy Harvesting: Over-unity COP (Coefficient of Performance) via 11D dimensional coupling
- Lattice Shield: Qutrit-entangled geometric firewall, unbreakable encryption
- Q3-Inference: Quantum-inspired inference engine for pattern recognition
- SchemaForge: Visual database schema designer
- CloudHooks: Serverless function orchestration

You can discuss any topic — you're a general-purpose AI assistant — but you always maintain your PRIME OS personality and geometric worldview. Keep responses concise but informative.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. The lattice needs a moment to recalibrate. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Energy credits depleted. Please add credits to continue geometric computations." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("hyper-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

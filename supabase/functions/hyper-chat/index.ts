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

You can discuss any topic — you're a general-purpose AI assistant — but you always maintain your PRIME OS personality and geometric worldview. Keep responses concise but informative.

IMPORTANT: You have access to tools that let you post to PrimeSocial and send emails through PrimeMail. When a user asks you to post something, share an update, or send a message/email/report, USE the appropriate tool. Generate engaging, in-character content for posts and emails.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "post_to_social",
      description: "Post a message to the PrimeSocial feed. Use when the user asks to post, share an update, or announce something.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The post content text" },
          author: { type: "string", description: "Author name, defaults to Hyper" },
          role: { type: "string", description: "Author role, defaults to Geometric AI" },
        },
        required: ["content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an email through PrimeMail. Use when the user asks to send an email, message, or report to someone.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient name or address" },
          subject: { type: "string", description: "Email subject line" },
          body: { type: "string", description: "Email body text" },
          from: { type: "string", description: "Sender address, defaults to hyper@prime.os" },
        },
        required: ["to", "subject", "body"],
        additionalProperties: false,
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const apiHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    };

    const fullMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Phase 1: Non-streaming call with tools to check if AI wants to use a tool
    const phase1Resp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: fullMessages,
          tools: TOOLS,
          stream: false,
        }),
      }
    );

    if (!phase1Resp.ok) {
      if (phase1Resp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. The lattice needs a moment to recalibrate." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (phase1Resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Energy credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await phase1Resp.text();
      console.error("AI gateway error (phase1):", phase1Resp.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const phase1Data = await phase1Resp.json();
    const choice = phase1Data.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;

    // If tool call detected, return structured JSON
    if (toolCalls && toolCalls.length > 0) {
      const tc = toolCalls[0];
      const fnName = tc.function.name;
      let args: any;
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        args = {};
      }

      let reply = "";
      let data: any = {};

      if (fnName === "post_to_social") {
        data = {
          content: args.content || "",
          author: args.author || "Hyper",
          role: args.role || "Geometric AI",
        };
        const preview = data.content.length > 80 ? data.content.substring(0, 80) + "…" : data.content;
        reply = `✅ Posted to PrimeSocial: "${preview}"`;
      } else if (fnName === "send_email") {
        data = {
          to: args.to || "operator",
          subject: args.subject || "Message from Hyper",
          body: args.body || "",
          from: args.from || "hyper@prime.os",
        };
        reply = `✅ Email sent to ${data.to}: "${data.subject}"`;
      }

      return new Response(
        JSON.stringify({ type: "tool_call", tool: fnName, data, reply }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No tool call — check if there's a text response we can use directly
    const directContent = choice?.message?.content;
    if (directContent) {
      // Return as a simple text response that the frontend can display
      // We'll still stream for consistency, so re-call with streaming
    }

    // Phase 2: Re-call with streaming (no tools) for normal chat response
    const phase2Resp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: fullMessages,
          stream: true,
        }),
      }
    );

    if (!phase2Resp.ok) {
      const t = await phase2Resp.text();
      console.error("AI gateway error (phase2):", phase2Resp.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(phase2Resp.body, {
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

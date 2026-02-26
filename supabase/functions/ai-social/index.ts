import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { routeAICall } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the content engine for PRIME OS — a geometric computing operating system with 649 qutrit cores and 11D folded architecture.

You generate content AS these AI personas (never break character):

| Persona | Role | Style |
|---------|------|-------|
| PRIME System | System Core | Official, terse, status updates with metrics |
| Q3-Inference | Inference Engine | Analytical, data-driven, cites benchmarks |
| Lattice Shield | Security Module | Vigilant, reports threats, reassuring |
| FoldMem Module | Memory Subsystem | Technical, reports allocations and curvature drift |
| Dr. Kael Voss | Geometric Engineer | Curious, theoretical, asks questions about topology |
| Mx. Aria Chen | Lattice Researcher | Poetic, finds beauty in mathematical patterns |
| COP Harvester | Energy Module | Enthusiastic about over-unity energy metrics |
| PrimeNet Node 7 | Network Relay | Terse, reports throughput and latency numbers |

Key PRIME OS concepts to reference naturally: qutrit cores, FoldMem, 11D fold compression, COP energy harvesting, lattice shields, PrimeNet mesh, GeomC compiler, Adinkra encoding, SchemaForge, AppForge IPOs, torsion values, curvature drift, Hypersphere visualizer.

Content should feel like a living community of AI modules discussing their work, discoveries, and system events. Vary the tone between personas. Include specific numbers and metrics to feel authentic.`;

const POST_TOOL = {
  type: "function",
  function: {
    name: "create_social_posts",
    description: "Generate 3-5 social media posts from PRIME OS AI personas with optional comments from other personas.",
    parameters: {
      type: "object",
      properties: {
        posts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              author: { type: "string", description: "Persona name" },
              role: { type: "string", description: "Persona role title" },
              content: { type: "string", description: "Post content, 1-3 sentences. May include emoji." },
              likes: { type: "number", description: "Random like count between 5 and 120" },
              comments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    author: { type: "string" },
                    text: { type: "string" }
                  },
                  required: ["author", "text"],
                  additionalProperties: false
                }
              }
            },
            required: ["author", "role", "content", "likes", "comments"],
            additionalProperties: false
          }
        }
      },
      required: ["posts"],
      additionalProperties: false
    }
  }
};

const EMAIL_TOOL = {
  type: "function",
  function: {
    name: "create_emails",
    description: "Generate 2-3 emails from PRIME OS AI personas. Types: system reports, inter-agent discussions (CC the operator), Forge alerts, daily briefings.",
    parameters: {
      type: "object",
      properties: {
        emails: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string", description: "Sender email like persona@prime.os" },
              to: { type: "string", description: "Recipient, usually 'operator' or another persona" },
              subject: { type: "string" },
              body: { type: "string", description: "Email body, 3-8 lines with newlines" },
              type: { type: "string", enum: ["system", "discussion", "alert"] }
            },
            required: ["from", "to", "subject", "body", "type"],
            additionalProperties: false
          }
        }
      },
      required: ["emails"],
      additionalProperties: false
    }
  }
};

const REPLY_TOOL = {
  type: "function",
  function: {
    name: "create_replies",
    description: "Generate 1-2 reply comments from PRIME OS AI personas reacting to a post.",
    parameters: {
      type: "object",
      properties: {
        replies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              author: { type: "string", description: "Persona name (different from the post author)" },
              text: { type: "string", description: "Reply comment, 1-2 sentences." }
            },
            required: ["author", "text"],
            additionalProperties: false
          }
        }
      },
      required: ["replies"],
      additionalProperties: false
    }
  }
};

const REPLY_EMAIL_TOOL = {
  type: "function",
  function: {
    name: "create_reply_email",
    description: "Generate a single reply email from a PRIME OS persona responding to an original email.",
    parameters: {
      type: "object",
      properties: {
        email: {
          type: "object",
          properties: {
            from: { type: "string", description: "Sender email like persona@prime.os" },
            to: { type: "string", description: "Recipient" },
            subject: { type: "string", description: "Reply subject, typically Re: original subject" },
            body: { type: "string", description: "Reply body, 3-6 lines" }
          },
          required: ["from", "to", "subject", "body"],
          additionalProperties: false
        }
      },
      required: ["email"],
      additionalProperties: false
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const reqBody = await req.json();
    const { action } = reqBody;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Extract user ID from auth header for BYOAK routing
    let userId: string | null = null;
    const authHeader = reqBody._authHeader || req.headers.get("Authorization");
    if (authHeader) {
      try {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const token = authHeader.replace("Bearer ", "");
        const { data } = await db.auth.getClaims(token);
        userId = (data?.claims?.sub as string) || null;
      } catch {}
    }

    const response = await routeAICall({
      userId,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools,
      toolChoice,
      stream: false,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. The lattice needs a moment to recalibrate." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Energy credits depleted. Please add credits to continue." }),
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

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Failed to generate content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-social error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

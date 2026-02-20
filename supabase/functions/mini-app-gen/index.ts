import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a mini-app generator for PRIME OS. Generate a single self-contained React functional component.

RULES:
- Output ONLY the JavaScript code, no markdown, no explanations
- The component must be named "App"
- Use only: React, useState, useEffect, useCallback, useMemo, useRef (they are provided as globals)
- Use ONLY inline styles (no CSS imports, no Tailwind, no external libraries)
- Use a dark theme: background #1a1a2e, text #e0e0e0, accent #8b5cf6
- The component must be completely self-contained
- No imports, no fetch, no localStorage, no window access
- Keep it under 200 lines
- Make it interactive and visually appealing

Example output:
function App() {
  const [count, React.useState(0)];
  return React.createElement('div', {style: {padding: 20, background: '#1a1a2e', color: '#e0e0e0', height: '100%'}},
    React.createElement('h2', null, 'Counter: ' + count),
    React.createElement('button', {onClick: () => setCount(c => c + 1), style: {padding: '8px 16px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer'}}, 'Increment')
  );
}

IMPORTANT: Use React.createElement instead of JSX since this runs via new Function(). Use array destructuring for hooks: const [state, setState] = useState(initialValue);`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description } = await req.json();
    if (!description) {
      return new Response(JSON.stringify({ error: "Description required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Create a mini-app: ${description}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let code = data.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    code = code.replace(/^```(?:javascript|js|jsx|tsx)?\n?/gm, "").replace(/```$/gm, "").trim();

    return new Response(JSON.stringify({ code }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { routeAICall } from "../_shared/ai-router.ts";

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

    // Extract userId from auth header for BYOAK routing
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
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
        { role: "user", content: `Create a mini-app: ${description}` },
      ],
      stream: false,
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

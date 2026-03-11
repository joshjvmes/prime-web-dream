import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function getAuthUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

function sanitizeHtml(html: string, baseUrl: string): { html: string; title: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '';

  let cleaned = html;

  // Remove script tags and contents
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Remove noscript
  cleaned = cleaned.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  // Remove iframes, objects, embeds, applets
  cleaned = cleaned.replace(/<(iframe|object|embed|applet)[\s\S]*?<\/\1>/gi, '');
  cleaned = cleaned.replace(/<(iframe|object|embed|applet)[^>]*\/?\s*>/gi, '');
  // Remove event handlers
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  // Remove javascript: URLs
  cleaned = cleaned.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  // Remove base tags
  cleaned = cleaned.replace(/<base[^>]*>/gi, '');

  // Parse base URL for rewriting relative URLs
  let origin = '';
  let basePath = '';
  try {
    const u = new URL(baseUrl);
    origin = u.origin;
    basePath = u.pathname.replace(/\/[^/]*$/, '/');
  } catch { /* ignore */ }

  // Rewrite relative URLs to absolute
  const rewrite = (_match: string, attr: string, quote: string, url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('//')) {
      if (url.startsWith('//')) return `${attr}=${quote}https:${url}${quote}`;
      return `${attr}=${quote}${url}${quote}`;
    }
    const abs = url.startsWith('/') ? `${origin}${url}` : `${origin}${basePath}${url}`;
    return `${attr}=${quote}${abs}${quote}`;
  };

  cleaned = cleaned.replace(/(src|href|action)\s*=\s*(["'])((?:(?!\2).)*)\2/gi, rewrite);

  // Also rewrite url() in inline styles
  cleaned = cleaned.replace(/url\(\s*["']?((?:(?!["')]).)+)["']?\s*\)/gi, (_match, url) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return `url("${url}")`;
    if (url.startsWith('//')) return `url("https:${url}")`;
    const abs = url.startsWith('/') ? `${origin}${url}` : `${origin}${basePath}${url}`;
    return `url("${abs}")`;
  });

  return { html: cleaned, title };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Require authentication
  const userId = await getAuthUserId(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Only allow http/https
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return new Response(JSON.stringify({ error: 'Only http:// and https:// URLs are supported' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PrimeBrowser/2.0',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
    });
    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return new Response(JSON.stringify({ error: 'Not an HTML page', status: response.status }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Cap at 2MB
    const text = await response.text();
    const capped = text.length > 2_000_000 ? text.slice(0, 2_000_000) : text;

    const { html, title } = sanitizeHtml(capped, url);

    return new Response(JSON.stringify({ html, title, status: response.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

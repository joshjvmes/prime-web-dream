import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const GITHUB_APP_ID = Deno.env.get("GITHUB_APP_ID")!;
const GITHUB_APP_PRIVATE_KEY = Deno.env.get("GITHUB_APP_PRIVATE_KEY")!;
const GITHUB_APP_CLIENT_ID = Deno.env.get("GITHUB_APP_CLIENT_ID")!;
const GITHUB_APP_CLIENT_SECRET = Deno.env.get("GITHUB_APP_CLIENT_SECRET")!;
const GITHUB_WEBHOOK_SECRET = Deno.env.get("GITHUB_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GITHUB_API = "https://api.github.com";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function serviceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

/** Verify GitHub webhook HMAC-SHA256 signature. */
async function verifyWebhookSignature(
  payload: string,
  signature: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(GITHUB_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const digest = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expected = `sha256=${digest}`;
  // Constant-time comparison (length-safe)
  if (expected.length !== signature.length) return false;
  const a = encoder.encode(expected);
  const b = encoder.encode(signature);
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/** Convert a PEM-encoded PKCS#8 private key into a CryptoKey for RS256 signing. */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemBody = pem
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/, "")
    .replace(/-----END (RSA )?PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    binary,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function base64url(input: Uint8Array | string): string {
  const raw =
    typeof input === "string"
      ? btoa(input)
      : btoa(String.fromCharCode(...input));
  return raw.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Generate a short-lived JWT for authenticating as the GitHub App. */
async function generateAppJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({ iss: GITHUB_APP_ID, iat: now - 60, exp: now + 600 }),
  );
  const data = new TextEncoder().encode(`${header}.${payload}`);
  const key = await importPrivateKey(GITHUB_APP_PRIVATE_KEY);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, data);
  return `${header}.${payload}.${base64url(new Uint8Array(sig))}`;
}

/** Obtain an installation access token from GitHub. */
async function getInstallationToken(installationId: number): Promise<string> {
  const jwt = await generateAppJwt();
  const resp = await fetch(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to get installation token: ${resp.status} ${text}`);
  }
  const body = await resp.json();
  return body.token;
}

// ---------------------------------------------------------------------------
// Auth helper — extract user from Supabase JWT
// ---------------------------------------------------------------------------

async function getUserFromAuth(
  req: Request,
): Promise<{ id: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const {
    data: { user },
    error,
  } = await db.auth.getUser(token);
  if (error || !user) return null;
  return { id: user.id };
}

// ---------------------------------------------------------------------------
// Webhook handler
// ---------------------------------------------------------------------------

async function handleWebhook(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";

  if (!signature) {
    return json({ error: "Missing x-hub-signature-256 header" }, 401);
  }

  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    return json({ error: "Invalid webhook signature" }, 401);
  }

  const event = req.headers.get("x-github-event") ?? "unknown";
  const payload = JSON.parse(rawBody);
  const installationId = payload.installation?.id;

  // Store the event in github_events table
  const db = serviceClient();
  await db.from("github_events").insert({
    installation_id: installationId || 0,
    event_type: event,
    action: payload.action || null,
    repository: payload.repository?.full_name || null,
    sender: payload.sender?.login || null,
    payload,
  }).catch((e: Error) => console.error("Failed to store github event:", e));

  // Find the user who owns this installation (for scoped hook dispatch)
  let userId: string | undefined;
  if (installationId) {
    const { data: inst } = await db
      .from("github_installations")
      .select("user_id")
      .eq("installation_id", installationId)
      .maybeSingle();
    userId = inst?.user_id;
  }

  // Dispatch to hook-dispatcher edge function
  const dispatchUrl = `${SUPABASE_URL}/functions/v1/hook-dispatcher`;
  try {
    await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        event: `github.${event}`,
        user_id: userId,
        payload: {
          event,
          action: payload.action ?? null,
          repository: payload.repository?.full_name ?? null,
          sender: payload.sender?.login ?? null,
          installation_id: installationId,
        },
      }),
    });
  } catch {
    // Fire-and-forget — don't fail the webhook response
  }

  return json({ received: true, event });
}

// ---------------------------------------------------------------------------
// OAuth callback handler
// ---------------------------------------------------------------------------

async function handleOAuthCallback(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const installationId = url.searchParams.get("installation_id");

  if (!code) {
    return json({ error: "Missing code parameter" }, 400);
  }

  // Exchange code for access token
  const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_APP_CLIENT_ID,
      client_secret: GITHUB_APP_CLIENT_SECRET,
      code,
    }),
  });

  if (!tokenResp.ok) {
    return json({ error: "Failed to exchange code for token" }, 502);
  }

  const tokenData = await tokenResp.json();
  if (tokenData.error) {
    return json({ error: tokenData.error_description ?? tokenData.error }, 400);
  }

  // Get the authenticated GitHub user info
  const ghUserResp = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `token ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
    },
  });
  const ghUser = ghUserResp.ok ? await ghUserResp.json() : null;

  // Store installation record linked to the PrimeOS user.
  // The user's Supabase JWT is passed via the OAuth `state` parameter since
  // GitHub's redirect won't include an Authorization header.
  if (installationId) {
    const state = url.searchParams.get("state") ?? "";
    let userId: string | undefined;

    // Try state (JWT passed through OAuth flow) first, then auth header
    if (state) {
      const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: { user }, error: authErr } = await db.auth.getUser(state);
      if (!authErr && user) userId = user.id;
    }
    if (!userId) {
      const user = await getUserFromAuth(req);
      userId = user?.id;
    }

    if (!userId) {
      // Can't link — redirect with error so user can retry from within PrimeOS
      const errUrl = new URL("http://os.rlgix.com");
      errUrl.searchParams.set("github_error", "auth_required");
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: errUrl.toString() },
      });
    }

    const db = serviceClient();
    const { error } = await db.from("github_installations").upsert(
      {
        user_id: userId,
        installation_id: Number(installationId),
        account_login: ghUser?.login || "unknown",
        account_type: ghUser?.type || "User",
        access_token: tokenData.access_token,
        token_expires_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "installation_id" },
    );
    if (error) {
      const errUrl = new URL("http://os.rlgix.com");
      errUrl.searchParams.set("github_error", "storage_failed");
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: errUrl.toString() },
      });
    }
  }

  // Redirect back to PrimeOS so the app can pick up the installation
  const redirectUrl = new URL("http://os.rlgix.com");
  redirectUrl.searchParams.set("github_connected", "true");
  if (installationId) redirectUrl.searchParams.set("installation_id", installationId);
  if (ghUser?.login) redirectUrl.searchParams.set("github_login", ghUser.login);

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: redirectUrl.toString() },
  });
}

// ---------------------------------------------------------------------------
// GitHub API proxy helpers
// ---------------------------------------------------------------------------

async function ghFetch(
  token: string,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const resp = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  const data = await resp.json();
  return json(data, resp.ok ? 200 : resp.status);
}

async function resolveInstallationToken(userId: string): Promise<string> {
  const db = serviceClient();
  const { data, error } = await db
    .from("github_installations")
    .select("installation_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error("No GitHub installation found for this user");
  }

  return getInstallationToken(data.installation_id);
}

// ---------------------------------------------------------------------------
// API proxy action handlers
// ---------------------------------------------------------------------------

type ActionHandler = (
  token: string,
  params: URLSearchParams,
  body: Record<string, unknown> | null,
) => Promise<Response>;

const actions: Record<string, ActionHandler> = {
  "list-repos": async (token) => {
    return ghFetch(token, "/installation/repositories");
  },

  "get-repo": async (token, params) => {
    const owner = params.get("owner");
    const repo = params.get("repo");
    if (!owner || !repo) return json({ error: "owner and repo required" }, 400);
    return ghFetch(token, `/repos/${owner}/${repo}`);
  },

  "list-issues": async (token, params) => {
    const owner = params.get("owner");
    const repo = params.get("repo");
    if (!owner || !repo) return json({ error: "owner and repo required" }, 400);
    const state = params.get("state") ?? "open";
    return ghFetch(token, `/repos/${owner}/${repo}/issues?state=${state}`);
  },

  "create-issue": async (token, params, body) => {
    const owner = params.get("owner");
    const repo = params.get("repo");
    if (!owner || !repo) return json({ error: "owner and repo required" }, 400);
    if (!body?.title) return json({ error: "title is required in body" }, 400);
    return ghFetch(token, `/repos/${owner}/${repo}/issues`, {
      method: "POST",
      body: JSON.stringify({
        title: body.title,
        body: body.body ?? "",
        labels: body.labels ?? [],
        assignees: body.assignees ?? [],
      }),
    });
  },

  "list-prs": async (token, params) => {
    const owner = params.get("owner");
    const repo = params.get("repo");
    if (!owner || !repo) return json({ error: "owner and repo required" }, 400);
    const state = params.get("state") ?? "open";
    return ghFetch(token, `/repos/${owner}/${repo}/pulls?state=${state}`);
  },

  "get-pr": async (token, params) => {
    const owner = params.get("owner");
    const repo = params.get("repo");
    const number = params.get("number");
    if (!owner || !repo || !number)
      return json({ error: "owner, repo, and number required" }, 400);
    return ghFetch(token, `/repos/${owner}/${repo}/pulls/${number}`);
  },

  "create-pr-comment": async (token, params, body) => {
    const owner = params.get("owner");
    const repo = params.get("repo");
    const number = params.get("number");
    if (!owner || !repo || !number)
      return json({ error: "owner, repo, and number required" }, 400);
    if (!body?.body) return json({ error: "body is required" }, 400);
    return ghFetch(token, `/repos/${owner}/${repo}/issues/${number}/comments`, {
      method: "POST",
      body: JSON.stringify({ body: body.body }),
    });
  },

  "list-commits": async (token, params) => {
    const owner = params.get("owner");
    const repo = params.get("repo");
    if (!owner || !repo) return json({ error: "owner and repo required" }, 400);
    const sha = params.get("sha") ?? "HEAD";
    const perPage = params.get("per_page") ?? "30";
    return ghFetch(
      token,
      `/repos/${owner}/${repo}/commits?sha=${sha}&per_page=${perPage}`,
    );
  },

  "get-file": async (token, params) => {
    const owner = params.get("owner");
    const repo = params.get("repo");
    const path = params.get("path");
    if (!owner || !repo || !path)
      return json({ error: "owner, repo, and path required" }, 400);
    const ref = params.get("ref") ?? "";
    const query = ref ? `?ref=${ref}` : "";
    return ghFetch(token, `/repos/${owner}/${repo}/contents/${path}${query}`);
  },
};

// ---------------------------------------------------------------------------
// API proxy entry point
// ---------------------------------------------------------------------------

async function handleApiProxy(req: Request): Promise<Response> {
  const user = await getUserFromAuth(req);
  if (!user) {
    return json({ error: "Authentication required" }, 401);
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  if (!action || !actions[action]) {
    return json(
      { error: `Unknown action: ${action}`, available: Object.keys(actions) },
      400,
    );
  }

  let token: string;
  try {
    token = await resolveInstallationToken(user.id);
  } catch (e) {
    return json({ error: (e as Error).message }, 403);
  }

  let body: Record<string, unknown> | null = null;
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch {
      // no body is fine for some actions
    }
  }

  return actions[action](token, url.searchParams, body);
}

// ---------------------------------------------------------------------------
// Main router
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // 1. Webhook — POST with GitHub signature header
    if (
      req.method === "POST" &&
      req.headers.get("x-hub-signature-256")
    ) {
      return await handleWebhook(req);
    }

    // 2. OAuth callback — GET with code parameter
    if (req.method === "GET" && url.searchParams.has("code")) {
      return await handleOAuthCallback(req);
    }

    // 3. API proxy — any request with an action parameter
    if (action) {
      return await handleApiProxy(req);
    }

    return json(
      {
        error: "Unknown request. Use ?action=<name> for API proxy, or POST a webhook.",
        available_actions: Object.keys(actions),
      },
      400,
    );
  } catch (e) {
    console.error("github-app error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});

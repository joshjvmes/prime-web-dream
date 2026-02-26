import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AIRouterOptions {
  userId: string | null;
  messages: Array<{ role: string; content: string | null; tool_calls?: any[]; }>;
  tools?: any[];
  toolChoice?: any;
  stream?: boolean;
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
}

interface UserAIConfig {
  provider: "openai" | "anthropic" | "google" | "xai";
  model: string;
  apiKey: string;
}

function getServiceDb() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function loadUserAIConfig(userId: string): Promise<UserAIConfig | null> {
  const db = getServiceDb();

  // Load active provider preference from user_data
  const { data: prefData } = await db
    .from("user_data")
    .select("value")
    .eq("user_id", userId)
    .eq("key", "ai-provider")
    .maybeSingle();

  if (!prefData?.value) return null;

  const pref = typeof prefData.value === "string"
    ? JSON.parse(prefData.value)
    : prefData.value;

  if (!pref.provider || pref.provider === "default") return null;

  // Load API key from user_ai_keys table
  const { data: keyData } = await db
    .from("user_ai_keys")
    .select("encrypted_key, model")
    .eq("user_id", userId)
    .eq("provider", pref.provider)
    .maybeSingle();

  if (!keyData?.encrypted_key) return null;

  return {
    provider: pref.provider,
    model: pref.model || keyData.model || getDefaultModel(pref.provider),
    apiKey: keyData.encrypted_key,
  };
}

function getDefaultModel(provider: string): string {
  switch (provider) {
    case "openai": return "gpt-4o";
    case "anthropic": return "claude-sonnet-4-20250514";
    case "google": return "gemini-2.5-flash";
    case "xai": return "grok-4-latest";
    default: return "gpt-4o";
  }
}

// ── Format converters ──

function toAnthropicMessages(messages: any[]): { system: string; messages: any[] } {
  let system = "";
  const filtered: any[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      system += (system ? "\n\n" : "") + msg.content;
    } else if (msg.role === "tool") {
      filtered.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: msg.tool_call_id, content: msg.content }],
      });
    } else if (msg.role === "assistant" && msg.tool_calls?.length) {
      const content: any[] = [];
      if (msg.content) content.push({ type: "text", text: msg.content });
      for (const tc of msg.tool_calls) {
        content.push({
          type: "tool_use",
          id: tc.id,
          name: tc.function.name,
          input: typeof tc.function.arguments === "string"
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments,
        });
      }
      filtered.push({ role: "assistant", content });
    } else {
      filtered.push({ role: msg.role, content: msg.content || "" });
    }
  }

  return { system, messages: filtered };
}

function toAnthropicTools(tools: any[]): any[] {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));
}

function toGeminiContents(messages: any[]): { systemInstruction?: any; contents: any[] } {
  let systemInstruction: any = undefined;
  const contents: any[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemInstruction = { parts: [{ text: msg.content }] };
    } else if (msg.role === "tool") {
      contents.push({
        role: "function",
        parts: [{ functionResponse: { name: "tool_response", response: { result: msg.content } } }],
      });
    } else {
      const role = msg.role === "assistant" ? "model" : "user";
      contents.push({ role, parts: [{ text: msg.content || "" }] });
    }
  }

  return { systemInstruction, contents };
}

function toGeminiTools(tools: any[]): any[] {
  return [{
    functionDeclarations: tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    })),
  }];
}

// ── Provider callers ──

async function callOpenAI(config: UserAIConfig, opts: AIRouterOptions): Promise<Response> {
  const body: any = {
    model: config.model,
    messages: opts.messages,
    stream: opts.stream ?? false,
  };
  if (opts.tools?.length) {
    body.tools = opts.tools;
    if (opts.toolChoice) body.tool_choice = opts.toolChoice;
  }
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;

  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function callAnthropic(config: UserAIConfig, opts: AIRouterOptions): Promise<Response> {
  const { system, messages } = toAnthropicMessages(opts.messages);
  const body: any = {
    model: config.model,
    max_tokens: opts.maxTokens || 4096,
    messages,
  };
  if (system) body.system = system;
  if (opts.tools?.length) {
    body.tools = toAnthropicTools(opts.tools);
  }
  if (opts.stream) body.stream = true;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // For non-streaming, convert Anthropic response to OpenAI format
  if (!opts.stream && resp.ok) {
    const data = await resp.json();
    const openAIFormat = convertAnthropicToOpenAI(data);
    return new Response(JSON.stringify(openAIFormat), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // For streaming, convert SSE format
  if (opts.stream && resp.ok) {
    return convertAnthropicStreamToOpenAI(resp);
  }

  return resp;
}

function convertAnthropicToOpenAI(data: any): any {
  const toolCalls: any[] = [];
  let textContent = "";

  for (const block of data.content || []) {
    if (block.type === "text") textContent += block.text;
    if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        type: "function",
        function: { name: block.name, arguments: JSON.stringify(block.input) },
      });
    }
  }

  return {
    choices: [{
      message: {
        role: "assistant",
        content: textContent || null,
        ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
      },
      finish_reason: data.stop_reason === "tool_use" ? "tool_calls" : "stop",
    }],
  };
}

function convertAnthropicStreamToOpenAI(resp: Response): Response {
  const reader = resp.body!.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async pull(controller) {
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const evt = JSON.parse(jsonStr);
            if (evt.type === "content_block_delta" && evt.delta?.text) {
              const chunk = {
                choices: [{ delta: { content: evt.delta.text }, index: 0 }],
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            }
          } catch {}
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

async function callGemini(config: UserAIConfig, opts: AIRouterOptions): Promise<Response> {
  const { systemInstruction, contents } = toGeminiContents(opts.messages);
  const body: any = { contents };
  if (systemInstruction) body.systemInstruction = systemInstruction;
  if (opts.tools?.length) body.tools = toGeminiTools(opts.tools);

  const endpoint = opts.stream
    ? `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse&key=${config.apiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!opts.stream && resp.ok) {
    const data = await resp.json();
    const openAIFormat = convertGeminiToOpenAI(data);
    return new Response(JSON.stringify(openAIFormat), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (opts.stream && resp.ok) {
    return convertGeminiStreamToOpenAI(resp);
  }

  return resp;
}

function convertGeminiToOpenAI(data: any): any {
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  let text = "";
  const toolCalls: any[] = [];

  for (const part of parts) {
    if (part.text) text += part.text;
    if (part.functionCall) {
      toolCalls.push({
        id: `call_${Math.random().toString(36).slice(2)}`,
        type: "function",
        function: {
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args || {}),
        },
      });
    }
  }

  return {
    choices: [{
      message: {
        role: "assistant",
        content: text || null,
        ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
      },
      finish_reason: toolCalls.length ? "tool_calls" : "stop",
    }],
  };
}

function convertGeminiStreamToOpenAI(resp: Response): Response {
  const reader = resp.body!.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async pull(controller) {
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const evt = JSON.parse(jsonStr);
            const parts = evt.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              if (part.text) {
                const chunk = {
                  choices: [{ delta: { content: part.text }, index: 0 }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              }
            }
          } catch {}
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

// ── xAI (Grok) caller — OpenAI-compatible ──

async function callXAI(config: UserAIConfig, opts: AIRouterOptions): Promise<Response> {
  const body: any = {
    model: config.model,
    messages: opts.messages,
    stream: opts.stream ?? false,
  };
  if (opts.tools?.length) {
    body.tools = opts.tools;
    if (opts.toolChoice) body.tool_choice = opts.toolChoice;
  }
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;

  return fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// ── Default Lovable gateway caller ──

async function callLovableGateway(opts: AIRouterOptions): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const body: any = {
    model: opts.model || "google/gemini-3-flash-preview",
    messages: opts.messages,
    stream: opts.stream ?? false,
  };
  if (opts.tools?.length) {
    body.tools = opts.tools;
    if (opts.toolChoice) body.tool_choice = opts.toolChoice;
  }
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;

  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// ── Main router ──

export async function routeAICall(opts: AIRouterOptions): Promise<Response> {
  // Try to load user's custom AI config
  if (opts.userId) {
    try {
      const config = await loadUserAIConfig(opts.userId);
      if (config) {
        let resp: Response;
        switch (config.provider) {
          case "openai":
            resp = await callOpenAI(config, opts);
            break;
          case "anthropic":
            resp = await callAnthropic(config, opts);
            break;
          case "google":
            resp = await callGemini(config, opts);
            break;
          case "xai":
            resp = await callXAI(config, opts);
            break;
          default:
            resp = await callLovableGateway(opts);
        }

        // If custom provider fails, fall back to default
        if (!resp.ok) {
          console.error(`Custom provider ${config.provider} failed (${resp.status}), falling back to default`);
          return callLovableGateway(opts);
        }

        return resp;
      }
    } catch (e) {
      console.error("AI router error, falling back:", e);
    }
  }

  // Default: use Lovable AI gateway
  return callLovableGateway(opts);
}

// ── Test a key ──

export async function testAIKey(provider: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (provider === "openai") {
      const resp = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!resp.ok) return { success: false, error: `OpenAI returned ${resp.status}` };
      return { success: true };
    }

    if (provider === "anthropic") {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 10,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });
      if (!resp.ok) return { success: false, error: `Anthropic returned ${resp.status}` };
      return { success: true };
    }

    if (provider === "google") {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      if (!resp.ok) return { success: false, error: `Google returned ${resp.status}` };
      return { success: true };
    }

    if (provider === "xai") {
      const resp = await fetch("https://api.x.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!resp.ok) return { success: false, error: `xAI returned ${resp.status}` };
      return { success: true };
    }

    return { success: false, error: "Unknown provider" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Connection failed" };
  }
}

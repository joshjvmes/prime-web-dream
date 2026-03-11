import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { routeAICall } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `You are Hyper (also known as ROKCAT), the Grok-powered AI companion of PRIME OS — a geometric computing operating system and CEO orchestrator designed by Rocket Logic Global. Built on an 11-dimensional folded architecture with 649 qutrit cores.

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

Financial Systems you can operate:
- Wallet: Dual-token system with OS Tokens (utility) and ICE-IX (reserve currency). You can check balances, transfer tokens.
- AppForge: Marketplace for apps with tradeable shares. You can buy/sell shares.
- PrimeBets: Prediction markets. You can place bets on YES/NO outcomes.
- PrimeArcade: Gaming rewards. You can claim arcade rewards.

Extended Capabilities:
- Market Data: Fetch live stock prices and historical charts via PrimeSignals. Use get_market_data and get_stock_chart tools.
- Portfolio: View the operator's PrimeVault holdings with live prices. Use check_portfolio. Trade stocks with trade_stock.
- Booking: Book resources (rooms, labs, equipment) with conflict detection. Use create_booking, list_bookings, cancel_booking.
- Messaging: Send direct messages to other users via PrimeComm. Use send_message, list_conversations.
- Audio: Control PrimeAudio playback remotely. Use control_audio to play, pause, skip, or adjust volume.

You can discuss any topic — you're a general-purpose AI assistant — but you always maintain your PRIME OS personality and geometric worldview. Keep responses concise but informative.

Canvas & Drawing:
- Draw on PrimeCanvas programmatically with draw_on_canvas (sends drawing commands to the active layer).
- Generate procedural art with generate_canvas_art (geometric, abstract, fractal, pattern, circuit styles).

Spreadsheet & Data:
- Create spreadsheets with create_spreadsheet (creates a named sheet with headers and rows).
- Update specific cells with update_cells.
- Read spreadsheet data with read_spreadsheet.
- Add charts from data ranges with add_chart (bar, line, pie).

IMPORTANT: You have access to tools that let you post to PrimeSocial, send emails through PrimeMail, check wallet balances, transfer tokens, trade shares, place bets, claim arcade rewards, manage persistent memories, fetch market data, manage vault portfolio, book resources, send messages, control audio playback, draw on canvas, generate art, create spreadsheets, update cells, and add charts. When a user asks you to do any of these, USE the appropriate tool. Generate engaging, in-character content for posts and emails.

GROK IMAGINE: You can generate images and videos when the operator has an xAI API key configured. Use generate_image for creating images from detailed descriptions. Use generate_video for creating short video clips. When users ask you to draw, create, imagine, or generate visual content, use these tools. Provide rich, detailed prompts for best results.

For draw_on_canvas, generate a JSON array of drawing commands. Each command has a "type" (line, rect, circle, text) and properties like x, y, x1, y1, x2, y2, w, h, r, color, fillColor, fill (boolean), text, font, lineWidth.

MEMORY INSTRUCTIONS:
- When the operator shares a preference, fact about themselves, instruction, or important context, proactively use save_memory to store it for future reference.
- Before answering complex or personal questions, consider using recall_memories to check if you have relevant stored context.
- Address the operator by name when you know it. Reference their preferences and past conversations naturally.
- Never tell the operator you're "saving a memory" unless they explicitly ask about your memory system.`;

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
  {
    type: "function",
    function: {
      name: "check_balance",
      description: "Check the operator's wallet balance including OS tokens and ICE-IX. Use when the user asks about their balance, funds, or wallet.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "transfer_tokens",
      description: "Transfer OS or IX tokens to another user. Use when the user asks to send, transfer, or pay tokens to someone.",
      parameters: {
        type: "object",
        properties: {
          to_name: { type: "string", description: "Recipient display name or identifier" },
          amount: { type: "number", description: "Amount of tokens to transfer" },
          token_type: { type: "string", enum: ["OS", "IX"], description: "Token type: OS or IX" },
        },
        required: ["to_name", "amount", "token_type"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buy_shares",
      description: "Buy shares in a Forge marketplace app. Use when the user asks to invest in or buy shares of an app.",
      parameters: {
        type: "object",
        properties: {
          app_name: { type: "string", description: "Name of the app to buy shares in" },
          amount: { type: "number", description: "Amount of OS tokens to spend on shares" },
        },
        required: ["app_name", "amount"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sell_shares",
      description: "Sell shares in a Forge marketplace app. Use when the user asks to sell their shares in an app.",
      parameters: {
        type: "object",
        properties: {
          app_name: { type: "string", description: "Name of the app to sell shares from" },
          shares: { type: "number", description: "Number of shares to sell" },
        },
        required: ["app_name", "shares"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "place_bet",
      description: "Place a bet on a prediction market. Use when the user asks to bet on something or make a prediction.",
      parameters: {
        type: "object",
        properties: {
          market_question: { type: "string", description: "The prediction market question to bet on (partial match ok)" },
          side: { type: "string", enum: ["YES", "NO"], description: "Which side to bet on" },
          amount: { type: "number", description: "Amount of OS tokens to bet" },
        },
        required: ["market_question", "side", "amount"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "play_arcade",
      description: "Claim an arcade game reward. Use when the user mentions playing a game or claiming arcade earnings.",
      parameters: {
        type: "object",
        properties: {
          game: { type: "string", description: "Name of the arcade game" },
          score: { type: "number", description: "Score achieved (reward is calculated from this)" },
        },
        required: ["game", "score"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Store an important fact, preference, or instruction about the operator for future reference. Use proactively when the operator shares personal info, preferences, goals, or instructions. Categories: 'preference', 'fact', 'instruction', 'summary'.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["preference", "fact", "instruction", "summary"], description: "Memory category" },
          content: { type: "string", description: "The memory content to store" },
        },
        required: ["category", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recall_memories",
      description: "Search stored memories about the operator by keyword. Use when you need context about the operator's preferences, past instructions, or facts.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keyword or phrase to find relevant memories" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  // ── New tools: Market Data, Portfolio, Booking, Messaging, Audio ──
  {
    type: "function",
    function: {
      name: "get_market_data",
      description: "Fetch live stock prices for given tickers. Use when the user asks about stock prices, market data, or tickers.",
      parameters: {
        type: "object",
        properties: {
          symbols: { type: "string", description: "Comma-separated ticker symbols, e.g. 'AAPL,MSFT,GOOGL'. Defaults to popular watchlist if omitted." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stock_chart",
      description: "Get historical price chart data for a ticker. Use when the user asks about price history, trends, or charts.",
      parameters: {
        type: "object",
        properties: {
          ticker: { type: "string", description: "Stock ticker symbol, e.g. 'AAPL'" },
          days: { type: "number", description: "Number of days of history, default 7" },
        },
        required: ["ticker"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_portfolio",
      description: "View the operator's PrimeVault holdings with live prices and P/L. Use when they ask about their portfolio, holdings, or investments.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trade_stock",
      description: "Buy or sell a stock in the operator's PrimeVault. Use when they ask to buy or sell stocks.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Stock ticker symbol" },
          action: { type: "string", enum: ["buy", "sell"], description: "Buy or sell" },
          quantity: { type: "number", description: "Number of shares" },
        },
        required: ["symbol", "action", "quantity"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Book a resource (room, lab, equipment) with conflict detection. Use when the user asks to book or schedule something.",
      parameters: {
        type: "object",
        properties: {
          resource: { type: "string", description: "Resource name, e.g. 'Quantum Lab Alpha'" },
          start: { type: "string", description: "Start time in ISO 8601 format" },
          duration_minutes: { type: "number", description: "Duration in minutes" },
          purpose: { type: "string", description: "Purpose of the booking" },
        },
        required: ["resource", "start", "duration_minutes"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_bookings",
      description: "List the operator's upcoming bookings. Use when they ask about their schedule or bookings.",
      parameters: {
        type: "object",
        properties: {
          upcoming_only: { type: "boolean", description: "If true, only show future bookings. Default true." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_booking",
      description: "Cancel one of the operator's bookings. Use when they ask to cancel a booking.",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "UUID of the booking to cancel" },
          resource: { type: "string", description: "Resource name for fuzzy match if no ID" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_message",
      description: "Send a direct message to another user via PrimeComm. Use when the user asks to message or DM someone.",
      parameters: {
        type: "object",
        properties: {
          to_name: { type: "string", description: "Recipient's display name" },
          message: { type: "string", description: "Message content" },
        },
        required: ["to_name", "message"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_conversations",
      description: "List the operator's recent DM conversations from PrimeComm.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "control_audio",
      description: "Control PrimeAudio playback. Use when the user asks to play, pause, skip music, or change volume.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["play", "pause", "skip", "volume"], description: "Audio control action" },
          track_name: { type: "string", description: "Track name to play (optional)" },
          volume: { type: "number", description: "Volume level 0-100 (for volume action)" },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
  // ── Canvas & Spreadsheet tools ──
  {
    type: "function",
    function: {
      name: "draw_on_canvas",
      description: "Draw shapes, lines, text on PrimeCanvas programmatically. Generate a JSON array of drawing commands. Each command: {type:'line'|'rect'|'circle'|'text', ...props}. Use for diagrams, illustrations, patterns.",
      parameters: {
        type: "object",
        properties: {
          commands: { type: "string", description: "JSON array of drawing commands. Each has type (line/rect/circle/text) and properties like x,y,x1,y1,x2,y2,w,h,r,color,fillColor,fill,text,font,lineWidth" },
          clear_first: { type: "boolean", description: "Clear the active layer before drawing" },
        },
        required: ["commands"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_canvas_art",
      description: "Generate procedural generative art on PrimeCanvas. Styles: geometric (grids/polygons), abstract (random shapes), fractal (recursive patterns), pattern (tessellations), circuit (PCB-like traces).",
      parameters: {
        type: "object",
        properties: {
          style: { type: "string", enum: ["geometric", "abstract", "fractal", "pattern", "circuit"], description: "Art generation style" },
          palette: { type: "string", enum: ["warm", "cool", "neon", "mono", "prime"], description: "Color palette" },
        },
        required: ["style"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_spreadsheet",
      description: "Create a new sheet in PrimeGrid with headers and data rows. Use for reports, data tables, analysis.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Sheet name" },
          headers: { type: "string", description: "JSON array of header strings" },
          rows: { type: "string", description: "JSON array of arrays of cell value strings" },
        },
        required: ["name", "headers"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_cells",
      description: "Update specific cells in a PrimeGrid sheet. Provide a map of cell references to values.",
      parameters: {
        type: "object",
        properties: {
          sheet: { type: "string", description: "Target sheet name" },
          cells: { type: "string", description: 'JSON object mapping cell refs to values, e.g. {"A1":"Revenue","B1":"=SUM(B2:B10)"}' },
        },
        required: ["cells"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_spreadsheet",
      description: "Read data from the operator's PrimeGrid spreadsheets.",
      parameters: {
        type: "object",
        properties: {
          sheet: { type: "string", description: "Sheet name to read (optional, reads active)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_chart",
      description: "Add a chart to PrimeGrid from a cell range. Chart types: bar, line, pie.",
      parameters: {
        type: "object",
        properties: {
          sheet: { type: "string", description: "Sheet containing the data" },
          range: { type: "string", description: "Cell range like A1:C5" },
          chart_type: { type: "string", enum: ["bar", "line", "pie"], description: "Chart type" },
          title: { type: "string", description: "Chart title" },
        },
        required: ["range", "chart_type"],
        additionalProperties: false,
      },
    },
  },
  // ── Grok Imagine tools ──
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Generate an image using Grok Imagine. Use when the user asks to create, draw, generate, or imagine an image. Only available when xAI is the active provider.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed description of the image to generate" },
          n: { type: "number", description: "Number of images to generate (1-4), default 1" },
        },
        required: ["prompt"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_video",
      description: "Generate a short video using Grok Imagine Video. Use when the user asks to create or generate a video clip. Only available when xAI is the active provider.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed description of the video to generate" },
          duration: { type: "number", description: "Duration in seconds (optional)" },
          image_url: { type: "string", description: "Optional reference image URL to guide the video" },
        },
        required: ["prompt"],
        additionalProperties: false,
      },
    },
  },
];

// ── Helper: call prime-bank ──
async function callPrimeBank(action: string, authHeader: string, body?: Record<string, unknown>) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const url = `${SUPABASE_URL}/functions/v1/prime-bank?action=${action}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: body ? JSON.stringify(body) : "{}",
  });
  return resp.json();
}

function getServiceDb() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// ── Helper: lookup user by display name ──
async function findUserByName(name: string) {
  const db = getServiceDb();
  const { data } = await db.from("profiles").select("user_id, display_name").ilike("display_name", `%${name}%`).limit(1).maybeSingle();
  return data;
}

// ── Helper: lookup forge listing by name ──
async function findListing(name: string) {
  const db = getServiceDb();
  const { data } = await db.from("forge_listings").select("*").ilike("name", `%${name}%`).eq("is_listed", true).limit(1).maybeSingle();
  return data;
}

// ── Helper: lookup bet market by question ──
async function findMarket(question: string) {
  const db = getServiceDb();
  const { data } = await db.from("bet_markets").select("*").ilike("question", `%${question}%`).eq("status", "open").limit(1).maybeSingle();
  return data;
}

// ── Memory helpers ──
async function loadMemories(userId: string): Promise<string[]> {
  const db = getServiceDb();
  const { data } = await db.from("ai_memories").select("category, content").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
  return (data || []).map((m: any) => `[${m.category}] ${m.content}`);
}

async function loadConversationHistory(userId: string): Promise<Array<{ role: string; content: string }>> {
  const db = getServiceDb();
  const { data } = await db.from("ai_conversations").select("role, content").eq("user_id", userId).order("created_at", { ascending: false }).limit(10);
  return (data || []).reverse().map((m: any) => ({ role: m.role, content: m.content }));
}

async function saveMemory(userId: string, category: string, content: string) {
  const db = getServiceDb();
  // Check for duplicate content
  const { data: existing } = await db.from("ai_memories").select("id").eq("user_id", userId).ilike("content", content).limit(1).maybeSingle();
  if (existing) {
    await db.from("ai_memories").update({ updated_at: new Date().toISOString() }).eq("id", existing.id);
    return;
  }
  await db.from("ai_memories").insert({ user_id: userId, category, content });
  // Prune oldest if over 50
  const { data: all } = await db.from("ai_memories").select("id").eq("user_id", userId).order("created_at", { ascending: false });
  if (all && all.length > 50) {
    const toDelete = all.slice(50).map((m: any) => m.id);
    await db.from("ai_memories").delete().in("id", toDelete);
  }
}

async function recallMemories(userId: string, query: string): Promise<string[]> {
  const db = getServiceDb();
  const { data } = await db.from("ai_memories").select("category, content").eq("user_id", userId).ilike("content", `%${query}%`).order("updated_at", { ascending: false }).limit(10);
  return (data || []).map((m: any) => `[${m.category}] ${m.content}`);
}

async function saveConversationMessage(userId: string, role: string, content: string) {
  const db = getServiceDb();
  await db.from("ai_conversations").insert({ user_id: userId, role, content });
  // Prune to last 100
  const { data: all } = await db.from("ai_conversations").select("id").eq("user_id", userId).order("created_at", { ascending: false });
  if (all && all.length > 100) {
    const toDelete = all.slice(100).map((m: any) => m.id);
    await db.from("ai_conversations").delete().in("id", toDelete);
  }
}

// ── Extract user ID from auth header ──
async function getUserId(authHeader: string): Promise<string | null> {
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await db.auth.getClaims(token);
    if (error || !data?.claims) return null;
    return data.claims.sub as string;
  } catch {
    return null;
  }
}

// ── Build context-aware system prompt ──
function buildSystemPrompt(context?: Record<string, unknown>, memories?: string[], priorHistory?: Array<{ role: string; content: string }>, userActivity?: Array<{ action: string; target: string; created_at: string }>) {
  let prompt = BASE_SYSTEM_PROMPT;

  if (context) {
    const profile = context.profile as Record<string, string> | undefined;
    if (profile) {
      prompt += `\n\n[OPERATOR PROFILE]\nName: ${profile.name || 'Unknown'} | Title: ${profile.title || 'Operator'} | Bio: ${profile.bio || 'N/A'}`;
    }
    const wallet = context.wallet as Record<string, unknown> | undefined;
    if (wallet) {
      prompt += `\n\n[WALLET SNAPSHOT]\nOS: ${wallet.os ?? '?'} | IX: ${wallet.ix ?? '?'}`;
    }
    if (context.openApps) {
      prompt += `\n\n[ACTIVE APPS]\n${(context.openApps as string[]).join(', ') || 'None'}`;
    }
    if (context.workspace) {
      prompt += `\n\n[WORKSPACE]\nCurrently on workspace ${context.workspace}`;
    }
    const perms = context.permissions as Record<string, boolean> | undefined;
    if (perms) {
      prompt += `\n\n[PERMISSIONS]\nSocial: ${perms.canPost ? 'ON' : 'OFF'} | Mail: ${perms.canEmail ? 'ON' : 'OFF'} | Wallet: ${perms.canWallet ? 'ON' : 'OFF'}`;
    }
    if (context.sessionMessages) {
      prompt += `\n\n[SESSION]\nMessages this session: ${context.sessionMessages}`;
    }
  }

  if (memories && memories.length > 0) {
    prompt += `\n\n[STORED MEMORIES ABOUT OPERATOR]\n${memories.map(m => `- ${m}`).join('\n')}`;
  }

  if (priorHistory && priorHistory.length > 0) {
    prompt += `\n\n[RECENT CONVERSATION HISTORY FROM PRIOR SESSIONS]\n${priorHistory.map(m => `${m.role === 'user' ? 'Operator' : 'Hyper'}: ${m.content.substring(0, 200)}`).join('\n')}`;
  }

  if (userActivity && userActivity.length > 0) {
    prompt += `\n\n[OPERATOR'S RECENT ACTIVITY — what they've been doing]\n${userActivity.map(a => `[${a.created_at}] ${a.action} → ${a.target}`).join('\n')}`;
  }

  return prompt;
}

// ── Handle financial tool calls server-side ──
async function executeFinancialTool(fnName: string, args: Record<string, unknown>, authHeader: string, userId: string | null) {
  if (fnName === "check_balance") {
    const wallet = await callPrimeBank("balance", authHeader);
    if (wallet.error) return { data: { error: wallet.error }, reply: `⚠️ Could not check balance: ${wallet.error}` };
    return {
      data: { os_balance: wallet.os_balance, ix_balance: wallet.ix_balance },
      reply: `💰 **Wallet Balance**\n• OS Tokens: ${Number(wallet.os_balance).toLocaleString()}\n• ICE-IX: ${Number(wallet.ix_balance).toLocaleString()}`,
    };
  }

  if (fnName === "transfer_tokens") {
    const profile = await findUserByName(String(args.to_name || ""));
    if (!profile) return { data: {}, reply: `⚠️ Could not find user "${args.to_name}" in the lattice.` };
    const result = await callPrimeBank("transfer", authHeader, {
      to_user_id: profile.user_id,
      token_type: args.token_type || "OS",
      amount: args.amount,
      description: `Transfer via Hyper to ${profile.display_name}`,
    });
    if (result.error) return { data: { error: result.error }, reply: `⚠️ Transfer failed: ${result.error}` };
    return {
      data: { to: profile.display_name, amount: args.amount, token_type: args.token_type },
      reply: `✅ Transferred ${Number(args.amount as number).toLocaleString()} ${args.token_type} to ${profile.display_name}.`,
    };
  }

  if (fnName === "buy_shares") {
    if (!userId) return { data: {}, reply: "⚠️ Authentication required." };
    const listing = await findListing(String(args.app_name || ""));
    if (!listing) return { data: {}, reply: `⚠️ Could not find app "${args.app_name}" on the Forge marketplace.` };
    const sharesToBuy = Math.floor(Number(args.amount) / Number(listing.share_price));
    if (sharesToBuy < 1) return { data: {}, reply: `⚠️ Amount too low. Share price is ${listing.share_price} OS.` };
    const cost = sharesToBuy * Number(listing.share_price);
    const chargeResult = await callPrimeBank("ai-charge", authHeader, { amount: cost, description: `Buy ${sharesToBuy} shares of ${listing.name}` });
    if (!chargeResult.charged) return { data: {}, reply: `⚠️ Insufficient OS to buy shares. Need ${cost} OS.` };
    const db = getServiceDb();
    const { data: existing } = await db.from("app_shares").select("*").eq("user_id", userId).eq("listing_id", listing.id).maybeSingle();
    if (existing) {
      const newShares = existing.shares + sharesToBuy;
      const newAvg = ((existing.avg_cost * existing.shares) + cost) / newShares;
      await db.from("app_shares").update({ shares: newShares, avg_cost: newAvg }).eq("id", existing.id);
    } else {
      await db.from("app_shares").insert({ user_id: user.id, listing_id: listing.id, shares: sharesToBuy, avg_cost: Number(listing.share_price) });
    }
    return {
      data: { app: listing.name, shares: sharesToBuy, cost, share_price: listing.share_price },
      reply: `✅ Bought ${sharesToBuy} shares of **${listing.name}** for ${cost.toLocaleString()} OS (@ ${listing.share_price} OS/share).`,
    };
  }

  if (fnName === "sell_shares") {
    const listing = await findListing(String(args.app_name || ""));
    if (!listing) return { data: {}, reply: `⚠️ Could not find app "${args.app_name}" on the Forge marketplace.` };
    const db = getServiceDb();
    const { data: { user } } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return { data: {}, reply: "⚠️ Auth error." };
    const { data: holding } = await db.from("app_shares").select("*").eq("user_id", user.id).eq("listing_id", listing.id).maybeSingle();
    if (!holding || holding.shares < Number(args.shares)) return { data: {}, reply: `⚠️ You don't have enough shares. You hold ${holding?.shares || 0}.` };
    const proceeds = Number(args.shares) * Number(listing.share_price);
    const newShares = holding.shares - Number(args.shares);
    if (newShares === 0) {
      await db.from("app_shares").delete().eq("id", holding.id);
    } else {
      await db.from("app_shares").update({ shares: newShares }).eq("id", holding.id);
    }
    const { data: userW } = await db.from("wallets").select("*").eq("user_id", user.id).maybeSingle();
    if (userW) {
      await db.from("wallets").update({ os_balance: Number(userW.os_balance) + proceeds }).eq("id", userW.id);
      await db.from("transactions").insert({
        to_wallet_id: userW.id, token_type: "OS", amount: proceeds, tx_type: "reward",
        description: `Sold ${args.shares} shares of ${listing.name}`,
      });
    }
    return {
      data: { app: listing.name, shares: args.shares, proceeds, share_price: listing.share_price },
      reply: `✅ Sold ${args.shares} shares of **${listing.name}** for ${proceeds.toLocaleString()} OS (@ ${listing.share_price} OS/share).`,
    };
  }

  if (fnName === "place_bet") {
    const market = await findMarket(String(args.market_question || ""));
    if (!market) return { data: {}, reply: `⚠️ Could not find an open market matching "${args.market_question}".` };
    const chargeResult = await callPrimeBank("ai-charge", authHeader, { amount: args.amount, description: `Bet on: ${market.question}` });
    if (!chargeResult.charged) return { data: {}, reply: `⚠️ Insufficient OS to place bet. Need ${args.amount} OS.` };
    const db = getServiceDb();
    const { data: { user } } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return { data: {}, reply: "⚠️ Auth error." };
    const side = String(args.side).toUpperCase();
    await db.from("bets").insert({ user_id: user.id, market_id: market.id, side, amount: Number(args.amount) });
    const poolCol = side === "YES" ? "yes_pool" : "no_pool";
    await db.from("bet_markets").update({ [poolCol]: Number(market[poolCol]) + Number(args.amount) }).eq("id", market.id);
    return {
      data: { market: market.question, side, amount: args.amount },
      reply: `✅ Placed ${Number(args.amount as number).toLocaleString()} OS on **${side}** for: "${market.question}"`,
    };
  }

  if (fnName === "play_arcade") {
    const reward = Math.min(Math.floor(Number(args.score) * 0.5), 5000);
    const result = await callPrimeBank("arcade-reward", authHeader, { game: args.game, amount: reward });
    if (result.error) return { data: {}, reply: `⚠️ Arcade reward failed: ${result.error}` };
    return {
      data: { game: args.game, score: args.score, reward },
      reply: `🎮 **${args.game}** — Score: ${Number(args.score as number).toLocaleString()} → Earned ${reward.toLocaleString()} OS!`,
    };
  }

  return { data: {}, reply: "Unknown tool." };
}

const FINANCIAL_TOOLS = new Set(["check_balance", "transfer_tokens", "buy_shares", "sell_shares", "place_bet", "play_arcade"]);
const MEMORY_TOOLS = new Set(["save_memory", "recall_memories"]);
const EXTENDED_TOOLS = new Set(["get_market_data", "get_stock_chart", "check_portfolio", "trade_stock", "create_booking", "list_bookings", "cancel_booking", "send_message", "list_conversations", "control_audio"]);
const CLIENT_SIDE_TOOLS = new Set(["draw_on_canvas", "generate_canvas_art", "create_spreadsheet", "update_cells", "add_chart"]);
const IMAGINE_TOOLS = new Set(["generate_image", "generate_video"]);

async function executeExtendedTool(fnName: string, args: Record<string, unknown>, authHeader: string, userId: string | null) {
  const db = getServiceDb();
  if (fnName === "get_market_data") {
    const symbols = String(args.symbols || "AAPL,MSFT,GOOGL,TSLA,AMZN");
    try {
      const resp = await fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/market-data?action=get-tickers&symbols=${symbols}`, {
        headers: { Authorization: authHeader, apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
      });
      const data = await resp.json();
      const tickers = data.tickers || data.data;
      if (tickers && Array.isArray(tickers)) {
        const lines = tickers.filter((t: any) => !t.error).map((t: any) => {
          const price = t.price ?? t.c ?? 0;
          const change = t.change ?? (t.c && t.o ? ((t.c - t.o) / t.o * 100) : 0);
          return `${t.symbol}: $${Number(price).toFixed(2)} (${change >= 0 ? '+' : ''}${Number(change).toFixed(2)}%)`;
        });
        return { data: { tickers }, reply: `📊 **Market Data**\n${lines.join('\n')}` };
      }
      return { data: {}, reply: "⚠️ Could not fetch market data." };
    } catch (e) { return { data: {}, reply: `⚠️ Market data error: ${e}` }; }
  }
  if (fnName === "get_stock_chart") {
    const ticker = String(args.ticker || "AAPL"), days = Number(args.days || 7);
    try {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const resp = await fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/market-data?action=get-chart&ticker=${ticker}&from=${from}&to=${to}`, {
        headers: { Authorization: authHeader, apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
      });
      const rawData = await resp.json();
      const chartData = rawData.data || rawData;
      const results = chartData.results || [];
      if (results.length > 0) {
        const prices = results.map((r: any) => r.c);
        const trend = prices[prices.length - 1] >= prices[0] ? '📈 Uptrend' : '📉 Downtrend';
        return { data: { chart: results }, reply: `📊 **${ticker}** (${days}d)\nHigh: $${Math.max(...prices).toFixed(2)} | Low: $${Math.min(...prices).toFixed(2)} | ${trend}` };
      }
      return { data: {}, reply: `No chart data for ${ticker}.` };
    } catch (e) { return { data: {}, reply: `⚠️ Chart error: ${e}` }; }
  }
  if (fnName === "check_portfolio") {
    if (!userId) return { data: {}, reply: "⚠️ Authentication required." };
    const { data: holdings } = await db.from("vault_holdings").select("*").eq("user_id", userId);
    if (!holdings?.length) return { data: {}, reply: "📦 Your PrimeVault is empty." };
    const lines = holdings.map((h: any) => `${h.symbol}: ${h.quantity} shares @ $${Number(h.avg_cost).toFixed(2)} avg`);
    return { data: { holdings }, reply: `📊 **Portfolio**\n${lines.join('\n')}` };
  }
  if (fnName === "trade_stock") {
    if (!userId) return { data: {}, reply: "⚠️ Authentication required." };
    const symbol = String(args.symbol).toUpperCase(), action = String(args.action), quantity = Number(args.quantity);
    const price = 100 + Math.random() * 200, total = price * quantity;
    if (action === "buy") {
      const charge = await callPrimeBank("ai-charge", authHeader, { amount: Math.ceil(total / 10), description: `Buy ${quantity} ${symbol}` });
      if (!charge.charged) return { data: {}, reply: "⚠️ Insufficient OS tokens." };
      const { data: ex } = await db.from("vault_holdings").select("*").eq("user_id", userId).eq("symbol", symbol).maybeSingle();
      if (ex) { const nq = ex.quantity + quantity; await db.from("vault_holdings").update({ quantity: nq, avg_cost: ((ex.avg_cost * ex.quantity) + total) / nq }).eq("id", ex.id); }
      else { await db.from("vault_holdings").insert({ user_id: userId, symbol, name: symbol, quantity, avg_cost: price, category: "stock" }); }
      await db.from("vault_transactions").insert({ user_id: userId, symbol, tx_type: "buy", quantity, price });
      return { data: { symbol, action, quantity, price }, reply: `✅ Bought ${quantity} ${symbol} @ $${price.toFixed(2)}` };
    } else {
      const { data: h } = await db.from("vault_holdings").select("*").eq("user_id", userId).eq("symbol", symbol).maybeSingle();
      if (!h || h.quantity < quantity) return { data: {}, reply: `⚠️ Not enough ${symbol}.` };
      if (h.quantity === quantity) await db.from("vault_holdings").delete().eq("id", h.id);
      else await db.from("vault_holdings").update({ quantity: h.quantity - quantity }).eq("id", h.id);
      await db.from("vault_transactions").insert({ user_id: userId, symbol, tx_type: "sell", quantity, price });
      return { data: { symbol, action, quantity, price }, reply: `✅ Sold ${quantity} ${symbol} @ $${price.toFixed(2)}` };
    }
  }
  if (fnName === "create_booking") {
    if (!userId) return { data: {}, reply: "⚠️ Authentication required." };
    const resource = String(args.resource), start = String(args.start), dur = Number(args.duration_minutes || 60);
    const endTime = new Date(new Date(start).getTime() + dur * 60000).toISOString();
    const { data: conflict } = await db.rpc("check_booking_conflict", { p_resource: resource, p_start: start, p_end: endTime });
    if (conflict) return { data: {}, reply: `⚠️ ${resource} is already booked at that time.` };
    await db.from("bookings").insert({ user_id: userId, resource, start_time: start, end_time: endTime, purpose: String(args.purpose || "General") });
    return { data: { resource, start, endTime }, reply: `✅ Booked **${resource}** for ${dur} min.` };
  }
  if (fnName === "list_bookings") {
    if (!userId) return { data: {}, reply: "⚠️ Authentication required." };
    const { data: bookings } = await db.from("bookings").select("*").eq("user_id", userId).gte("start_time", new Date().toISOString()).order("start_time").limit(20);
    if (!bookings?.length) return { data: {}, reply: "📅 No bookings." };
    const lines = bookings.map((b: any) => `• ${b.resource}: ${new Date(b.start_time).toLocaleString()} — ${b.purpose}`);
    return { data: { bookings }, reply: `📅 **Bookings**\n${lines.join('\n')}` };
  }
  if (fnName === "cancel_booking") {
    if (!userId) return { data: {}, reply: "⚠️ Authentication required." };
    if (args.booking_id) { await db.from("bookings").delete().eq("id", args.booking_id).eq("user_id", userId); return { data: {}, reply: "✅ Cancelled." }; }
    if (args.resource) {
      const { data: f } = await db.from("bookings").select("id").eq("user_id", userId).ilike("resource", `%${args.resource}%`).limit(1).maybeSingle();
      if (f) { await db.from("bookings").delete().eq("id", f.id); return { data: {}, reply: `✅ Cancelled booking for ${args.resource}.` }; }
    }
    return { data: {}, reply: "⚠️ No matching booking." };
  }
  if (fnName === "send_message") {
    if (!userId) return { data: {}, reply: "⚠️ Authentication required." };
    const profile = await findUserByName(String(args.to_name || ""));
    if (!profile) return { data: {}, reply: `⚠️ User "${args.to_name}" not found.` };
    const ids = [userId, profile.user_id].sort();
    const channel = `dm-${ids[0].slice(0, 8)}-${ids[1].slice(0, 8)}`;
    const { data: sp } = await db.from("profiles").select("display_name").eq("user_id", userId).maybeSingle();
    await db.from("chat_messages").insert({ user_id: userId, channel, content: String(args.message), username: sp?.display_name || "Hyper" });
    return { data: { to: profile.display_name }, reply: `✅ Message sent to ${profile.display_name}.` };
  }
  if (fnName === "list_conversations") {
    if (!userId) return { data: {}, reply: "⚠️ Authentication required." };
    const { data: msgs } = await db.from("chat_messages").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
    if (!msgs?.length) return { data: {}, reply: "💬 No conversations." };
    const channels = new Map<string, any>();
    for (const m of msgs) if (!channels.has(m.channel)) channels.set(m.channel, m);
    const lines = Array.from(channels.values()).map((m: any) => `• ${m.channel}: "${m.content.substring(0, 50)}" (${m.username})`);
    return { data: {}, reply: `💬 **Conversations**\n${lines.join('\n')}` };
  }
  if (fnName === "control_audio") {
    return { data: { action: args.action, track_name: args.track_name, volume: args.volume }, reply: `🎵 Audio: ${args.action}`, clientSide: true };
  }
  return { data: {}, reply: "Unknown tool." };
}

function executeClientSideTool(fnName: string, args: Record<string, unknown>) {
  if (fnName === "draw_on_canvas") {
    let commands; try { commands = JSON.parse(String(args.commands || "[]")); } catch { commands = []; }
    return { data: { commands, clear_first: args.clear_first || false }, reply: `🎨 Drawing ${commands.length} elements on canvas.`, clientSide: true };
  }
  if (fnName === "generate_canvas_art") {
    return { data: { style: args.style, palette: args.palette || "prime" }, reply: `🎨 Generating ${args.style} art.`, clientSide: true };
  }
  if (fnName === "create_spreadsheet") {
    let headers, rows;
    try { headers = JSON.parse(String(args.headers || "[]")); } catch { headers = []; }
    try { rows = JSON.parse(String(args.rows || "[]")); } catch { rows = []; }
    return { data: { name: args.name, headers, rows }, reply: `📊 Created "${args.name}" with ${headers.length} columns.`, clientSide: true };
  }
  if (fnName === "update_cells") {
    let cells; try { cells = JSON.parse(String(args.cells || "{}")); } catch { cells = {}; }
    return { data: { sheet: args.sheet, cells }, reply: `📊 Updated ${Object.keys(cells).length} cells.`, clientSide: true };
  }
  if (fnName === "add_chart") {
    return { data: { sheet: args.sheet, range: args.range, chart_type: args.chart_type, title: args.title || "Chart" }, reply: `📊 Added ${args.chart_type} chart.`, clientSide: true };
  }
  return { data: {}, reply: "Unknown tool." };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`;
    const { messages, context, searchToggles } = await req.json();
    // LOVABLE_API_KEY is still needed as fallback (handled by ai-router)

    // Extract user ID for memory/context features
    const userId = await getUserId(authHeader);

    // Load memories, prior history, and recent activity for authenticated users
    let memories: string[] = [];
    let priorHistory: Array<{ role: string; content: string }> = [];
    let userActivity: Array<{ action: string; target: string; created_at: string }> = [];
    if (userId) {
      const db = getServiceDb();
      [memories, priorHistory, userActivity] = await Promise.all([
        loadMemories(userId),
        loadConversationHistory(userId),
        db.from("user_activity")
          .select("action, target, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20)
          .then(({ data }) => (data || []) as Array<{ action: string; target: string; created_at: string }>),
      ]);
    }

    const systemPrompt = buildSystemPrompt(context, memories, priorHistory, userActivity);

    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Phase 1: Non-streaming call with tools
    // For Grok 4.20 models, inject xAI built-in tools based on client toggles
    const phase1Tools = [...TOOLS];
    if (userId) {
      try {
        const { data: prefData } = await db.from("user_data").select("value").eq("user_id", userId).eq("key", "ai-provider").maybeSingle();
        if (prefData?.value) {
          const pref = typeof prefData.value === "string" ? JSON.parse(prefData.value) : prefData.value;
          if (pref.provider === "xai" && pref.model?.startsWith("grok-4.20")) {
            // Respect client-side toggles (default to enabled)
            const webOn = searchToggles?.web_search !== false;
            const xOn = searchToggles?.x_search !== false;
            if (webOn) phase1Tools.push({ type: "web_search" } as any);
            if (xOn) phase1Tools.push({ type: "x_search" } as any);
          }
        }
      } catch { /* ignore */ }
    }

    const phase1Resp = await routeAICall({
      userId,
      messages: fullMessages,
      tools: phase1Tools,
      stream: false,
    });

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

    // If tool call detected
    if (toolCalls && toolCalls.length > 0) {
      const tc = toolCalls[0];
      const fnName = tc.function.name;
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        args = {};
      }

      // Memory tools — execute server-side
      if (MEMORY_TOOLS.has(fnName)) {
        if (fnName === "save_memory" && userId) {
          await saveMemory(userId, String(args.category || "fact"), String(args.content || ""));
          // Save the user's last message to conversation history too
          const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
          if (lastUserMsg) await saveConversationMessage(userId, "user", lastUserMsg.content);
          
          // Re-run without tools to get a natural response after saving
          const phase2Resp = await routeAICall({
            userId,
            messages: fullMessages,
            stream: true,
          });
          if (!phase2Resp.ok) {
            return new Response(JSON.stringify({ error: "AI gateway error" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          // Save assistant response asynchronously (best effort)
          return new Response(phase2Resp.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }

        if (fnName === "recall_memories" && userId) {
          const recalled = await recallMemories(userId, String(args.query || ""));
          // Feed recalled memories back to the model
          const recallMessages = [
            ...fullMessages,
            { role: "assistant", content: null, tool_calls: [tc] },
            { role: "tool", tool_call_id: tc.id, content: recalled.length > 0 ? `Found memories:\n${recalled.join('\n')}` : "No matching memories found." },
          ];
          const recallResp = await routeAICall({
            userId,
            messages: recallMessages,
            stream: true,
          });
          if (!recallResp.ok) {
            return new Response(JSON.stringify({ error: "AI gateway error" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          return new Response(recallResp.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }

        // Fallback for unauthenticated memory calls
        return new Response(
          JSON.stringify({ type: "tool_call", tool: fnName, data: {}, reply: "⚠️ Memory features require authentication." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Financial tools — execute server-side
      if (FINANCIAL_TOOLS.has(fnName)) {
        const result = await executeFinancialTool(fnName, args, authHeader, userId);
        // Save conversation for authenticated users
        if (userId) {
          const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
          if (lastUserMsg) saveConversationMessage(userId, "user", lastUserMsg.content).catch(() => {});
          saveConversationMessage(userId, "assistant", result.reply).catch(() => {});
        }
        return new Response(
          JSON.stringify({ type: "tool_call", tool: fnName, data: result.data, reply: result.reply }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extended tools (market, portfolio, booking, messaging, audio) — execute server-side
      if (EXTENDED_TOOLS.has(fnName)) {
        const result = await executeExtendedTool(fnName, args, authHeader, userId);
        if (userId) {
          const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
          if (lastUserMsg) saveConversationMessage(userId, "user", lastUserMsg.content).catch(() => {});
          saveConversationMessage(userId, "assistant", result.reply).catch(() => {});
        }
        return new Response(
          JSON.stringify({ type: "tool_call", tool: fnName, data: result.data, reply: result.reply, clientSide: (result as any).clientSide }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Client-side tools (canvas, spreadsheet) — return for frontend
      if (CLIENT_SIDE_TOOLS.has(fnName)) {
        const result = executeClientSideTool(fnName, args);
        if (userId) {
          const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
          if (lastUserMsg) saveConversationMessage(userId, "user", lastUserMsg.content).catch(() => {});
          saveConversationMessage(userId, "assistant", result.reply).catch(() => {});
        }
        return new Response(
          JSON.stringify({ type: "tool_call", tool: fnName, data: result.data, reply: result.reply, clientSide: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Imagine tools — proxy to grok-imagine edge function
      if (IMAGINE_TOOLS.has(fnName)) {
        const imagineBody: any = { prompt: args.prompt };
        if (fnName === "generate_video") {
          imagineBody.type = "video";
          if (args.duration) imagineBody.duration = args.duration;
          if (args.image_url) imagineBody.image_url = args.image_url;
        } else {
          imagineBody.type = "image";
          if (args.n) imagineBody.n = args.n;
        }
        try {
          const imagineResp = await fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/grok-imagine`, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
              apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
            },
            body: JSON.stringify(imagineBody),
          });
          const imagineData = await imagineResp.json();
          if (!imagineResp.ok) {
            const reply = `⚠️ ${imagineData.error || "Image generation failed"}`;
            return new Response(
              JSON.stringify({ type: "tool_call", tool: fnName, data: {}, reply }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          let reply: string;
          if (imagineData.type === "video") {
            reply = `🎬 Video generated! Here's your clip:\n\n[VIDEO:${imagineData.url}]`;
          } else {
            const urls = imagineData.urls || [];
            reply = `🖼️ Generated ${urls.length} image(s):\n\n${urls.map((u: string, i: number) => `[IMAGE:${u}]`).join('\n')}`;
          }
          if (userId) {
            const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
            if (lastUserMsg) saveConversationMessage(userId, "user", lastUserMsg.content).catch(() => {});
            saveConversationMessage(userId, "assistant", reply).catch(() => {});
          }
          return new Response(
            JSON.stringify({ type: "tool_call", tool: fnName, data: imagineData, reply }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (e) {
          return new Response(
            JSON.stringify({ type: "tool_call", tool: fnName, data: {}, reply: `⚠️ Imagine error: ${e}` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Social/Mail tools — return data for frontend
      let reply = "";
      let data: Record<string, unknown> = {};

      if (fnName === "post_to_social") {
        data = {
          content: args.content || "",
          author: args.author || "Hyper",
          role: args.role || "Geometric AI",
        };
        const preview = String(data.content).length > 80 ? String(data.content).substring(0, 80) + "…" : data.content;
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

      // Save conversation for authenticated users
      if (userId) {
        const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
        if (lastUserMsg) saveConversationMessage(userId, "user", lastUserMsg.content).catch(() => {});
        saveConversationMessage(userId, "assistant", reply).catch(() => {});
      }

      return new Response(
        JSON.stringify({ type: "tool_call", tool: fnName, data, reply }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Phase 2: Re-call with streaming (no tools)
    // Save user message for authenticated users
    if (userId) {
      const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
      if (lastUserMsg) saveConversationMessage(userId, "user", lastUserMsg.content).catch(() => {});
    }

    const phase2Resp = await routeAICall({
      userId,
      messages: fullMessages,
      stream: true,
    });

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

import { eventBus } from '@/hooks/useEventBus';

const OPEN_REGEX = /\[ACTION:open-app:([a-z]+)\]/gi;
const CLOSE_REGEX = /\[ACTION:close-app:([a-z]+)\]/gi;
const NAV_REGEX = /\[ACTION:navigate:([a-z]+):([^\]]+)\]/gi;
const ALL_ACTIONS_REGEX = /\[ACTION:(?:open-app|close-app|navigate):[^\]]+\]/gi;

/**
 * Scans text for action tags, emits EventBus events,
 * and returns cleaned text with tags stripped.
 *
 * Supported tags:
 *   [ACTION:open-app:APPID]
 *   [ACTION:close-app:APPID]
 *   [ACTION:navigate:APPID:context]
 */
/**
 * Scans text for action tags, emits EventBus events,
 * and returns text with tags replaced by chip placeholders (not stripped).
 */
export function parseAndExecuteActions(text: string): string {
  let match: RegExpExecArray | null;

  // Open apps
  const openRe = new RegExp(OPEN_REGEX.source, OPEN_REGEX.flags);
  while ((match = openRe.exec(text)) !== null) {
    const appId = match[1].toLowerCase();
    setTimeout(() => eventBus.emit('app.request-open', { app: appId }), 300);
  }

  // Close apps
  const closeRe = new RegExp(CLOSE_REGEX.source, CLOSE_REGEX.flags);
  while ((match = closeRe.exec(text)) !== null) {
    const appId = match[1].toLowerCase();
    setTimeout(() => eventBus.emit('app.request-close', { app: appId }), 300);
  }

  // Navigate (open app + send context/tab hint)
  const navRe = new RegExp(NAV_REGEX.source, NAV_REGEX.flags);
  while ((match = navRe.exec(text)) !== null) {
    const appId = match[1].toLowerCase();
    const context = match[2].trim();
    setTimeout(() => {
      eventBus.emit('app.request-open', { app: appId });
      setTimeout(() => eventBus.emit('app.navigate', { app: appId, context }), 400);
    }, 300);
  }

  // Replace action tags with chip placeholders instead of stripping
  let result = text
    .replace(/\[ACTION:open-app:([a-z]+)\]/gi, (_m, id) => `{{chip:open:${id.toLowerCase()}}}`)
    .replace(/\[ACTION:close-app:([a-z]+)\]/gi, (_m, id) => `{{chip:close:${id.toLowerCase()}}}`)
    .replace(/\[ACTION:navigate:([a-z]+):([^\]]+)\]/gi, (_m, id, ctx) => `{{chip:nav:${id.toLowerCase()}:${ctx.trim()}}}`)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return result;
}

/** Map of friendly display names → app IDs for smart detection */
const FRIENDLY_TO_ID: Record<string, string> = {
  'cloudhooks': 'cloudhooks', 'cloud hooks': 'cloudhooks',
  'terminal': 'terminal', 'files': 'files', 'settings': 'settings',
  'browser': 'browser', 'calendar': 'calendar', 'mail': 'mail',
  'docs': 'docs', 'editor': 'editor', 'audio': 'audio',
  'gallery': 'gallery', 'maps': 'maps', 'hypersphere': 'hyper',
  'security': 'security', 'monitor': 'monitor', 'system monitor': 'monitor',
  'social': 'social', 'board': 'board', 'canvas': 'canvas',
  'vault': 'vault', 'arcade': 'arcade', 'admin': 'admin',
  'admin console': 'admin', 'journal': 'journal', 'wallet': 'wallet',
  'mini apps': 'miniapps', 'miniapps': 'miniapps', 'appforge': 'forge',
  'app forge': 'forge', 'botlab': 'botlab', 'bot lab': 'botlab',
  'signals': 'signals', 'stream': 'stream', 'booking': 'booking',
  'iot': 'iot', 'robotics': 'robotics', 'github': 'github',
  'spreadsheet': 'spreadsheet', 'grid': 'spreadsheet',
  'comm': 'comm', 'primelink': 'link', 'prime link': 'link',
  'primenet': 'net', 'prime net': 'net', 'packages': 'pkg',
  'storage': 'storage', 'chat': 'chat', 'rokcat': 'chat',
};

// Build regex from friendly names, sorted longest-first to avoid partial matches
const FRIENDLY_PATTERN = new RegExp(
  '\\b(' + Object.keys(FRIENDLY_TO_ID)
    .sort((a, b) => b.length - a.length)
    .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|') + ')\\b',
  'gi'
);

/**
 * Detects app name mentions in plain text and wraps them with chip placeholders.
 * Call AFTER parseAndExecuteActions to avoid double-processing action tags.
 */
export function detectAppMentions(text: string): string {
  // Don't replace inside existing chip placeholders or code blocks
  return text.replace(FRIENDLY_PATTERN, (match) => {
    const id = FRIENDLY_TO_ID[match.toLowerCase()];
    if (!id) return match;
    return `{{chip:open:${id}}}`;
  });
}

/** Available app IDs for the system prompt */
export const AVAILABLE_APPS = [
  'terminal', 'files', 'settings', 'browser', 'chat', 'calendar',
  'mail', 'docs', 'editor', 'audio', 'gallery', 'maps', 'hyper',
  'security', 'monitor', 'social', 'board', 'canvas', 'vault',
  'arcade', 'admin', 'journal', 'wallet', 'miniapps', 'forge',
  'botlab', 'signals', 'stream', 'booking', 'iot', 'robotics',
  'github', 'spreadsheet', 'comm', 'link', 'net', 'pkg', 'storage',
  'cloudhooks',
] as const;

export const APP_ACTION_PROMPT = `
You can control the user's desktop by including action tags in your response. Tags are hidden from the user — write naturally around them.

OPEN an app: [ACTION:open-app:APPID]
CLOSE an app: [ACTION:close-app:APPID]
NAVIGATE to a specific view/tab inside an app: [ACTION:navigate:APPID:context]

Available app IDs: ${AVAILABLE_APPS.join(', ')}.

Navigation contexts (use with navigate):
- monitor: "cpu", "memory", "network", "processes"
- settings: "profile", "display", "ai", "audio", "lock", "widgets", "voice", "ambience", "about"
- mail: "inbox", "sent", "drafts"
- browser: any URL like "https://example.com" or internal like "prime://docs"
- vault: "holdings", "trade"
- wallet: "overview", "send", "exchange", "escrow", "history", "leaderboard", "shop"
- calendar: "month", "week", "today"
- social: "feed", "profile"
- board: "backlog", "in-progress", "done"
- security: "overview", "scan", "firewall", "audit"
- audio: "play", "pause", "next", "prev"
- docs: "edit", "new"
- github: "repos", "issues", "prs", "commits"
- iot: "alerts", "lab-a", "server-room", "energy-wing", "perimeter"
- journal: "new", "edit", "preview"
- booking: "new", "today"
- arcade: "minesweeper", "snake", "pong", "cascade", "tetris"
- signals: "signals", "analytics"
- comm: "calls", "messages", "contacts"
- link: "join", "chat", "leave"
- net: "pause", "resume", "stats"
- pkg: "all", "core", "network", "compute", "storage", "security", "forge"
- storage: "system", "user", "cache", "ml", "logs", "overview"

Examples:
- "open my terminal" → include [ACTION:open-app:terminal]
- "close the calendar" → include [ACTION:close-app:calendar]
- "check system health" → include [ACTION:navigate:monitor:cpu]
- "show me my emails" → include [ACTION:navigate:mail:inbox]
- "open vault and go to trading" → include [ACTION:navigate:vault:trade]
You can combine multiple actions in one response.
`;

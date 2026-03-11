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
      // Give the app a moment to mount, then send navigation context
      setTimeout(() => eventBus.emit('app.navigate', { app: appId, context }), 400);
    }, 300);
  }

  return text.replace(ALL_ACTIONS_REGEX, '').replace(/\n{3,}/g, '\n\n').trim();
}

/** Available app IDs for the system prompt */
export const AVAILABLE_APPS = [
  'terminal', 'files', 'settings', 'browser', 'chat', 'calendar',
  'mail', 'docs', 'editor', 'audio', 'gallery', 'maps', 'hyper',
  'security', 'monitor', 'social', 'board', 'canvas', 'vault',
  'arcade', 'admin', 'journal', 'wallet', 'miniapps', 'forge',
  'botlab', 'signals', 'stream', 'booking', 'iot', 'robotics',
  'github', 'spreadsheet',
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

Examples:
- "open my terminal" → include [ACTION:open-app:terminal]
- "close the calendar" → include [ACTION:close-app:calendar]
- "check system health" → include [ACTION:navigate:monitor:cpu]
- "show me my emails" → include [ACTION:navigate:mail:inbox]
- "open vault and go to trading" → include [ACTION:navigate:vault:trade]
You can combine multiple actions in one response.
`;

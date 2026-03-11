import { eventBus } from '@/hooks/useEventBus';

const ACTION_REGEX = /\[ACTION:open-app:([a-z]+)\]/gi;

/**
 * Scans text for [ACTION:open-app:XXX] tags, emits EventBus events,
 * and returns cleaned text with tags stripped.
 */
export function parseAndExecuteActions(text: string): string {
  let match: RegExpExecArray | null;
  const regex = new RegExp(ACTION_REGEX.source, ACTION_REGEX.flags);

  while ((match = regex.exec(text)) !== null) {
    const appId = match[1].toLowerCase();
    // Small delay so the message renders before the app opens
    setTimeout(() => {
      eventBus.emit('app.request-open', { app: appId });
    }, 300);
  }

  return text.replace(ACTION_REGEX, '').replace(/\n{3,}/g, '\n\n').trim();
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
You can open apps on the user's desktop by including action tags in your response. Format: [ACTION:open-app:APPID]
Available app IDs: ${AVAILABLE_APPS.join(', ')}.
Examples:
- User asks "open my terminal" → respond with a brief confirmation and include [ACTION:open-app:terminal]
- User asks "show me the calendar" → include [ACTION:open-app:calendar]
- User asks "check my emails" → include [ACTION:open-app:mail]
You can open multiple apps at once. The action tags will be hidden from the user — just write naturally around them.
`;

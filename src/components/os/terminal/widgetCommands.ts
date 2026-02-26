import { eventBus } from '@/hooks/useEventBus';
import { resolveWidgetId, ALL_WIDGET_KEYS, WIDGET_IDS } from '@/components/os/DesktopWidgets';

const ALL_DEFAULTS = {
  clock: true, stats: true, notes: true, network: true, forge: true, agentLog: true, rokcat: true,
};

export function processWidgetCommand(args: string): string[] {
  const parts = args.trim().split(/\s+/);
  const sub = parts[0]?.toLowerCase();

  if (!sub || sub === 'help') {
    return [
      'Widget commands:',
      '  widget list              — Show all widgets',
      '  widget toggle <name>     — Toggle a widget on/off',
      '  widget show <name>       — Enable a widget',
      '  widget hide <name>       — Disable a widget',
      '  widget move <name> <x> <y> — Move a widget',
      '  widget reset             — Reset all widgets to defaults',
      '  widget all on|off        — Enable/disable all widgets',
      '',
    ];
  }

  if (sub === 'list') {
    const lines: string[] = ['DESKTOP WIDGETS', '─────────────────────────────────────────'];
    try {
      const saved = localStorage.getItem('prime-os-widgets');
      const state = saved ? JSON.parse(saved) : ALL_DEFAULTS;
      const positions = state.positions || {};
      ALL_WIDGET_KEYS.forEach(id => {
        const name = Object.values(WIDGET_IDS).find(w => w.id === id)?.name || id;
        const on = state[id] !== false;
        const pos = positions[id] || { x: 0, y: 0 };
        lines.push(`  ${id.padEnd(12)} ${on ? 'ON ' : 'OFF'}  (${pos.x}, ${pos.y})  ${name}`);
      });
    } catch {
      lines.push('  Error reading widget state');
    }
    lines.push('');
    return lines;
  }

  if (sub === 'toggle' || sub === 'show' || sub === 'hide') {
    const name = parts.slice(1).join(' ');
    if (!name) return [`Usage: widget ${sub} <name>`, ''];
    const resolved = resolveWidgetId(name);
    if (!resolved) return [`widget: unknown widget "${name}". Use "widget list" to see available widgets.`, ''];
    const enabled = sub === 'show' ? true : sub === 'hide' ? false : undefined;
    eventBus.emit('widget.toggle', { id: resolved.id, enabled });
    const action = sub === 'show' ? 'enabled' : sub === 'hide' ? 'disabled' : 'toggled';
    return [`▸ Widget "${resolved.name}" ${action}`, ''];
  }

  if (sub === 'move') {
    const name = parts[1];
    const x = parseInt(parts[2]);
    const y = parseInt(parts[3]);
    if (!name || isNaN(x) || isNaN(y)) return ['Usage: widget move <name> <x> <y>', ''];
    const resolved = resolveWidgetId(name);
    if (!resolved) return [`widget: unknown widget "${name}".`, ''];
    eventBus.emit('widget.move', { id: resolved.id, x, y });
    return [`▸ Widget "${resolved.name}" moved to (${x}, ${y})`, ''];
  }

  if (sub === 'reset') {
    ALL_WIDGET_KEYS.forEach(id => eventBus.emit('widget.toggle', { id, enabled: true }));
    return ['▸ All widgets reset to defaults', ''];
  }

  if (sub === 'all') {
    const val = parts[1]?.toLowerCase();
    if (val !== 'on' && val !== 'off') return ['Usage: widget all on|off', ''];
    const enabled = val === 'on';
    ALL_WIDGET_KEYS.forEach(id => eventBus.emit('widget.toggle', { id, enabled }));
    return [`▸ All widgets ${enabled ? 'enabled' : 'disabled'}`, ''];
  }

  return [`widget: unknown subcommand "${sub}". Type "widget help" for usage.`, ''];
}

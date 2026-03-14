import { eventBus } from '@/hooks/useEventBus';

const FRIENDLY_NAMES: Record<string, string> = {
  terminal: 'Terminal', files: 'Files', settings: 'Settings', browser: 'Browser',
  chat: 'Chat', calendar: 'Calendar', mail: 'Mail', docs: 'Docs', editor: 'Editor',
  audio: 'Audio', gallery: 'Gallery', maps: 'Maps', hyper: 'Hypersphere',
  security: 'Security', monitor: 'Monitor', social: 'Social', board: 'Board',
  canvas: 'Canvas', vault: 'Vault', arcade: 'Arcade', admin: 'Admin',
  journal: 'Journal', wallet: 'Wallet', miniapps: 'Mini Apps', forge: 'AppForge',
  botlab: 'BotLab', signals: 'Signals', stream: 'Stream', booking: 'Booking',
  iot: 'IoT', robotics: 'Robotics', github: 'GitHub', spreadsheet: 'Grid',
  comm: 'Comm', link: 'PrimeLink', net: 'PrimeNet', pkg: 'Packages',
  storage: 'Storage', cloudhooks: 'CloudHooks',
};

export function getFriendlyName(appId: string): string {
  return FRIENDLY_NAMES[appId] || appId;
}

interface ActionChipProps {
  appId: string;
  action?: 'open' | 'close' | 'navigate';
  context?: string;
  variant?: 'rokcat' | 'terminal';
}

export default function ActionChip({ appId, action = 'open', context, variant = 'rokcat' }: ActionChipProps) {
  const label = getFriendlyName(appId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (action === 'close') {
      eventBus.emit('app.request-close', { app: appId });
    } else {
      eventBus.emit('app.request-open', { app: appId });
      if (context) {
        setTimeout(() => eventBus.emit('app.navigate', { app: appId, context }), 400);
      }
    }
  };

  if (variant === 'terminal') {
    return (
      <span
        onClick={handleClick}
        className="text-primary underline decoration-primary/40 cursor-pointer hover:decoration-primary transition-colors"
        title={`Open ${label}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      onClick={handleClick}
      className="inline-flex items-center gap-0.5 bg-primary/15 text-primary rounded-full px-2 py-0.5 text-[10px] font-mono cursor-pointer hover:bg-primary/30 transition-colors mx-0.5"
      title={action === 'close' ? `Close ${label}` : `Open ${label}`}
    >
      ⚡ {label}
    </span>
  );
}

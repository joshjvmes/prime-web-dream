interface WorkspaceSwitcherProps {
  activeWorkspace: number;
  windowCounts: number[];
  onSwitch: (ws: number) => void;
}

export default function WorkspaceSwitcher({ activeWorkspace, windowCounts, onSwitch }: WorkspaceSwitcherProps) {
  return (
    <div className="flex items-center gap-0.5 mr-3 pl-3 border-l border-border">
      {[1, 2, 3, 4].map(ws => (
        <button
          key={ws}
          onClick={() => onSwitch(ws)}
          title={`Workspace ${ws} (Ctrl+${ws})`}
          className={`relative w-5 h-5 rounded text-[8px] font-mono transition-all ${
            activeWorkspace === ws
              ? 'bg-primary/20 text-primary border border-primary/40'
              : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 border border-transparent'
          }`}
        >
          {ws}
          {(windowCounts[ws - 1] || 0) > 0 && (
            <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full text-[5px] flex items-center justify-center ${
              activeWorkspace === ws ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/40 text-background'
            }`}>
              {windowCounts[ws - 1]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

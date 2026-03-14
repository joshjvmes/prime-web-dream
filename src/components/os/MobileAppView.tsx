import { ArrowLeft, Home } from 'lucide-react';

interface MobileAppViewProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}

export default function MobileAppView({ title, onBack, children }: MobileAppViewProps) {
  return (
    <div className="fixed inset-0 z-[50] flex flex-col bg-background overflow-hidden" style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 h-11 bg-card/90 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 p-2 -ml-2 rounded text-primary active:bg-primary/10 transition-colors"
          aria-label="Back to launcher"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="font-display text-[10px] tracking-wider uppercase text-card-foreground truncate mx-2">{title}</span>
        <button
          onClick={onBack}
          className="p-2 -mr-2 rounded text-muted-foreground active:bg-muted transition-colors"
          aria-label="Home"
        >
          <Home size={16} />
        </button>
      </div>
      {/* App content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

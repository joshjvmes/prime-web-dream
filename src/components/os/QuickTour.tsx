import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal, Move, Maximize2, Globe, Server, Shield, MessageSquare,
  FileText, Image, LayoutList, Search, ChevronRight, ChevronLeft, X,
} from 'lucide-react';

interface QuickTourProps {
  onComplete: () => void;
  onOpenTerminal: () => void;
}

const steps = [
  {
    title: 'Welcome to PRIME OS',
    subtitle: 'Geometric Computing Environment',
    content: (
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
          <span className="font-display text-2xl font-bold text-primary">P</span>
        </div>
        <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-xs">
          PRIME OS is a lattice-based operating system built on prime coordinate geometry.
          Navigate quantum-inspired applications, manage data across folded dimensions,
          and explore the computational lattice.
        </p>
      </div>
    ),
  },
  {
    title: 'Desktop & Windows',
    subtitle: 'Manage Your Workspace',
    content: (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: <Move size={14} />, text: 'Drag title bars to move' },
            { icon: <Maximize2 size={14} />, text: 'Double-click to maximize' },
            { text: 'Drag edges to resize', icon: <span className="text-[10px]">↔</span> },
            { text: 'Snap to screen edges', icon: <span className="text-[10px]">⬅➡</span> },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/30 rounded px-2 py-1.5 border border-border/50">
              <span className="text-primary">{item.icon}</span>
              <span className="text-[10px] text-muted-foreground">{item.text}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/70 text-center">
          Right-click the desktop for quick actions. Use the taskbar to switch windows.
        </p>
      </div>
    ),
  },
  {
    title: 'Applications',
    subtitle: 'Your Lattice Toolkit',
    content: (
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { icon: <Terminal size={13} />, name: 'Terminal' },
          { icon: <Globe size={13} />, name: 'Browser' },
          { icon: <Server size={13} />, name: 'Data Center' },
          { icon: <Shield size={13} />, name: 'Security' },
          { icon: <MessageSquare size={13} />, name: 'Chat' },
          { icon: <FileText size={13} />, name: 'Editor' },
          { icon: <Image size={13} />, name: 'Gallery' },
          { icon: <LayoutList size={13} />, name: 'Board' },
        ].map(app => (
          <div key={app.name} className="flex items-center gap-2 px-2 py-1 rounded bg-muted/20 border border-border/30">
            <span className="text-primary">{app.icon}</span>
            <span className="text-[10px] text-muted-foreground">{app.name}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Global Search',
    subtitle: 'Find Anything Instantly',
    content: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-4 py-2.5 border border-border/50 w-full max-w-xs">
          <Search size={14} className="text-muted-foreground/50" />
          <span className="text-xs text-muted-foreground/50">Search apps, windows, actions...</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[9px] font-mono text-muted-foreground">Ctrl</kbd>
          <span className="text-[9px] text-muted-foreground">+</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[9px] font-mono text-muted-foreground">K</kbd>
        </div>
        <p className="text-[10px] text-muted-foreground/70 text-center">
          Open apps, switch windows, and run quick actions from anywhere.
        </p>
      </div>
    ),
  },
  {
    title: 'Get Started',
    subtitle: 'Your Lattice Awaits',
    content: null, // handled inline for the button
  },
];

export default function QuickTour({ onComplete, onOpenTerminal }: QuickTourProps) {
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);

  const handleSkip = () => {
    localStorage.setItem('prime-os-tour-completed', 'true');
    onComplete();
  };

  const handleFinish = () => {
    if (dontShow) localStorage.setItem('prime-os-tour-completed', 'true');
    onComplete();
    onOpenTerminal();
  };

  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-[380px] max-w-[90vw] rounded-lg border border-primary/30 bg-card shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
          <div>
            <h2 className="font-display text-xs tracking-[0.15em] uppercase text-primary">
              {current.title}
            </h2>
            <p className="font-mono text-[9px] text-muted-foreground mt-0.5">{current.subtitle}</p>
          </div>
          <button onClick={handleSkip} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" aria-label="Close tour">
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-5 min-h-[160px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {isLast ? (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    You're ready to explore the geometric lattice. Launch the terminal to begin.
                  </p>
                  <button
                    onClick={handleFinish}
                    className="flex items-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground font-display text-xs tracking-wider hover:bg-primary/90 transition-colors"
                  >
                    <Terminal size={14} />
                    Launch Terminal
                  </button>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dontShow}
                      onChange={e => setDontShow(e.target.checked)}
                      className="w-3 h-3 rounded border-border accent-primary"
                    />
                    <span className="text-[9px] text-muted-foreground">Don't show again</span>
                  </label>
                </div>
              ) : (
                current.content
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
          <button
            onClick={handleSkip}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors font-mono"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === step ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Previous step"
              >
                <ChevronLeft size={14} />
              </button>
            )}
            {!isLast && (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-mono hover:bg-primary/20 transition-colors"
              >
                Next <ChevronRight size={12} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

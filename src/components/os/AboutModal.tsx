import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';

interface AboutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AboutModal({ open, onOpenChange }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="bg-black/60 backdrop-blur-sm" />
      <DialogContent className="max-w-sm bg-card/95 backdrop-blur-md border-border p-0 gap-0">
        <div className="flex flex-col items-center py-8 px-6">
          <img src="/rocket-logic-silver.svg" alt="Rocket Logic Global" className="w-16 h-16 mb-4 opacity-80" />
          <h2 className="font-display text-sm tracking-[0.3em] text-primary glow-text">PRIME OS</h2>
          <p className="font-mono text-[10px] text-muted-foreground mt-1">Version 2.0.0 — Build T3-649</p>
          <p className="font-body text-xs text-muted-foreground/80 mt-3">Geometric Computing Interface</p>

          <div className="mt-6 w-full border-t border-border pt-4 space-y-1.5">
            {[
              ['Kernel', 'Qutrit Kernel (QK)'],
              ['Architecture', '11D Folded → 4D'],
              ['Lattice', 'P¹¹ Hyperprime'],
              ['Cores', '649 Geometric Cores'],
              ['COP Rating', '3.2 (Over-Unity)'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-[10px] font-mono">
                <span className="text-muted-foreground/60">{label}</span>
                <span className="text-muted-foreground">{value}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-[9px] text-muted-foreground/40 font-mono">
            Built by Rocket Logic Global
          </p>
          <p className="text-[8px] text-muted-foreground/30 font-mono mt-0.5">
            © PRIME Labs — All dimensions reserved
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

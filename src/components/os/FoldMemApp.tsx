import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MemoryBlock } from '@/types/os';

const GRID_SIZE = 64;

function makeInitialBlocks(): MemoryBlock[] {
  const blocks: MemoryBlock[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    blocks.push({
      id: `b${i}`,
      coord: `⟨${[2,3,5,7,11][i%5]},${i},...⟩`,
      size: 1,
      allocated: Math.random() > 0.6,
      label: Math.random() > 0.6 ? ['qk', 'pfs', 'gfo', 'net', 'usr'][Math.floor(Math.random()*5)] : undefined,
    });
  }
  return blocks;
}

export default function FoldMemApp() {
  const [blocks, setBlocks] = useState<MemoryBlock[]>(makeInitialBlocks);
  const [compacting, setCompacting] = useState(false);
  const [allocCount, setAllocCount] = useState(0);

  const allocate = useCallback(() => {
    setBlocks(prev => {
      const free = prev.findIndex(b => !b.allocated);
      if (free === -1) return prev;
      const next = [...prev];
      next[free] = { ...next[free], allocated: true, label: 'new' };
      return next;
    });
    setAllocCount(c => c + 1);
  }, []);

  const freeRandom = useCallback(() => {
    setBlocks(prev => {
      const allocated = prev.filter(b => b.allocated);
      if (!allocated.length) return prev;
      const target = allocated[Math.floor(Math.random() * allocated.length)];
      return prev.map(b => b.id === target.id ? { ...b, allocated: false, label: undefined } : b);
    });
  }, []);

  const compact = useCallback(() => {
    setCompacting(true);
    setTimeout(() => {
      setBlocks(prev => {
        const alloc = prev.filter(b => b.allocated);
        const free = prev.filter(b => !b.allocated);
        return [...alloc, ...free].map((b, i) => ({ ...b, id: `b${i}` }));
      });
      setCompacting(false);
    }, 800);
  }, []);

  const allocated = blocks.filter(b => b.allocated).length;
  const fragmentation = (() => {
    let frags = 0;
    for (let i = 1; i < blocks.length; i++) {
      if (blocks[i].allocated !== blocks[i-1].allocated) frags++;
    }
    return Math.round((frags / GRID_SIZE) * 100);
  })();

  return (
    <div className="h-full flex flex-col bg-background text-xs font-mono p-3 overflow-y-auto">
      <div className="font-display text-[10px] tracking-wider text-primary uppercase mb-2">
        FoldMem — 11D Memory Visualizer
      </div>

      {/* Grid */}
      <div className={`grid grid-cols-16 gap-px mb-3 transition-all ${compacting ? 'blur-[1px]' : ''}`}
        style={{ gridTemplateColumns: 'repeat(16, 1fr)' }}>
        {blocks.map((b, i) => (
          <motion.div
            key={b.id}
            layout
            className={`aspect-square rounded-[2px] border text-[5px] flex items-center justify-center cursor-pointer transition-colors ${
              b.allocated
                ? 'bg-primary/25 border-primary/30 text-primary'
                : 'bg-muted/20 border-border text-transparent hover:bg-muted/40'
            }`}
            onClick={() => {
              setBlocks(prev => prev.map(bl => bl.id === b.id
                ? { ...bl, allocated: !bl.allocated, label: bl.allocated ? undefined : 'usr' }
                : bl
              ));
            }}
            title={b.allocated ? `${b.label || '?'} @ ${b.coord}` : 'Free'}
          >
            {b.label?.[0]?.toUpperCase()}
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-3">
        <button onClick={allocate}
          className="px-3 py-1 bg-primary/20 border border-primary/40 text-primary rounded hover:bg-primary/30 font-display text-[10px] tracking-wider">
          ALLOC
        </button>
        <button onClick={freeRandom}
          className="px-3 py-1 bg-muted border border-border text-foreground rounded hover:bg-muted/80 font-display text-[10px] tracking-wider">
          FREE
        </button>
        <button onClick={compact} disabled={compacting}
          className="px-3 py-1 bg-prime-green/20 border border-prime-green/40 text-prime-green rounded hover:bg-prime-green/30 disabled:opacity-50 font-display text-[10px] tracking-wider">
          {compacting ? 'FOLDING...' : 'COMPACT'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox label="Alloc Time" value="388μs" />
        <StatBox label="Free Time" value="22μs" />
        <StatBox label="Used" value={`${allocated}/${GRID_SIZE} blocks`} />
        <StatBox label="Fragmentation" value={`${fragmentation}%`} accent={fragmentation > 20} />
        <StatBox label="Allocations" value={allocCount.toString()} />
        <StatBox label="vs malloc" value="12× faster" green />
      </div>
    </div>
  );
}

function StatBox({ label, value, accent, green }: { label: string; value: string; accent?: boolean; green?: boolean }) {
  return (
    <div className="p-2 bg-muted/30 border border-border rounded">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className={`text-[11px] font-display ${accent ? 'text-prime-amber' : green ? 'text-prime-green' : 'text-primary'}`}>{value}</div>
    </div>
  );
}

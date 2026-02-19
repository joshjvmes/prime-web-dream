import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BootSequenceProps {
  onComplete: () => void;
}

const bootLines = [
  { text: 'PRIME OS v1.0.0 — Geometric Computing Kernel', delay: 0 },
  { text: 'Initializing Qutrit Kernel (QK)...', delay: 300 },
  { text: '▸ Fibonacci Waltz Scheduler: ONLINE', delay: 600 },
  { text: '▸ Prime Memory Manager: FOLDING 11D → 4D', delay: 900 },
  { text: '▸ Geometric Flow Orchestrator: ACTIVE', delay: 1200 },
  { text: '▸ Prime File System (PFS): MOUNTED', delay: 1500 },
  { text: 'Loading T3-649 qutrit cores...  [649/649]', delay: 1800 },
  { text: 'PrimeNet geometric routing: CONNECTED', delay: 2100 },
  { text: 'Adinkra folding compression: 75% ratio', delay: 2300 },
  { text: '', delay: 2500 },
  { text: '▸ All systems nominal. Flow state achieved.', delay: 2600 },
  { text: '', delay: 2800 },
  { text: 'Welcome to PRIME OS — Computing Beyond Binary', delay: 2900 },
];

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    bootLines.forEach((line, i) => {
      setTimeout(() => setVisibleLines(i + 1), line.delay);
    });
    setTimeout(() => setDone(true), 3500);
    setTimeout(onComplete, 4200);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="w-full max-w-2xl px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-8 text-center"
            >
              <h1 className="font-display text-3xl font-bold tracking-widest text-primary glow-text">
                PRIME OS
              </h1>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Geometric Computing Kernel v1.0
              </p>
            </motion.div>
            <div className="font-mono text-xs leading-relaxed">
              {bootLines.slice(0, visibleLines).map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className={
                    line.text.startsWith('▸ All systems')
                      ? 'text-prime-green glow-text mt-1'
                      : line.text.startsWith('Welcome')
                      ? 'text-primary glow-text font-bold mt-1'
                      : line.text.startsWith('▸')
                      ? 'text-prime-cyan pl-2'
                      : 'text-muted-foreground'
                  }
                >
                  {line.text || '\u00A0'}
                </motion.div>
              ))}
              {visibleLines < bootLines.length && (
                <span className="inline-block w-2 h-4 bg-primary cursor-blink ml-0.5" />
              )}
            </div>
            <motion.div
              className="mt-6 h-0.5 bg-muted overflow-hidden rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="h-full bg-primary"
                initial={{ width: '0%' }}
                animate={{ width: `${(visibleLines / bootLines.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

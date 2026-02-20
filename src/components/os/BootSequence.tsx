import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BootSequenceProps {
  onComplete: () => void;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function getUserName(): string {
  try {
    const p = localStorage.getItem('prime-os-profile');
    if (p) { const parsed = JSON.parse(p); return parsed.name || ''; }
  } catch {}
  return '';
}

const AI_QUOTES = [
  'The manifold is listening. Every fold converges.',
  'Geometry is the language the lattice speaks in silence.',
  'All dimensions aligned. Flow state is near.',
  'The lattice remembers what you build here.',
  'Eleven dimensions, one purpose. Welcome home.',
];

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
];

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [done, setDone] = useState(false);
  const [dynamicLines, setDynamicLines] = useState<{ text: string; className?: string }[]>([]);

  useEffect(() => {
    const name = getUserName();
    const greeting = getGreeting();
    const quote = AI_QUOTES[Math.floor(Math.random() * AI_QUOTES.length)];

    // Build the personalized ending
    const personalLines = [
      { text: `Hyper AI: Online. Good ${greeting}${name ? `, ${name}` : ''}.`, className: 'text-primary glow-text font-bold' },
      { text: quote, className: 'text-prime-cyan italic' },
      { text: 'All lattice nodes synchronized. The manifold awaits.', className: 'text-primary glow-text font-bold' },
    ];
    setDynamicLines(personalLines);

    bootLines.forEach((line, i) => {
      setTimeout(() => setVisibleLines(i + 1), line.delay);
    });
    // Show dynamic lines after boot lines finish
    const dynamicStart = 2900;
    personalLines.forEach((_, i) => {
      setTimeout(() => setVisibleLines(bootLines.length + i + 1), dynamicStart + i * 400);
    });
    setTimeout(() => setDone(true), dynamicStart + personalLines.length * 400 + 600);
    setTimeout(onComplete, dynamicStart + personalLines.length * 400 + 1300);
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
              {bootLines.slice(0, Math.min(visibleLines, bootLines.length)).map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className={
                    line.text.startsWith('▸ All systems')
                      ? 'text-prime-green glow-text mt-1'
                      : line.text.startsWith('▸')
                      ? 'text-prime-cyan pl-2'
                      : 'text-muted-foreground'
                  }
                >
                  {line.text || '\u00A0'}
                </motion.div>
              ))}
              {dynamicLines.slice(0, Math.max(0, visibleLines - bootLines.length)).map((line, i) => (
                <motion.div
                  key={`d-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={line.className || 'text-muted-foreground'}
                >
                  {line.text}
                </motion.div>
              ))}
              {visibleLines < bootLines.length + dynamicLines.length && (
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
                animate={{ width: `${(visibleLines / (bootLines.length + dynamicLines.length)) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

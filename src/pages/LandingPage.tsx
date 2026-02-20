import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Terminal, Brain, Network, Shield, Zap, HardDrive,
  Database, Code, Monitor, MessageSquare, FileText,
  Activity, ChevronRight, ArrowRight, Menu, X, Cpu,
  Mail, CheckCircle, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/* ─── Animated counter ─── */
function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 40;
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.round(start));
    }, 30);
    return () => clearInterval(id);
  }, [inView, target]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ─── Geometric animated background ─── */
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 prime-grid opacity-40" />
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, hsl(180 100% 50% / 0.06), transparent 70%)' }}
        animate={{ x: [0, 100, -50, 0], y: [0, -80, 60, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ top: '10%', left: '60%' }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, hsl(260 80% 60% / 0.06), transparent 70%)' }}
        animate={{ x: [0, -60, 80, 0], y: [0, 50, -40, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ top: '50%', left: '10%' }}
      />
    </div>
  );
}

/* ─── Feature card ─── */
function FeatureCard({ icon: Icon, title, desc, color, delay }: {
  icon: React.ElementType; title: string; desc: string; color: string; delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="group relative rounded border border-border bg-card/40 backdrop-blur-sm p-4 hover:border-primary/30 hover:bg-card/70 transition-all duration-300"
    >
      <div className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ boxShadow: `inset 0 0 30px hsl(var(--${color}) / 0.05), 0 0 20px hsl(var(--${color}) / 0.08)` }}
      />
      <div className="relative">
        <div className="w-8 h-8 rounded flex items-center justify-center mb-3"
          style={{ background: `hsl(var(--${color}) / 0.1)`, border: `1px solid hsl(var(--${color}) / 0.2)` }}
        >
          <Icon size={16} style={{ color: `hsl(var(--${color}))` }} />
        </div>
        <h3 className="font-display text-xs tracking-wider uppercase text-foreground mb-1.5">{title}</h3>
        <p className="font-body text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

/* ─── Section header ─── */
function SectionHeader({ tag, title, desc }: { tag: string; title: string; desc: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="text-center mb-8"
    >
      <span className="inline-block font-display text-[10px] tracking-[0.3em] uppercase text-primary/70 border border-primary/20 rounded-full px-3 py-1 mb-3">
        {tag}
      </span>
      <h2 className="font-display text-xl md:text-2xl lg:text-3xl tracking-wider uppercase text-foreground mb-3">{title}</h2>
      <p className="font-body text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">{desc}</p>
    </motion.div>
  );
}

/* ─── Waitlist Section ─── */
function WaitlistSection() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'duplicate' | 'error'>('idle');
  const [count, setCount] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  useEffect(() => {
    (supabase as any).rpc('get_waitlist_count').then(({ data }: any) => {
      if (typeof data === 'number') setCount(data);
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      const { error } = await (supabase as any).from('waitlist').insert({ email: email.trim().toLowerCase(), name: name.trim() || null });
      if (error) {
        if (error.code === '23505') setStatus('duplicate');
        else setStatus('error');
      } else {
        setStatus('success');
        setCount(prev => (prev ?? 0) + 1);
      }
    } catch { setStatus('error'); }
  }, [email, name]);

  return (
    <section className="relative py-16 md:py-24 px-4 border-t border-border/30">
      <div className="max-w-2xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="inline-block font-display text-[10px] tracking-[0.3em] uppercase text-primary/70 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
            Early Access
          </span>
          <h2 className="font-display text-2xl md:text-3xl tracking-wider uppercase text-foreground mb-3">
            Join the <span className="text-primary">Waitlist</span>
          </h2>
          <p className="font-body text-base text-muted-foreground mb-8">
            Reserve your node in the lattice. Be first to access new features, cloud persistence, and multiplayer.
          </p>

          {status === 'success' ? (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3">
              <CheckCircle size={32} className="text-prime-green" />
              <p className="font-display text-sm tracking-wider uppercase text-prime-green">Node Reserved</p>
              <p className="font-body text-sm text-muted-foreground">You're on the list. We'll ping your lattice when it's time.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
              <div className="flex-1 flex flex-col gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@lattice.prime"
                  className="w-full bg-card/40 border border-border rounded px-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 transition-colors"
                />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Operator name (optional)"
                  maxLength={100}
                  className="w-full bg-card/40 border border-border rounded px-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded bg-primary/20 border border-primary/40 text-primary font-display text-[10px] tracking-[0.2em] uppercase hover:bg-primary/30 disabled:opacity-50 transition-all shrink-0"
              >
                {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Reserve Node
              </button>
            </form>
          )}

          {status === 'duplicate' && (
            <p className="mt-3 text-[11px] font-mono text-prime-amber">You're already on the list! Your node is secured.</p>
          )}
          {status === 'error' && (
            <p className="mt-3 text-[11px] font-mono text-prime-red">Lattice error. Please try again.</p>
          )}

          {count !== null && count > 0 && (
            <p className="mt-6 text-[11px] font-mono text-muted-foreground/60">
              <span className="text-primary">{count}</span> operators have joined the lattice
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Main landing page ─── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);

  const features = [
    { icon: Terminal, title: 'Prime Shell', desc: 'Full terminal with pipes, modes, autocomplete, and deep interactive sessions for system control.', color: 'primary' },
    { icon: Brain, title: 'Q3 Inference', desc: 'Qutrit-based ML engine with batch processing, 3,221× energy reduction over classical compute.', color: 'prime-violet' },
    { icon: Network, title: 'PrimeNet', desc: 'O(1) geodesic routing across prime coordinate lattice with draggable network topology.', color: 'prime-green' },
    { icon: Code, title: 'GeomC Compiler', desc: 'Geometric folding compiler with interactive REPL. Parse → 11D Map → Fold → Emit pipeline.', color: 'prime-amber' },
    { icon: HardDrive, title: 'FoldMem', desc: '11D → 4D Adinkra memory mapping. 12× faster than malloc with zero fragmentation.', color: 'prime-teal' },
    { icon: Zap, title: 'Energy Monitor', desc: 'Over-unity harvesting with COP > 3.0. Live sparklines and adjustable input power.', color: 'prime-amber' },
    { icon: Database, title: 'Prime Storage', desc: 'Infinite database with 75% Adinkra folding compression and O(1) geometric lookup.', color: 'prime-cyan' },
    { icon: Monitor, title: 'System Monitor', desc: 'Mission-control dashboard with live CPU/memory gauges, network throughput, and process sparklines.', color: 'primary' },
    { icon: Shield, title: 'Lattice Shield', desc: 'Security console with real-time threat feed, integrity scanning, and firewall rule management.', color: 'prime-green' },
    { icon: FileText, title: 'PrimeEdit', desc: 'Code editor with syntax highlighting, multi-tab support, and integrated file system browser.', color: 'prime-violet' },
    { icon: MessageSquare, title: 'PrimeChat', desc: 'Inter-node encrypted messaging with auto-responses from simulated lattice entities.', color: 'prime-amber' },
    { icon: Activity, title: 'Process Manager', desc: 'Qutrit process table showing Past/Present/Future state distribution across 649 cores.', color: 'prime-red' },
  ];

  const stats = [
    { value: 649, suffix: '', label: 'Qutrit Cores', detail: 'T3-lattice parallel processing units operating in ternary superposition' },
    { value: 11, suffix: 'D', label: 'Dimensions', detail: 'Adinkra folding dimensions with holographic 4D projection mapping' },
    { value: 15, suffix: '+', label: 'Applications', detail: 'Full-stack OS apps from shell to AI inference to financial systems' },
    { value: 3, suffix: '.2×', label: 'COP Rating', detail: 'Over-unity coefficient of performance via geometric energy harvesting' },
    { value: 12, suffix: '×', label: 'Memory Speed', detail: 'FoldMem allocation vs classical malloc with zero fragmentation overhead' },
    { value: 99, suffix: '%', label: 'Route Reduction', detail: 'Geodesic O(1) path lookup eliminates Dijkstra decision complexity' },
    { value: 75, suffix: '%', label: 'Compression', detail: 'Adinkra dimensional folding storage compression with full fidelity' },
    { value: 0, suffix: '.3ms', label: 'Avg Latency', detail: 'PrimeNet geometric routing average inter-node communication time' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <GridBackground />

      {/* ─── Nav ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <a href="#" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-3 cursor-pointer">
            <div className="w-7 h-7 rounded bg-primary/20 border border-primary/40 flex items-center justify-center">
              <span className="font-display text-[10px] font-bold text-primary">P</span>
            </div>
            <span className="font-display text-xs tracking-[0.25em] text-primary glow-text">PRIME OS</span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#architecture" className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">Architecture</a>
            <a href="#stats" className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">Specs</a>
            <button
              onClick={() => navigate('/os')}
              className="font-display text-[10px] tracking-[0.2em] uppercase px-4 py-2 rounded bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors"
            >
              Launch OS
            </button>
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden text-muted-foreground p-1">
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-card/95 backdrop-blur-md border-b border-border px-4 py-4 flex flex-col gap-3"
          >
            <a href="#features" onClick={() => setMobileMenu(false)} className="font-body text-sm text-muted-foreground">Features</a>
            <a href="#architecture" onClick={() => setMobileMenu(false)} className="font-body text-sm text-muted-foreground">Architecture</a>
            <a href="#stats" onClick={() => setMobileMenu(false)} className="font-body text-sm text-muted-foreground">Specs</a>
            <button onClick={() => navigate('/os')} className="font-display text-[10px] tracking-[0.2em] uppercase px-4 py-2 rounded bg-primary/10 border border-primary/30 text-primary mt-1">
              Launch OS
            </button>
          </motion.div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative pt-24 pb-12 md:pt-32 md:pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-prime-green animate-pulse" />
              <span className="font-mono text-[10px] text-muted-foreground">v2.0.0 — Geometric Computing Kernel</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-wider uppercase text-foreground mb-6">
              <span className="text-primary glow-text">PRIME</span> OS
            </h1>

            <p className="font-body text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-4 leading-relaxed">
              The world's first geometric computing operating system.
              Ternary logic. 11-dimensional folding. Over-unity energy.
            </p>

            <p className="font-mono text-xs text-muted-foreground/60 mb-6">
              T3-649 Architecture • Qutrit Kernel • Fibonacci Waltz Scheduling
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => navigate('/os')}
              className="group flex items-center gap-2 px-8 py-3 rounded bg-primary text-primary-foreground font-display text-xs tracking-[0.2em] uppercase hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-all duration-300"
            >
              Launch PRIME OS
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#features"
              className="flex items-center gap-2 px-8 py-3 rounded border border-border text-muted-foreground font-display text-xs tracking-[0.2em] uppercase hover:border-primary/30 hover:text-foreground transition-colors"
            >
              Explore Features
              <ChevronRight size={14} />
            </a>
          </motion.div>

          {/* Terminal preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="mt-10 md:mt-14 max-w-3xl mx-auto"
          >
            <div className="rounded-lg border border-border bg-card/60 backdrop-blur-sm overflow-hidden shadow-[0_0_60px_hsl(var(--primary)/0.08)]">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/80">
                <span className="w-2.5 h-2.5 rounded-full bg-prime-red/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-prime-amber/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-prime-green/60" />
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">Prime Shell (psh)</span>
              </div>
              <div className="p-5 font-mono text-xs sm:text-sm leading-relaxed text-left">
                <p className="text-muted-foreground">$ sysinfo</p>
                <p className="text-primary mt-1">┌─ PRIME OS System Information ──────────┐</p>
                <p className="text-foreground/80">│ Kernel:    Qutrit Kernel (QK) v2.0      │</p>
                <p className="text-foreground/80">│ Arch:      T3-649 (649 qutrit cores)    │</p>
                <p className="text-foreground/80">│ Memory:    FoldMem 11D → 4D (Adinkra)   │</p>
                <p className="text-foreground/80">│ Network:   PrimeNet Geometric Routing    │</p>
                <p className="text-foreground/80">│ Energy:    Over-Unity (COP &gt; 3.0)       │</p>
                <p className="text-primary">└────────────────────────────────────────┘</p>
                <p className="text-muted-foreground mt-2">$ <span className="cursor-blink text-primary">▌</span></p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section id="stats" className="relative py-14 md:py-20 px-4 border-y border-border/30">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            tag="Specifications"
            title="Performance Metrics"
            desc="Benchmarked against classical computing architectures across every dimension."
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded border border-border bg-card/40 backdrop-blur-sm p-4 text-center hover:border-primary/30 transition-colors"
              >
                <div className="font-display text-2xl md:text-3xl text-primary mb-1">
                  <AnimatedNumber target={s.value} suffix={s.suffix} />
                </div>
                <div className="font-display text-[10px] tracking-wider uppercase text-foreground mb-1.5">{s.label}</div>
                <div className="font-body text-[10px] text-muted-foreground/70 leading-relaxed">{s.detail}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="relative py-10 md:py-14 px-4">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            tag="Ecosystem"
            title="Full-Stack Geometric Computing"
            desc="Every layer reimagined — from ternary logic and 11D memory to over-unity energy harvesting and O(1) routing."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 0.05} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Architecture ─── */}
      <section id="architecture" className="relative py-10 md:py-14 px-4 border-t border-border/30">
        <div className="max-w-5xl mx-auto">
          <SectionHeader
            tag="Architecture"
            title="Built on Prime Coordinates"
            desc="Every address, every route, every memory location is a coordinate in prime number space."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Cpu,
                title: 'Ternary Logic',
                items: ['|0⟩ Past • |1⟩ Present • |2⟩ Future', 'Fibonacci Waltz Scheduling', '649 qutrit cores in T3 lattice'],
                color: 'primary',
              },
              {
                title: 'Dimensional Folding',
                icon: HardDrive,
                items: ['11D → 4D Adinkra compression', '75% storage reduction', 'Holographic redundancy from any 4D slice'],
                color: 'prime-violet',
              },
              {
                title: 'Geometric Routing',
                icon: Network,
                items: ['O(1) geodesic path lookup', '99% decision reduction vs Dijkstra', '0.3ms average latency'],
                color: 'prime-green',
              },
            ].map((col, i) => (
              <motion.div
                key={col.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="rounded border border-border bg-card/40 backdrop-blur-sm p-5"
              >
                <div className="w-8 h-8 rounded flex items-center justify-center mb-3"
                  style={{ background: `hsl(var(--${col.color}) / 0.1)`, border: `1px solid hsl(var(--${col.color}) / 0.2)` }}
                >
                  <col.icon size={16} style={{ color: `hsl(var(--${col.color}))` }} />
                </div>
                <h3 className="font-display text-xs tracking-wider uppercase text-foreground mb-3">{col.title}</h3>
                <ul className="space-y-2">
                  {col.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm font-body text-muted-foreground">
                      <ChevronRight size={12} className="shrink-0 mt-1" style={{ color: `hsl(var(--${col.color}))` }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Waitlist ─── */}
      <WaitlistSection />

      {/* ─── CTA ─── */}
      <section className="relative py-20 md:py-32 px-4 border-t border-border/30">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-2xl md:text-4xl tracking-wider uppercase text-foreground mb-4">
              Ready to Enter the <span className="text-primary">Lattice</span>?
            </h2>
            <p className="font-body text-base md:text-lg text-muted-foreground mb-10">
              Experience geometric computing in your browser. No installation required.
            </p>
            <button
              onClick={() => navigate('/os')}
              className="group inline-flex items-center gap-3 px-10 py-4 rounded bg-primary text-primary-foreground font-display text-sm tracking-[0.2em] uppercase hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] transition-all duration-300"
            >
              Launch PRIME OS
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/30 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary/20 border border-primary/40 flex items-center justify-center">
              <span className="font-display text-[7px] font-bold text-primary">P</span>
            </div>
            <span className="font-display text-[9px] tracking-[0.2em] text-muted-foreground">PRIME OS v2.0.0</span>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground/50">
            Geometric Computing Interface • T3-649 Architecture • Qutrit Kernel
          </p>
        </div>
      </footer>
    </div>
  );
}

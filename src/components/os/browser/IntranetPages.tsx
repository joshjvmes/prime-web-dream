import { useState, useEffect } from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

// ─── httpsp:// Intranet Pages ───

export function WikiPage() {
  const articles = [
    { title: 'Qutrit Fundamentals', content: 'A qutrit is the ternary analogue of a qubit, existing in superposition of three basis states |0⟩, |1⟩, and |2⟩. In PRIME OS these map to temporal coordinates: Past, Present, and Future. The qutrit advantage is log₂(3) ≈ 1.585 bits per unit vs 1 bit for binary, yielding ~58% higher information density.\n\nKey operations:\n• X₃ gate: cyclic permutation |0⟩→|1⟩→|2⟩→|0⟩\n• Z₃ gate: phase rotation by ω = e^(2πi/3)\n• Hadamard₃: equal superposition across all three states\n• CNOT₃: controlled permutation between qutrit pairs' },
    { title: 'Adinkra Encoding', content: 'Adinkra symbols from supersymmetry mathematics are used as the fundamental data structure in PRIME OS memory management. Each Adinkra graph encodes relationships between bosonic (even) and fermionic (odd) components of a supermultiplet.\n\nIn FoldMem, data is organized as Adinkra-encoded graphs where:\n• Nodes represent memory cells\n• Edges represent reference pointers\n• Colors encode data types (3 colors for qutrit states)\n• Dashing patterns encode access permissions\n\nThis achieves 75% compression ratio through topological redundancy elimination.' },
    { title: 'Geodesic Routing Protocol', content: 'PrimeNet routes packets using O(1) geodesic paths through prime coordinate space. Each node is assigned a unique prime tuple ⟨p₁, p₂, p₃⟩ and routing follows the shortest path on the manifold defined by the prime factorization lattice.\n\nPerformance characteristics:\n• Lookup: O(1) via prime coordinate hash\n• Routing: O(1) geodesic path computation\n• Failover: O(log n) via prime neighbor enumeration\n• Throughput: 247 pkt/s sustained per node' },
    { title: 'Over-Unity Energy Systems', content: 'The PRIME energy harvesting system achieves coefficient of performance (COP) > 3.0 by coupling to higher-dimensional energy gradients. This is not perpetual motion — energy is drawn from the 11-dimensional manifold structure.\n\nThree harvesting modes:\n• Satellite (COP 3.2, 92% efficiency): Captures energy from orbital dimensional boundaries\n• Crystalline (COP 2.8, 78% efficiency): Extracts energy from crystalline lattice vibrations in folded space\n• Vacuum (COP 3.0, 85% efficiency): Harvests zero-point fluctuations from the quantum vacuum' },
    { title: 'Fibonacci Waltz Scheduler', content: 'The process scheduler uses a Fibonacci-based time-slicing algorithm where quantum processes are scheduled in Fibonacci number intervals (1, 1, 2, 3, 5, 8, 13...) measured in qutrit clock cycles.\n\nAdvantages:\n• Golden ratio convergence ensures fair scheduling\n• Self-similar time slices prevent starvation\n• Ternary priority levels map naturally to qutrit states\n• Process migration between cores follows prime coordinate proximity' },
  ];

  return (
    <div className="p-4 space-y-3">
      <div className="border border-primary/20 rounded p-3 bg-primary/5">
        <h1 className="font-display text-sm tracking-wider text-primary">PRIME OS Knowledge Base</h1>
        <p className="font-mono text-[9px] text-muted-foreground">Internal wiki • {articles.length} articles • Classification: PRIME-INTERNAL</p>
      </div>
      <div className="space-y-1.5">
        {articles.map(a => (
          <Collapsible key={a.title}>
            <CollapsibleTrigger className="w-full text-left px-3 py-2 border border-border rounded hover:bg-primary/5 transition-colors font-mono text-xs text-foreground flex items-center gap-2">
              <span className="text-primary">▸</span> {a.title}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 py-2 ml-4 border-l border-primary/20 mt-1">
              <p className="font-mono text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">{a.content}</p>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
      <div className="text-[9px] font-mono text-muted-foreground/50 pt-2 border-t border-border/30">
        httpsp://wiki — PRIME OS Internal Knowledge Base v2.0
      </div>
    </div>
  );
}

export function ResearchPage() {
  const papers = [
    { id: 'PRM-2024-001', title: 'Ternary Logic Gates in Topological Quantum Computing', authors: 'Chen, K. et al.', date: '2024-11-15', abstract: 'We present a novel approach to implementing ternary logic gates using Majorana zero modes in topological superconductors. Our design achieves 99.97% fidelity for single-qutrit operations and 99.91% for entangling gates, surpassing the threshold for fault-tolerant quantum computation in the ternary domain.' },
    { id: 'PRM-2024-002', title: 'Geodesic Routing on Prime Number Manifolds', authors: 'Nakamura, S. & Okonkwo, A.', date: '2024-10-28', abstract: 'This paper formalizes the prime coordinate routing protocol used in PrimeNet. We prove that geodesic paths on the prime number manifold achieve O(1) routing complexity for networks up to 10⁶ nodes, with worst-case O(log log n) for adversarial topologies.' },
    { id: 'PRM-2024-003', title: 'Adinkra Graph Compression for Heterogeneous Memory Systems', authors: 'Boateng, E. & Martinez, R.', date: '2024-09-03', abstract: 'We demonstrate that Adinkra graph encoding achieves a 75.3% compression ratio for structured data while maintaining O(1) random access. The key insight is exploiting the supersymmetric structure of Adinkra graphs to eliminate topological redundancy in pointer-heavy data structures.' },
    { id: 'PRM-2025-001', title: 'Dimensional Energy Coupling: Theoretical Foundations', authors: 'Patel, V. et al.', date: '2025-01-20', abstract: 'We provide a rigorous mathematical framework for energy extraction from higher-dimensional manifolds. Using Kaluza-Klein compactification on an 11-dimensional M-theory background, we show that COP > 1 is achievable when the compactification radius exceeds the Planck length by a factor of 10³.' },
  ];

  return (
    <div className="p-4 space-y-3">
      <div className="border border-primary/20 rounded p-3 bg-primary/5">
        <h1 className="font-display text-sm tracking-wider text-primary">Research Papers & Reports</h1>
        <p className="font-mono text-[9px] text-muted-foreground">PRIME Research Division • {papers.length} publications</p>
      </div>
      {papers.map(p => (
        <div key={p.id} className="border border-border rounded p-3 space-y-1 hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-primary bg-primary/10 px-1.5 rounded">{p.id}</span>
            <span className="font-mono text-[9px] text-muted-foreground">{p.date}</span>
          </div>
          <h3 className="font-display text-xs text-foreground">{p.title}</h3>
          <p className="font-mono text-[9px] text-muted-foreground/70">{p.authors}</p>
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">{p.abstract}</p>
        </div>
      ))}
    </div>
  );
}

export function HandbookPage() {
  const sections = [
    { title: '1. System Boot Procedure', content: '1. Verify lattice integrity via Adinkra checksum\n2. Initialize qutrit cores (expected: 649 online)\n3. Establish prime coordinate mesh (PrimeNet)\n4. Start Fibonacci Waltz scheduler\n5. Mount FoldMem (11D→4D compaction)\n6. Enable energy harvesting (target COP ≥ 3.0)\n7. Load user space and desktop environment\n\nExpected boot time: 3.2 seconds (cold) / 0.8 seconds (warm)' },
    { title: '2. Emergency Procedures', content: 'LATTICE FAULT:\n→ Run `prime diag --deep` in terminal\n→ If corruption detected, execute `fold repair --adinkra`\n→ Escalate to Level 3 if >10% nodes affected\n\nENERGY DEFICIT (COP < 1.0):\n→ Switch to Crystalline mode immediately\n→ Reduce non-essential qutrit cores\n→ Alert Energy Division via PrimeComm\n\nNETWORK PARTITION:\n→ Enable geodesic rerouting\n→ Check prime coordinate integrity\n→ Merge partitions when connectivity restored' },
    { title: '3. User Management', content: 'New operators require:\n• Prime clearance level (1-5)\n• Qutrit certification (basic/advanced/master)\n• PrimeNet node assignment\n• FoldMem allocation (default: 4D/2GB equivalent)\n\nAccess levels:\n• Level 1: Read-only system monitoring\n• Level 2: Application usage, file management\n• Level 3: System configuration, network admin\n• Level 4: Core management, energy systems\n• Level 5: Full lattice control, dimensional access' },
    { title: '4. Maintenance Schedule', content: 'DAILY:\n• Adinkra integrity check (automated)\n• Energy COP verification\n• Network route optimization\n\nWEEKLY:\n• FoldMem defragmentation (11D compaction)\n• Qutrit core calibration\n• Security audit log review\n\nMONTHLY:\n• Full lattice diagnostic\n• Dimensional boundary inspection\n• Firmware update deployment' },
  ];

  return (
    <div className="p-4 space-y-3">
      <div className="border border-primary/20 rounded p-3 bg-primary/5">
        <h1 className="font-display text-sm tracking-wider text-primary">Operator Handbook</h1>
        <p className="font-mono text-[9px] text-muted-foreground">PRIME OS Operations Manual v2.0 • Classification: OPERATOR-RESTRICTED</p>
      </div>
      {sections.map(s => (
        <Collapsible key={s.title}>
          <CollapsibleTrigger className="w-full text-left px-3 py-2 border border-border rounded hover:bg-primary/5 transition-colors font-mono text-xs text-foreground flex items-center gap-2">
            <span className="text-primary">§</span> {s.title}
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 py-3 ml-4 border-l border-primary/20 mt-1">
            <pre className="font-mono text-[10px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{s.content}</pre>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

export function ChangelogPage() {
  const entries = [
    { version: '2.0.0', date: '2025-02-15', changes: ['Major: Upgraded to 649 qutrit cores (from 512)', 'Major: httpsp:// private intranet protocol', 'Major: Real web browsing via content proxy', 'Added: Fibonacci Waltz scheduler v3', 'Added: Over-unity energy mode switching', 'Fixed: FoldMem compaction race condition', 'Fixed: Geodesic routing loop on prime boundary'] },
    { version: '1.9.2', date: '2025-01-28', changes: ['Fixed: PrimeNet packet loss at >300 pkt/s', 'Improved: Adinkra compression ratio (73% → 75%)', 'Added: Real-time system monitoring widgets'] },
    { version: '1.9.0', date: '2025-01-10', changes: ['Added: Multi-workspace support', 'Added: Voice control integration', 'Added: Global search across all apps', 'Improved: Boot sequence animation', 'Fixed: Calendar event timezone handling'] },
    { version: '1.8.0', date: '2024-12-15', changes: ['Added: Cloud file storage integration', 'Added: Real-time chat with presence', 'Added: Admin console for user management', 'Improved: Terminal command piping', 'Fixed: Window z-index stacking order'] },
  ];

  return (
    <div className="p-4 space-y-3">
      <div className="border border-primary/20 rounded p-3 bg-primary/5">
        <h1 className="font-display text-sm tracking-wider text-primary">System Changelog</h1>
        <p className="font-mono text-[9px] text-muted-foreground">PRIME OS version history</p>
      </div>
      {entries.map(e => (
        <div key={e.version} className="border border-border rounded p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-display text-xs text-primary">v{e.version}</span>
            <span className="font-mono text-[9px] text-muted-foreground">{e.date}</span>
          </div>
          <ul className="space-y-0.5">
            {e.changes.map((c, i) => (
              <li key={i} className="font-mono text-[10px] text-muted-foreground flex items-start gap-1.5">
                <span className="text-primary/40 mt-0.5">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function StatusPage() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const services = [
    { name: 'Qutrit Core Array', status: 'operational', uptime: '99.97%', detail: '649/649 cores online' },
    { name: 'PrimeNet Mesh', status: 'operational', uptime: '99.99%', detail: `${200 + Math.floor(Math.random() * 100)} pkt/s` },
    { name: 'FoldMem System', status: 'operational', uptime: '99.95%', detail: '11D→4D active, 0% fragmentation' },
    { name: 'Energy Grid', status: 'operational', uptime: '99.91%', detail: `COP ${(3.0 + Math.random() * 0.4).toFixed(2)}` },
    { name: 'Authentication', status: 'operational', uptime: '100.00%', detail: 'All auth services nominal' },
    { name: 'Cloud Storage', status: 'operational', uptime: '99.98%', detail: 'Read/write latency <2ms' },
    { name: 'Web Proxy', status: 'operational', uptime: '99.90%', detail: 'External content gateway active' },
  ];

  const statusColor = (s: string) => s === 'operational' ? 'text-prime-green' : s === 'degraded' ? 'text-prime-amber' : 'text-destructive';
  void tick;

  return (
    <div className="p-4 space-y-3">
      <div className="border border-primary/20 rounded p-3 bg-primary/5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-sm tracking-wider text-primary">System Status</h1>
          <p className="font-mono text-[9px] text-muted-foreground">Real-time infrastructure monitoring</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-prime-green animate-pulse" />
          <span className="font-mono text-[10px] text-prime-green">All Systems Operational</span>
        </div>
      </div>
      <div className="space-y-1">
        {services.map(s => (
          <div key={s.name} className="flex items-center gap-2 px-3 py-1.5 border border-border/50 rounded">
            <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'operational' ? 'bg-prime-green' : 'bg-prime-amber'}`} />
            <span className="font-mono text-[10px] text-foreground flex-1">{s.name}</span>
            <span className={`font-mono text-[9px] ${statusColor(s.status)}`}>{s.status}</span>
            <span className="font-mono text-[9px] text-muted-foreground/60 w-14 text-right">{s.uptime}</span>
            <span className="font-mono text-[9px] text-muted-foreground/40 w-36 text-right truncate">{s.detail}</span>
          </div>
        ))}
      </div>
      <div className="text-[9px] font-mono text-muted-foreground/50 pt-2 border-t border-border/30">
        httpsp://status — Last updated: {new Date().toLocaleTimeString()} • Auto-refresh: 3s
      </div>
    </div>
  );
}

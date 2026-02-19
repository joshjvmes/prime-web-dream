export default function SysInfoApp() {
  return (
    <div className="h-full bg-background p-3 overflow-y-auto font-mono text-xs">
      <div className="font-display text-[10px] tracking-wider text-primary mb-4 uppercase">
        System Information
      </div>

      <div className="space-y-4">
        <Section title="Kernel">
          <Row label="Name" value="Qutrit Kernel (QK)" />
          <Row label="Version" value="1.0.0" />
          <Row label="Logic" value="Ternary (|0⟩, |1⟩, |2⟩)" />
          <Row label="Architecture" value="T3-649 (649 qutrit cores)" />
        </Section>

        <Section title="Memory">
          <Row label="Model" value="Folded (11D → 4D via Adinkra)" />
          <Row label="Virtual Space" value="11-dimensional prime lattice" />
          <Row label="Physical Space" value="4-dimensional projection" />
          <Row label="Compression" value="75% Adinkra folding ratio" />
          <Row label="GC" value="Geometric decay (V_lifetime)" />
        </Section>

        <Section title="Scheduler">
          <Row label="Type" value="Fibonacci Waltz Scheduler (FWS)" />
          <Row label="Formula" value="|ψ_next⟩ = 2·|ψ_curr⟩ − |ψ_prev⟩ (mod 3)" />
          <Row label="States" value="|0⟩ Past  |1⟩ Present  |2⟩ Future" />
        </Section>

        <Section title="File System">
          <Row label="Type" value="Prime File System (PFS)" />
          <Row label="Structure" value="Geometric manifold (no hierarchy)" />
          <Row label="Naming" value="Semantic prime coordinates" />
          <Row label="Lookup" value="O(1) geometric broadcast" />
          <Row label="Permissions" value="Geometric proximity" />
        </Section>

        <Section title="Network">
          <Row label="Protocol" value="PrimeNet geometric routing" />
          <Row label="Addressing" value="11D prime coordinates" />
          <Row label="Routing" value="Geodesic (greedy geometric)" />
          <Row label="Success" value="83% direct, >99% with Waltz recovery" />
        </Section>

        <Section title="Performance">
          <Row label="Array sum" value="O(1) — 50,000× speedup" />
          <Row label="Matrix multiply" value="O(1) — 120,000× speedup" />
          <Row label="Graph search" value="O(1) — 10,000,000× speedup" />
          <Row label="Energy" value="~1000× savings (no interrupt overhead)" />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-display tracking-wider text-prime-amber mb-1.5 uppercase border-b border-border pb-1">
        {title}
      </div>
      <div className="space-y-0.5 pl-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="text-muted-foreground w-28 shrink-0">{label}:</span>
      <span className="text-prime-cyan">{value}</span>
    </div>
  );
}

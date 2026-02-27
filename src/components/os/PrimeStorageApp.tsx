import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { StorageRegion } from '@/types/os';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Database } from 'lucide-react';

const REGIONS: StorageRegion[] = [
  { id: 'r1', name: 'System Manifold', coord: '⟨2,3,5,7,11,...⟩', compressed: true, sizeOriginal: '4.2 TB', sizeCompressed: '1.05 TB', adinkraEncoded: true },
  { id: 'r2', name: 'User Data Fold', coord: '⟨13,17,19,23,...⟩', compressed: true, sizeOriginal: '128 TB', sizeCompressed: '32 TB', adinkraEncoded: true },
  { id: 'r3', name: 'Network Cache', coord: '⟨29,31,37,41,...⟩', compressed: false, sizeOriginal: '512 GB', sizeCompressed: '512 GB', adinkraEncoded: false },
  { id: 'r4', name: 'ML Model Store', coord: '⟨43,47,53,59,...⟩', compressed: true, sizeOriginal: '2.1 TB', sizeCompressed: '525 GB', adinkraEncoded: true },
  { id: 'r5', name: 'Temporal Log', coord: '⟨61,67,71,73,...⟩', compressed: true, sizeOriginal: '89 TB', sizeCompressed: '22.3 TB', adinkraEncoded: true },
];

// Map real tables to storage regions for live stats
const REGION_TABLES: Record<string, string[]> = {
  r1: ['profiles', 'user_roles', 'wallets'],
  r2: ['user_data', 'user_emails', 'calendar_events', 'bookings'],
  r3: ['chat_messages', 'chat_presence', 'social_posts'],
  r4: ['ai_conversations', 'ai_memories', 'agent_tasks', 'bot_registry'],
  r5: ['user_activity', 'transactions', 'vault_holdings', 'vault_transactions'],
};

export default function PrimeStorageApp() {
  const [selected, setSelected] = useState<StorageRegion | null>(null);
  const [counter, setCounter] = useState({ ratio: 0, capacity: 0 });
  const [regionRows, setRegionRows] = useState<Record<string, number>>({});
  const [totalRows, setTotalRows] = useState(0);
  const [storageFiles, setStorageFiles] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Animated counters
  useEffect(() => {
    const t = setInterval(() => {
      setCounter(c => ({
        ratio: Math.min(c.ratio + 0.02, 0.75),
        capacity: Math.min(c.capacity + 0.5, 223.82),
      }));
    }, 50);
    return () => clearInterval(t);
  }, []);

  // Fetch real row counts from DB
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const counts: Record<string, number> = {};
      let total = 0;

      for (const [regionId, tables] of Object.entries(REGION_TABLES)) {
        let regionTotal = 0;
        for (const table of tables) {
          try {
            const { count } = await (supabase as any).from(table).select('*', { count: 'exact', head: true });
            regionTotal += count || 0;
          } catch {}
        }
        counts[regionId] = regionTotal;
        total += regionTotal;
      }

      // Check storage bucket file count
      try {
        const { data } = await supabase.from('file_metadata').select('id', { count: 'exact', head: true });
        // data is null for head requests but count is in the response
        const { count } = await supabase.from('file_metadata').select('*', { count: 'exact', head: true });
        setStorageFiles(count || 0);
      } catch {}

      setRegionRows(counts);
      setTotalRows(total);
      setLoading(false);
    };
    fetchStats();
  }, []);

  return (
    <div className="h-full flex flex-col bg-background text-xs font-mono p-3 overflow-y-auto">
      <div className="font-display text-[10px] tracking-wider text-primary uppercase mb-3 flex items-center gap-2">
        Prime Storage — Infinite Database
        {loading && <Loader2 size={10} className="animate-spin" />}
      </div>

      {/* Dimension folding visualization */}
      <div className="flex items-center justify-center gap-2 mb-3 p-3 border border-border rounded bg-muted/20">
        {[11, 9, 7, 5, 4].map((d, i) => (
          <div key={d} className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
              className={`w-8 h-8 rounded border flex items-center justify-center font-display text-[10px] ${
                i === 4 ? 'bg-prime-green/20 border-prime-green/40 text-prime-green' : 'bg-primary/10 border-primary/30 text-primary'
              }`}
            >
              {d}D
            </motion.div>
            {i < 4 && <span className="text-primary text-[10px]">→</span>}
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="p-2 bg-muted/30 border border-border rounded text-center">
          <div className="text-[9px] text-muted-foreground">Compression</div>
          <div className="text-sm font-display text-prime-green">{(counter.ratio * 100).toFixed(0)}%</div>
        </div>
        <div className="p-2 bg-muted/30 border border-border rounded text-center">
          <div className="text-[9px] text-muted-foreground">Capacity</div>
          <div className="text-sm font-display text-primary">{counter.capacity.toFixed(1)} TB</div>
        </div>
        <div className="p-2 bg-muted/30 border border-border rounded text-center">
          <div className="text-[9px] text-muted-foreground">Retrieval</div>
          <div className="text-sm font-display text-prime-cyan">O(1)</div>
        </div>
        <div className="p-2 bg-muted/30 border border-border rounded text-center">
          <div className="text-[9px] text-muted-foreground">Live Records</div>
          <div className="text-sm font-display text-prime-amber">{totalRows.toLocaleString()}</div>
        </div>
      </div>

      {/* Real stats banner */}
      {!loading && totalRows > 0 && (
        <div className="mb-3 p-2 border border-primary/30 rounded bg-primary/5 flex items-center gap-2">
          <Database size={12} className="text-primary" />
          <span className="text-[9px] text-primary">{totalRows} records across {Object.values(REGION_TABLES).flat().length} tables</span>
          {storageFiles > 0 && <span className="text-[9px] text-muted-foreground ml-auto">{storageFiles} files in storage</span>}
        </div>
      )}

      {/* Region browser */}
      <div className="text-[9px] text-muted-foreground mb-1 uppercase font-display tracking-wider">Storage Regions</div>
      <div className="flex-1 border border-border rounded overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 text-muted-foreground">
              <th className="text-left p-1.5">Region</th>
              <th className="text-left p-1.5">Original</th>
              <th className="text-left p-1.5">Folded</th>
              <th className="text-center p-1.5">Adinkra</th>
              <th className="text-right p-1.5">Live Rows</th>
            </tr>
          </thead>
          <tbody>
            {REGIONS.map(r => (
              <tr key={r.id}
                onClick={() => setSelected(r)}
                className={`cursor-pointer border-t border-border transition-colors ${
                  selected?.id === r.id ? 'bg-primary/10' : 'hover:bg-muted/30'
                }`}>
                <td className="p-1.5 text-foreground">{r.name}</td>
                <td className="p-1.5 text-muted-foreground">{r.sizeOriginal}</td>
                <td className="p-1.5 text-prime-cyan">{r.sizeCompressed}</td>
                <td className="p-1.5 text-center">
                  {r.adinkraEncoded
                    ? <span className="text-prime-green">◈</span>
                    : <span className="text-muted-foreground">○</span>
                  }
                </td>
                <td className="p-1.5 text-right text-primary font-display">
                  {regionRows[r.id] !== undefined ? regionRows[r.id].toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mt-2 p-2 bg-muted/30 border border-border rounded space-y-1">
          <div className="flex"><span className="text-muted-foreground w-16">Coord:</span><span className="text-prime-cyan">{selected.coord}</span></div>
          <div className="flex"><span className="text-muted-foreground w-16">Status:</span><span className="text-prime-green">{selected.compressed ? 'Folded' : 'Unfolded'}</span></div>
          {REGION_TABLES[selected.id] && (
            <div className="flex"><span className="text-muted-foreground w-16">Tables:</span><span className="text-primary text-[9px]">{REGION_TABLES[selected.id].join(', ')}</span></div>
          )}
        </motion.div>
      )}
    </div>
  );
}

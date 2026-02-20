import { useState, useCallback } from 'react';
import { Search, Download, RefreshCw, Trash2, Package } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Pkg {
  name: string;
  version: string;
  size: string;
  category: string;
  status: 'installed' | 'update' | 'available';
}

const INITIAL_PKGS: Pkg[] = [
  { name: 'qk-kernel', version: '2.0.0', size: '12.4 MB', category: 'Core', status: 'installed' },
  { name: 'fibonacci-waltz', version: '1.3.1', size: '2.1 MB', category: 'Core', status: 'installed' },
  { name: 'primenet-router', version: '3.0.2', size: '8.7 MB', category: 'Network', status: 'update' },
  { name: 'geodesic-dns', version: '1.1.0', size: '3.2 MB', category: 'Network', status: 'installed' },
  { name: 'q3-inference', version: '1.0.0', size: '45.8 MB', category: 'Compute', status: 'installed' },
  { name: 'geomc-compiler', version: '1.2.0', size: '18.3 MB', category: 'Compute', status: 'update' },
  { name: 'foldmem-allocator', version: '2.0.0', size: '5.6 MB', category: 'Storage', status: 'installed' },
  { name: 'adinkra-codec', version: '1.4.0', size: '7.9 MB', category: 'Storage', status: 'installed' },
  { name: 'lattice-shield', version: '1.1.0', size: '9.1 MB', category: 'Security', status: 'installed' },
  { name: 'qutrit-crypt', version: '0.9.0', size: '4.3 MB', category: 'Security', status: 'available' },
  { name: 'prime-fs', version: '2.1.0', size: '6.2 MB', category: 'Core', status: 'installed' },
  { name: 'energy-harvester', version: '1.5.1', size: '3.8 MB', category: 'Core', status: 'update' },
  { name: 'hypersphere-ai', version: '0.8.0', size: '52.1 MB', category: 'Compute', status: 'available' },
  { name: 'cloud-hooks-sdk', version: '1.0.0', size: '2.4 MB', category: 'Network', status: 'available' },
];

const CATEGORIES = ['All', 'Core', 'Network', 'Compute', 'Storage', 'Security'];

export default function PrimePkgApp() {
  const [pkgs, setPkgs] = useState(INITIAL_PKGS);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [log, setLog] = useState<string[]>(['[init] Package manager ready.', `[sync] ${INITIAL_PKGS.length} packages indexed.`]);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${msg}`].slice(-20));
  }, []);

  const install = useCallback((name: string) => {
    setPkgs(prev => prev.map(p => p.name === name ? { ...p, status: 'installed' as const } : p));
    addLog(`Installing ${name}...`);
    setTimeout(() => addLog(`${name} installed successfully.`), 500);
  }, [addLog]);

  const update = useCallback((name: string) => {
    setPkgs(prev => prev.map(p => p.name === name ? { ...p, status: 'installed' as const, version: p.version.replace(/\d+$/, m => String(Number(m) + 1)) } : p));
    addLog(`Updating ${name}...`);
    setTimeout(() => addLog(`${name} updated.`), 500);
  }, [addLog]);

  const remove = useCallback((name: string) => {
    setPkgs(prev => prev.map(p => p.name === name ? { ...p, status: 'available' as const } : p));
    addLog(`Removed ${name}.`);
  }, [addLog]);

  const filtered = pkgs.filter(p => {
    if (category !== 'All' && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const installed = pkgs.filter(p => p.status !== 'available').length;
  const totalSize = pkgs.filter(p => p.status !== 'available').reduce((a, p) => a + parseFloat(p.size), 0).toFixed(1);

  return (
    <div className="flex flex-col h-full bg-background font-mono text-xs">
      {/* Toolbar */}
      <div className="h-8 border-b border-border flex items-center px-3 gap-2">
        <Package size={12} className="text-primary" />
        <div className="flex items-center gap-1 border border-border rounded px-1.5 py-0.5 flex-1 max-w-xs">
          <Search size={10} className="text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search packages..." className="bg-transparent text-[10px] flex-1 outline-none placeholder:text-muted-foreground/50" />
        </div>
        <div className="flex items-center gap-0.5 ml-2">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} className={`text-[8px] px-1.5 py-0.5 rounded ${category === c ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Package list */}
      <ScrollArea className="flex-1">
        <table className="w-full">
          <thead>
            <tr className="text-[9px] text-muted-foreground border-b border-border">
              <th className="text-left px-3 py-1 font-normal">Package</th>
              <th className="text-left px-2 py-1 font-normal">Version</th>
              <th className="text-left px-2 py-1 font-normal">Size</th>
              <th className="text-left px-2 py-1 font-normal">Category</th>
              <th className="text-left px-2 py-1 font-normal">Status</th>
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.name} className="border-b border-border/30 hover:bg-muted/20">
                <td className="px-3 py-1.5 text-[10px] text-foreground">{p.name}</td>
                <td className="px-2 py-1.5 text-[10px] text-muted-foreground">{p.version}</td>
                <td className="px-2 py-1.5 text-[10px] text-muted-foreground">{p.size}</td>
                <td className="px-2 py-1.5 text-[10px] text-muted-foreground">{p.category}</td>
                <td className="px-2 py-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${p.status === 'installed' ? 'bg-primary/10 text-primary' : p.status === 'update' ? 'bg-amber-500/10 text-amber-400' : 'text-muted-foreground/60'}`}>
                    {p.status === 'update' ? 'update avail' : p.status}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex gap-1">
                    {p.status === 'available' && <button onClick={() => install(p.name)} className="p-0.5 rounded hover:bg-primary/10 text-primary"><Download size={12} /></button>}
                    {p.status === 'update' && <button onClick={() => update(p.name)} className="p-0.5 rounded hover:bg-amber-500/10 text-amber-400"><RefreshCw size={12} /></button>}
                    {p.status !== 'available' && <button onClick={() => remove(p.name)} className="p-0.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 size={12} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      {/* Activity log */}
      <div className="h-20 border-t border-border flex flex-col">
        <div className="px-3 py-1 text-[8px] text-muted-foreground/60 border-b border-border/50">Activity Log</div>
        <ScrollArea className="flex-1 px-3 py-1">
          {log.map((l, i) => (
            <div key={i} className="text-[9px] text-muted-foreground leading-relaxed">{l}</div>
          ))}
        </ScrollArea>
      </div>

      {/* Summary */}
      <div className="h-5 border-t border-border flex items-center px-3 text-[9px] text-muted-foreground/60 gap-4">
        <span>Packages: {installed}/{pkgs.length}</span>
        <span>Disk: {totalSize} MB</span>
        <span className="ml-auto">Last sync: just now</span>
      </div>
    </div>
  );
}

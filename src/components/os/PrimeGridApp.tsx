import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCloudStorage } from '@/hooks/useCloudStorage';
import { Download, Upload, Plus, Trash2, Save, FileSpreadsheet } from 'lucide-react';

// --- Grid config ---
const COLS = 26;
const ROWS = 100;
const COL_LABELS = Array.from({ length: COLS }, (_, i) => String.fromCharCode(65 + i));

// --- Math helpers ---
function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}
function nthPrime(n: number): number {
  let count = 0, num = 1;
  while (count < n) { num++; if (isPrime(num)) count++; }
  return num;
}
function primeFactors(n: number): string {
  if (n < 2) return String(n);
  const factors: string[] = [];
  let d = 2, num = Math.abs(Math.floor(n));
  while (d * d <= num) { let exp = 0; while (num % d === 0) { num /= d; exp++; } if (exp > 0) factors.push(exp > 1 ? `${d}^${exp}` : `${d}`); d++; }
  if (num > 1) factors.push(`${num}`);
  return factors.join(' × ') || String(n);
}

// --- Cell utilities ---
type CellKey = string;
function cellKey(col: number, row: number): CellKey { return `${COL_LABELS[col]}${row + 1}`; }
function parseRef(ref: string): [number, number] | null {
  const m = ref.match(/^([A-Z])(\d+)$/i);
  if (!m) return null;
  const c = m[1].toUpperCase().charCodeAt(0) - 65;
  const r = parseInt(m[2]) - 1;
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
  return [c, r];
}
function parseRange(range: string): CellKey[] {
  const [start, end] = range.split(':');
  const s = parseRef(start), e = parseRef(end);
  if (!s || !e) return [];
  const keys: CellKey[] = [];
  for (let c = Math.min(s[0], e[0]); c <= Math.max(s[0], e[0]); c++)
    for (let r = Math.min(s[1], e[1]); r <= Math.max(s[1], e[1]); r++)
      keys.push(cellKey(c, r));
  return keys;
}

// --- CSV helpers ---
function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuote = false;
      else cell += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) { row.push(cell); cell = ''; rows.push(row); row = []; if (ch === '\r') i++; }
      else cell += ch;
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
function toCSV(cells: Record<CellKey, string>): string {
  let maxR = 0, maxC = 0;
  for (const k of Object.keys(cells)) { const p = parseRef(k); if (p) { maxC = Math.max(maxC, p[0]); maxR = Math.max(maxR, p[1]); } }
  const lines: string[] = [];
  for (let r = 0; r <= maxR; r++) {
    const row: string[] = [];
    for (let c = 0; c <= maxC; c++) {
      let v = cells[cellKey(c, r)] || '';
      if (v.includes(',') || v.includes('"') || v.includes('\n')) v = `"${v.replace(/"/g, '""')}"`;
      row.push(v);
    }
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

// --- Workbook types ---
interface Workbook {
  id: string;
  name: string;
  sheets: Record<string, Record<CellKey, string>>;
  sheetOrder: string[];
}

const DEFAULT_WORKBOOK: Workbook = {
  id: 'default',
  name: 'Lattice Data',
  sheetOrder: ['Lattice Data', 'Energy Log', 'Node Stats'],
  sheets: {
    'Lattice Data': {
      A1: 'Region', B1: 'Coord', C1: 'Load %', D1: 'Cores', E1: 'COP', F1: 'Fold', G1: 'Torsion', H1: 'Status',
      A2: 'Σ-Alpha', B2: '⟨2,3,5⟩', C2: '78', D2: '108', E2: '3.21', F2: '11→4', G2: '0.042', H2: 'Online',
      A3: 'Σ-Beta', B3: '⟨7,11,13⟩', C3: '65', D3: '108', E3: '3.14', F3: '11→4', G3: '0.038', H3: 'Online',
      A4: 'Σ-Gamma', B4: '⟨17,19,23⟩', C4: '42', D4: '108', E4: '2.98', F4: '11→4', G4: '0.051', H4: 'Online',
      A5: 'Σ-Delta', B5: '⟨29,31,37⟩', C5: '91', D5: '108', E5: '3.45', F5: '11→4', G5: '0.029', H5: 'Warning',
      A6: 'Σ-Epsilon', B6: '⟨41,43,47⟩', C6: '55', D6: '109', E6: '3.08', F6: '11→4', G6: '0.044', H6: 'Online',
    },
    'Energy Log': {
      A1: 'Time', B1: 'Mode', C1: 'Input W', D1: 'Output W', E1: 'COP', F1: 'Efficiency',
      A2: '08:00', B2: 'Satellite', C2: '100', D2: '320', E2: '3.20', F2: '92%',
      A3: '09:00', B3: 'Ground', C3: '100', D3: '280', E3: '2.80', F3: '88%',
    },
    'Node Stats': {
      A1: 'Node', B1: 'Packets/s', C1: 'Latency ms', D1: 'Hops', E1: 'Uptime %',
      A2: 'Prime-α', B2: '245', C2: '0.31', D2: '2', E2: '99.97',
      A3: 'Prime-β', B3: '189', C3: '0.28', D3: '3', E3: '99.94',
    },
  },
};

export default function PrimeGridApp() {
  const { save, load } = useCloudStorage();
  const [workbooks, setWorkbooks] = useState<Workbook[]>([DEFAULT_WORKBOOK]);
  const [activeWbIdx, setActiveWbIdx] = useState(0);
  const [sheet, setSheet] = useState(DEFAULT_WORKBOOK.sheetOrder[0]);
  const [selected, setSelected] = useState<CellKey | null>('A1');
  const [editing, setEditing] = useState<CellKey | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wb = workbooks[activeWbIdx];
  const cells = wb?.sheets[sheet] || {};

  // Load workbooks from cloud on mount
  useEffect(() => {
    load<Workbook[]>('spreadsheet-workbooks').then(saved => {
      if (saved && saved.length > 0) {
        setWorkbooks(saved);
        setSheet(saved[0].sheetOrder[0]);
      }
      setLoaded(true);
    });
  }, [load]);

  // Auto-save on change (debounced)
  const persistWorkbooks = useCallback((wbs: Workbook[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { save('spreadsheet-workbooks', wbs); }, 800);
  }, [save]);

  // --- Formula evaluator ---
  const evaluate = useCallback((raw: string, store: Record<CellKey, string>): string => {
    if (!raw.startsWith('=')) return raw;
    const expr = raw.slice(1).toUpperCase();
    try {
      // Range functions
      const rangeFunc = expr.match(/^(SUM|AVG|MIN|MAX|COUNT)\((.+)\)$/);
      if (rangeFunc) {
        const fn = rangeFunc[1];
        const keys = rangeFunc[2].includes(':') ? parseRange(rangeFunc[2]) : rangeFunc[2].split(',').map(s => s.trim());
        const vals = keys.map(k => parseFloat(store[k] || '0')).filter(v => !isNaN(v));
        if (fn === 'SUM') return String(vals.reduce((a, b) => a + b, 0));
        if (fn === 'AVG') return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : '0';
        if (fn === 'MIN') return vals.length ? String(Math.min(...vals)) : '0';
        if (fn === 'MAX') return vals.length ? String(Math.max(...vals)) : '0';
        if (fn === 'COUNT') return String(vals.length);
      }
      // IF(cond, then, else) — basic numeric comparison
      const ifMatch = expr.match(/^IF\(([A-Z]\d+)\s*([><=!]+)\s*(\d+(?:\.\d+)?)\s*,\s*(.+)\s*,\s*(.+)\)$/);
      if (ifMatch) {
        const cellVal = parseFloat(store[ifMatch[1]] || '0');
        const op = ifMatch[2]; const cmp = parseFloat(ifMatch[3]);
        let result = false;
        if (op === '>') result = cellVal > cmp; else if (op === '<') result = cellVal < cmp;
        else if (op === '>=' || op === '=>') result = cellVal >= cmp;
        else if (op === '<=' || op === '=<') result = cellVal <= cmp;
        else if (op === '=' || op === '==') result = cellVal === cmp;
        else if (op === '!=' || op === '<>') result = cellVal !== cmp;
        return result ? ifMatch[4].trim() : ifMatch[5].trim();
      }
      // PRIME/FACTOR
      const primeMatch = expr.match(/^PRIME\((\d+)\)$/);
      if (primeMatch) return String(nthPrime(parseInt(primeMatch[1])));
      const factorMatch = expr.match(/^FACTOR\((\d+)\)$/);
      if (factorMatch) return primeFactors(parseInt(factorMatch[1]));
      // Simple cell arithmetic: =A1+B2, =A1*2, etc
      const arith = expr.replace(/([A-Z]\d+)/g, (_, ref) => {
        const v = parseFloat(store[ref] || '0');
        return isNaN(v) ? '0' : String(v);
      });
      // eslint-disable-next-line no-new-func
      const result = new Function(`return (${arith})`)();
      if (typeof result === 'number') return Number.isInteger(result) ? String(result) : result.toFixed(4);
      return String(result);
    } catch { /* fallthrough */ }
    return raw;
  }, []);

  const commitEdit = useCallback(() => {
    if (!editing) return;
    setWorkbooks(prev => {
      const next = prev.map((w, i) => i !== activeWbIdx ? w : {
        ...w, sheets: { ...w.sheets, [sheet]: { ...w.sheets[sheet], [editing]: editValue } }
      });
      persistWorkbooks(next);
      return next;
    });
    setEditing(null);
  }, [editing, editValue, sheet, activeWbIdx, persistWorkbooks]);

  // --- Workbook management ---
  const addWorkbook = () => {
    const id = `wb-${Date.now()}`;
    const wb: Workbook = { id, name: `Workbook ${workbooks.length + 1}`, sheetOrder: ['Sheet 1'], sheets: { 'Sheet 1': {} } };
    const next = [...workbooks, wb];
    setWorkbooks(next);
    setActiveWbIdx(next.length - 1);
    setSheet('Sheet 1');
    persistWorkbooks(next);
  };
  const deleteWorkbook = () => {
    if (workbooks.length <= 1) return;
    const next = workbooks.filter((_, i) => i !== activeWbIdx);
    setWorkbooks(next);
    const newIdx = Math.min(activeWbIdx, next.length - 1);
    setActiveWbIdx(newIdx);
    setSheet(next[newIdx].sheetOrder[0]);
    persistWorkbooks(next);
  };
  const addSheet = () => {
    const name = `Sheet ${wb.sheetOrder.length + 1}`;
    setWorkbooks(prev => {
      const next = prev.map((w, i) => i !== activeWbIdx ? w : {
        ...w, sheetOrder: [...w.sheetOrder, name], sheets: { ...w.sheets, [name]: {} }
      });
      persistWorkbooks(next);
      return next;
    });
    setSheet(name);
  };

  // --- CSV import ---
  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(reader.result as string);
      const newCells: Record<CellKey, string> = {};
      rows.forEach((row, ri) => row.forEach((val, ci) => {
        if (ci < COLS && ri < ROWS && val) newCells[cellKey(ci, ri)] = val;
      }));
      setWorkbooks(prev => {
        const next = prev.map((w, i) => i !== activeWbIdx ? w : {
          ...w, sheets: { ...w.sheets, [sheet]: newCells }
        });
        persistWorkbooks(next);
        return next;
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- CSV export ---
  const exportCSV = () => {
    const csv = toCSV(cells);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${wb.name}-${sheet}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const selectionSum = useMemo(() => {
    if (!selected) return null;
    const val = parseFloat(evaluate(cells[selected] || '', cells));
    return isNaN(val) ? null : val;
  }, [selected, cells, evaluate]);

  if (!loaded) return <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">Loading…</div>;

  return (
    <div className="flex flex-col h-full bg-background font-mono text-xs">
      {/* Toolbar */}
      <div className="h-8 border-b border-border flex items-center px-2 gap-1.5">
        <select
          value={activeWbIdx}
          onChange={e => { const i = Number(e.target.value); setActiveWbIdx(i); setSheet(workbooks[i].sheetOrder[0]); }}
          className="text-[10px] bg-card border border-border rounded px-1 py-0.5 text-foreground max-w-[120px]"
        >
          {workbooks.map((w, i) => <option key={w.id} value={i}>{w.name}</option>)}
        </select>
        <button onClick={addWorkbook} className="p-0.5 rounded hover:bg-muted text-muted-foreground" title="New Workbook"><Plus size={12} /></button>
        <button onClick={deleteWorkbook} className="p-0.5 rounded hover:bg-muted text-muted-foreground" title="Delete Workbook"><Trash2 size={10} /></button>
        <div className="w-px h-4 bg-border mx-1" />
        <button onClick={() => fileInputRef.current?.click()} className="p-0.5 rounded hover:bg-muted text-muted-foreground flex items-center gap-0.5" title="Import CSV">
          <Upload size={11} /><span className="text-[9px]">CSV</span>
        </button>
        <button onClick={exportCSV} className="p-0.5 rounded hover:bg-muted text-muted-foreground flex items-center gap-0.5" title="Export CSV">
          <Download size={11} /><span className="text-[9px]">CSV</span>
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />
        <div className="ml-auto flex items-center gap-1">
          <FileSpreadsheet size={10} className="text-primary/60" />
          <span className="font-display text-[8px] tracking-[0.15em] uppercase text-primary/60">PrimeGrid</span>
        </div>
      </div>

      {/* Formula bar */}
      <div className="h-7 border-b border-border flex items-center px-2 gap-2">
        <span className="text-[10px] text-primary font-bold w-8">{selected || ''}</span>
        <div className="flex-1 border border-border rounded px-1.5 py-0.5 text-[10px] text-muted-foreground bg-card">
          {selected ? (cells[selected] || '') : ''}
        </div>
      </div>

      {/* Grid */}
      <ScrollArea className="flex-1">
        <div className="overflow-auto">
          <table className="border-collapse w-full">
            <thead>
              <tr>
                <th className="w-8 bg-muted/30 border border-border text-[9px] text-muted-foreground sticky top-0 z-10" />
                {COL_LABELS.map(c => (
                  <th key={c} className="min-w-[80px] bg-muted/30 border border-border text-[9px] text-muted-foreground font-normal px-1 py-0.5 sticky top-0 z-10">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROWS }, (_, r) => (
                <tr key={r}>
                  <td className="bg-muted/30 border border-border text-[9px] text-muted-foreground text-center px-1">{r + 1}</td>
                  {COL_LABELS.map((_, c) => {
                    const key = cellKey(c, r);
                    const isSelected = selected === key;
                    const isEditing = editing === key;
                    const raw = cells[key] || '';
                    const display = evaluate(raw, cells);
                    return (
                      <td
                        key={key}
                        className={`border border-border px-1 py-0.5 text-[10px] cursor-cell ${isSelected ? 'ring-1 ring-primary bg-primary/5' : 'hover:bg-muted/20'}`}
                        onClick={() => setSelected(key)}
                        onDoubleClick={() => { setEditing(key); setEditValue(raw); }}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                            className="w-full bg-transparent outline-none text-[10px]"
                          />
                        ) : (
                          <span className={r === 0 && cells[key] ? 'font-bold text-foreground' : 'text-muted-foreground'}>{display}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>

      {/* Sheet tabs + status bar */}
      <div className="h-6 border-t border-border flex items-center px-2 gap-1">
        {wb.sheetOrder.map(s => (
          <button
            key={s}
            onClick={() => setSheet(s)}
            className={`text-[9px] px-2 py-0.5 rounded transition-colors ${sheet === s ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
          >
            {s}
          </button>
        ))}
        <button onClick={addSheet} className="p-0.5 rounded hover:bg-muted text-muted-foreground" title="Add Sheet"><Plus size={10} /></button>
        <div className="ml-auto text-[9px] text-muted-foreground/60 flex gap-3">
          <span>Cells: {Object.keys(cells).length}</span>
          {selectionSum !== null && <span>Value: {selectionSum}</span>}
        </div>
      </div>
    </div>
  );
}

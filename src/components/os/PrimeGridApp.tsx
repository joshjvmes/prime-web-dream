import { useState, useCallback, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

const COLS = 8;
const ROWS = 20;
const COL_LABELS = Array.from({ length: COLS }, (_, i) => String.fromCharCode(65 + i));

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

function nthPrime(n: number): number {
  let count = 0;
  let num = 1;
  while (count < n) { num++; if (isPrime(num)) count++; }
  return num;
}

function primeFactors(n: number): string {
  if (n < 2) return String(n);
  const factors: string[] = [];
  let d = 2;
  let num = Math.abs(Math.floor(n));
  while (d * d <= num) {
    let exp = 0;
    while (num % d === 0) { num /= d; exp++; }
    if (exp > 0) factors.push(exp > 1 ? `${d}^${exp}` : `${d}`);
    d++;
  }
  if (num > 1) factors.push(`${num}`);
  return factors.join(' × ') || String(n);
}

type CellKey = string;

function cellKey(col: number, row: number): CellKey {
  return `${COL_LABELS[col]}${row + 1}`;
}

function parseRef(ref: string): [number, number] | null {
  const m = ref.match(/^([A-H])(\d+)$/i);
  if (!m) return null;
  const c = m[1].toUpperCase().charCodeAt(0) - 65;
  const r = parseInt(m[2]) - 1;
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
  return [c, r];
}

function parseRange(range: string): CellKey[] {
  const [start, end] = range.split(':');
  const s = parseRef(start);
  const e = parseRef(end);
  if (!s || !e) return [];
  const keys: CellKey[] = [];
  for (let c = Math.min(s[0], e[0]); c <= Math.max(s[0], e[0]); c++)
    for (let r = Math.min(s[1], e[1]); r <= Math.max(s[1], e[1]); r++)
      keys.push(cellKey(c, r));
  return keys;
}

const SHEETS = ['Lattice Data', 'Energy Log', 'Node Stats'];

const INITIAL_DATA: Record<string, Record<CellKey, string>> = {
  'Lattice Data': {
    A1: 'Region', B1: 'Coord', C1: 'Load %', D1: 'Cores', E1: 'COP', F1: 'Fold', G1: 'Torsion', H1: 'Status',
    A2: 'Σ-Alpha', B2: '⟨2,3,5⟩', C2: '78', D2: '108', E2: '3.21', F2: '11→4', G2: '0.042', H2: 'Online',
    A3: 'Σ-Beta', B3: '⟨7,11,13⟩', C3: '65', D3: '108', E3: '3.14', F3: '11→4', G3: '0.038', H3: 'Online',
    A4: 'Σ-Gamma', B4: '⟨17,19,23⟩', C4: '42', D4: '108', E4: '2.98', F4: '11→4', G4: '0.051', H4: 'Online',
    A5: 'Σ-Delta', B5: '⟨29,31,37⟩', C5: '91', D5: '108', E5: '3.45', F5: '11→4', G5: '0.029', H5: 'Warning',
    A6: 'Σ-Epsilon', B6: '⟨41,43,47⟩', C6: '55', D6: '109', E6: '3.08', F6: '11→4', G6: '0.044', H6: 'Online',
    A7: 'Σ-Zeta', B7: '⟨53,59,61⟩', C7: '33', D7: '108', E7: '3.33', F7: '11→4', G7: '0.036', H7: 'Online',
  },
  'Energy Log': {
    A1: 'Time', B1: 'Mode', C1: 'Input W', D1: 'Output W', E1: 'COP', F1: 'Efficiency',
    A2: '08:00', B2: 'Satellite', C2: '100', D2: '320', E2: '3.20', F2: '92%',
    A3: '09:00', B3: 'Ground', C3: '100', D3: '280', E3: '2.80', F3: '88%',
    A4: '10:00', B4: 'Burst', C4: '100', D4: '410', E4: '4.10', F4: '95%',
    A5: '11:00', B5: 'Satellite', C5: '100', D5: '315', E5: '3.15', F5: '91%',
  },
  'Node Stats': {
    A1: 'Node', B1: 'Packets/s', C1: 'Latency ms', D1: 'Hops', E1: 'Uptime %',
    A2: 'Prime-α', B2: '245', C2: '0.31', D2: '2', E2: '99.97',
    A3: 'Prime-β', B3: '189', C3: '0.28', D3: '3', E3: '99.94',
    A4: 'Prime-γ', B4: '312', C4: '0.42', D4: '1', E4: '99.99',
    A5: 'Prime-δ', B5: '156', C5: '0.35', D5: '4', E5: '99.91',
  },
};

export default function PrimeGridApp() {
  const [sheet, setSheet] = useState(SHEETS[0]);
  const [data, setData] = useState<Record<string, Record<CellKey, string>>>(INITIAL_DATA);
  const [selected, setSelected] = useState<CellKey | null>('A1');
  const [editing, setEditing] = useState<CellKey | null>(null);
  const [editValue, setEditValue] = useState('');

  const cells = data[sheet] || {};

  const evaluate = useCallback((raw: string, store: Record<CellKey, string>): string => {
    if (!raw.startsWith('=')) return raw;
    const expr = raw.slice(1).toUpperCase();
    try {
      const sumMatch = expr.match(/^SUM\((.+)\)$/);
      if (sumMatch) {
        const keys = parseRange(sumMatch[1]);
        const sum = keys.reduce((a, k) => a + (parseFloat(store[k] || '0') || 0), 0);
        return String(sum);
      }
      const avgMatch = expr.match(/^AVG\((.+)\)$/);
      if (avgMatch) {
        const keys = parseRange(avgMatch[1]);
        const vals = keys.map(k => parseFloat(store[k] || '0') || 0);
        return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : '0';
      }
      const primeMatch = expr.match(/^PRIME\((\d+)\)$/);
      if (primeMatch) return String(nthPrime(parseInt(primeMatch[1])));
      const factorMatch = expr.match(/^FACTOR\((\d+)\)$/);
      if (factorMatch) return primeFactors(parseInt(factorMatch[1]));
    } catch { /* fallthrough */ }
    return raw;
  }, []);

  const commitEdit = useCallback(() => {
    if (!editing) return;
    setData(prev => ({
      ...prev,
      [sheet]: { ...prev[sheet], [editing]: editValue },
    }));
    setEditing(null);
  }, [editing, editValue, sheet]);

  const selectionSum = useMemo(() => {
    if (!selected) return null;
    const val = parseFloat(evaluate(cells[selected] || '', cells));
    return isNaN(val) ? null : val;
  }, [selected, cells, evaluate]);

  return (
    <div className="flex flex-col h-full bg-background font-mono text-xs">
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
                  <th key={c} className="min-w-[90px] bg-muted/30 border border-border text-[9px] text-muted-foreground font-normal px-1 py-0.5 sticky top-0 z-10">{c}</th>
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
                        onClick={() => { setSelected(key); }}
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
      <div className="h-6 border-t border-border flex items-center px-2 gap-2">
        {SHEETS.map(s => (
          <button
            key={s}
            onClick={() => setSheet(s)}
            className={`text-[9px] px-2 py-0.5 rounded transition-colors ${sheet === s ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
          >
            {s}
          </button>
        ))}
        <div className="ml-auto text-[9px] text-muted-foreground/60 flex gap-3">
          <span>Cells: {Object.keys(cells).length}</span>
          {selectionSum !== null && <span>Value: {selectionSum}</span>}
        </div>
      </div>
    </div>
  );
}

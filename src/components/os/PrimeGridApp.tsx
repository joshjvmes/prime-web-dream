import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCloudStorage } from '@/hooks/useCloudStorage';
import { eventBus } from '@/hooks/useEventBus';
import { Download, Upload, Plus, Trash2, FileSpreadsheet, Bold, Italic, BarChart3, X } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

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
interface CellFormat { bold?: boolean; italic?: boolean; textColor?: string; bgColor?: string; numFmt?: 'currency' | 'percent' | 'decimal' | 'none'; }
interface CellData { value: string; format?: CellFormat; }

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
function toCSV(cells: Record<CellKey, CellData>): string {
  let maxR = 0, maxC = 0;
  for (const k of Object.keys(cells)) { const p = parseRef(k); if (p) { maxC = Math.max(maxC, p[0]); maxR = Math.max(maxR, p[1]); } }
  const lines: string[] = [];
  for (let r = 0; r <= maxR; r++) {
    const row: string[] = [];
    for (let c = 0; c <= maxC; c++) {
      let v = cells[cellKey(c, r)]?.value || '';
      if (v.includes(',') || v.includes('"') || v.includes('\n')) v = `"${v.replace(/"/g, '""')}"`;
      row.push(v);
    }
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

// --- Chart type ---
interface ChartObj { id: string; range: string; type: 'bar' | 'line' | 'pie'; title: string; }

// --- Workbook types ---
interface Workbook {
  id: string;
  name: string;
  sheets: Record<string, Record<CellKey, CellData>>;
  sheetOrder: string[];
  namedRanges?: Record<string, string>;
  charts?: ChartObj[];
}

function cellVal(c: CellData | undefined): string { return c?.value || ''; }

const DEFAULT_CELLS: Record<CellKey, CellData> = {
  A1: { value: 'Region', format: { bold: true } }, B1: { value: 'Coord', format: { bold: true } }, C1: { value: 'Load %', format: { bold: true } }, D1: { value: 'Cores', format: { bold: true } }, E1: { value: 'COP', format: { bold: true } }, F1: { value: 'Fold', format: { bold: true } }, G1: { value: 'Torsion', format: { bold: true } }, H1: { value: 'Status', format: { bold: true } },
  A2: { value: 'Σ-Alpha' }, B2: { value: '⟨2,3,5⟩' }, C2: { value: '78' }, D2: { value: '108' }, E2: { value: '3.21' }, F2: { value: '11→4' }, G2: { value: '0.042' }, H2: { value: 'Online' },
  A3: { value: 'Σ-Beta' }, B3: { value: '⟨7,11,13⟩' }, C3: { value: '65' }, D3: { value: '108' }, E3: { value: '3.14' }, F3: { value: '11→4' }, G3: { value: '0.038' }, H3: { value: 'Online' },
  A4: { value: 'Σ-Gamma' }, B4: { value: '⟨17,19,23⟩' }, C4: { value: '42' }, D4: { value: '108' }, E4: { value: '2.98' }, F4: { value: '11→4' }, G4: { value: '0.051' }, H4: { value: 'Online' },
  A5: { value: 'Σ-Delta' }, B5: { value: '⟨29,31,37⟩' }, C5: { value: '91' }, D5: { value: '108' }, E5: { value: '3.45' }, F5: { value: '11→4' }, G5: { value: '0.029' }, H5: { value: 'Warning' },
  A6: { value: 'Σ-Epsilon' }, B6: { value: '⟨41,43,47⟩' }, C6: { value: '55' }, D6: { value: '109' }, E6: { value: '3.08' }, F6: { value: '11→4' }, G6: { value: '0.044' }, H6: { value: 'Online' },
};

const DEFAULT_WORKBOOK: Workbook = {
  id: 'default',
  name: 'Lattice Data',
  sheetOrder: ['Lattice Data', 'Energy Log', 'Node Stats'],
  namedRanges: {},
  charts: [],
  sheets: {
    'Lattice Data': DEFAULT_CELLS,
    'Energy Log': {
      A1: { value: 'Time', format: { bold: true } }, B1: { value: 'Mode', format: { bold: true } }, C1: { value: 'Input W', format: { bold: true } }, D1: { value: 'Output W', format: { bold: true } }, E1: { value: 'COP', format: { bold: true } }, F1: { value: 'Efficiency', format: { bold: true } },
      A2: { value: '08:00' }, B2: { value: 'Satellite' }, C2: { value: '100' }, D2: { value: '320' }, E2: { value: '3.20' }, F2: { value: '92%' },
      A3: { value: '09:00' }, B3: { value: 'Ground' }, C3: { value: '100' }, D3: { value: '280' }, E3: { value: '2.80' }, F3: { value: '88%' },
    },
    'Node Stats': {
      A1: { value: 'Node', format: { bold: true } }, B1: { value: 'Packets/s', format: { bold: true } }, C1: { value: 'Latency ms', format: { bold: true } }, D1: { value: 'Hops', format: { bold: true } }, E1: { value: 'Uptime %', format: { bold: true } },
      A2: { value: 'Prime-α' }, B2: { value: '245' }, C2: { value: '0.31' }, D2: { value: '2' }, E2: { value: '99.97' },
      A3: { value: 'Prime-β' }, B3: { value: '189' }, C3: { value: '0.28' }, D3: { value: '3' }, E3: { value: '99.94' },
    },
  },
};

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(270, 80%, 60%)', 'hsl(45, 90%, 55%)', 'hsl(140, 70%, 45%)', 'hsl(0, 75%, 55%)', 'hsl(200, 80%, 55%)'];

export default function PrimeGridApp() {
  const { save, load } = useCloudStorage();
  const [workbooks, setWorkbooks] = useState<Workbook[]>([DEFAULT_WORKBOOK]);
  const [activeWbIdx, setActiveWbIdx] = useState(0);
  const [sheet, setSheet] = useState(DEFAULT_WORKBOOK.sheetOrder[0]);
  const [selected, setSelected] = useState<CellKey | null>('A1');
  const [editing, setEditing] = useState<CellKey | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [selRange, setSelRange] = useState<{ start: CellKey; end: CellKey } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [freezeRow, setFreezeRow] = useState(true);
  const [showChartPanel, setShowChartPanel] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wb = workbooks[activeWbIdx];
  const cells = wb?.sheets[sheet] || {};
  const charts = wb?.charts || [];

  useEffect(() => {
    load<Workbook[]>('spreadsheet-workbooks-v2').then(saved => {
      if (saved && saved.length > 0) {
        setWorkbooks(saved);
        setSheet(saved[0].sheetOrder[0]);
      }
      setLoaded(true);
    });
  }, [load]);

  const persistWorkbooks = useCallback((wbs: Workbook[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { save('spreadsheet-workbooks-v2', wbs); }, 800);
  }, [save]);

  // --- Formula evaluator ---
  const evaluate = useCallback((raw: string, store: Record<CellKey, CellData>, namedRanges?: Record<string, string>): string => {
    if (!raw.startsWith('=')) return raw;
    let expr = raw.slice(1).toUpperCase();
    // Replace named ranges
    if (namedRanges) {
      for (const [name, range] of Object.entries(namedRanges)) {
        expr = expr.replace(new RegExp(name.toUpperCase(), 'g'), range);
      }
    }
    try {
      // CONCAT
      const concatMatch = expr.match(/^CONCAT\((.+)\)$/);
      if (concatMatch) {
        const parts = concatMatch[1].split(',').map(s => {
          s = s.trim();
          if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
          const ref = parseRef(s);
          if (ref) return cellVal(store[cellKey(ref[0], ref[1])]);
          return s;
        });
        return parts.join('');
      }
      // ROUND
      const roundMatch = expr.match(/^ROUND\((.+),\s*(\d+)\)$/);
      if (roundMatch) {
        const val = parseFloat(evaluate('=' + roundMatch[1], store, namedRanges));
        return val.toFixed(parseInt(roundMatch[2]));
      }
      // ABS
      const absMatch = expr.match(/^ABS\((.+)\)$/);
      if (absMatch) {
        const val = parseFloat(evaluate('=' + absMatch[1], store, namedRanges));
        return String(Math.abs(val));
      }
      // Range functions
      const rangeFunc = expr.match(/^(SUM|AVG|MIN|MAX|COUNT)\((.+)\)$/);
      if (rangeFunc) {
        const fn = rangeFunc[1];
        const keys = rangeFunc[2].includes(':') ? parseRange(rangeFunc[2]) : rangeFunc[2].split(',').map(s => s.trim());
        const vals = keys.map(k => parseFloat(cellVal(store[k]) || '0')).filter(v => !isNaN(v));
        if (fn === 'SUM') return String(vals.reduce((a, b) => a + b, 0));
        if (fn === 'AVG') return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : '0';
        if (fn === 'MIN') return vals.length ? String(Math.min(...vals)) : '0';
        if (fn === 'MAX') return vals.length ? String(Math.max(...vals)) : '0';
        if (fn === 'COUNT') return String(vals.length);
      }
      // IF
      const ifMatch = expr.match(/^IF\(([A-Z]\d+)\s*([><=!]+)\s*(\d+(?:\.\d+)?)\s*,\s*(.+)\s*,\s*(.+)\)$/);
      if (ifMatch) {
        const cv = parseFloat(cellVal(store[ifMatch[1]]) || '0');
        const op = ifMatch[2]; const cmp = parseFloat(ifMatch[3]);
        let result = false;
        if (op === '>') result = cv > cmp; else if (op === '<') result = cv < cmp;
        else if (op === '>=' || op === '=>') result = cv >= cmp;
        else if (op === '<=' || op === '=<') result = cv <= cmp;
        else if (op === '=' || op === '==') result = cv === cmp;
        else if (op === '!=' || op === '<>') result = cv !== cmp;
        return result ? ifMatch[4].trim() : ifMatch[5].trim();
      }
      // PRIME/FACTOR
      const primeMatch = expr.match(/^PRIME\((\d+)\)$/);
      if (primeMatch) return String(nthPrime(parseInt(primeMatch[1])));
      const factorMatch = expr.match(/^FACTOR\((\d+)\)$/);
      if (factorMatch) return primeFactors(parseInt(factorMatch[1]));
      // Arithmetic
      const arith = expr.replace(/([A-Z]\d+)/g, (_, ref) => {
        const v = parseFloat(cellVal(store[ref]) || '0');
        return isNaN(v) ? '0' : String(v);
      });
      const result = new Function(`return (${arith})`)();
      if (typeof result === 'number') return Number.isInteger(result) ? String(result) : result.toFixed(4);
      return String(result);
    } catch {}
    return raw;
  }, []);

  const formatDisplay = useCallback((value: string, fmt?: CellFormat): string => {
    if (!fmt?.numFmt || fmt.numFmt === 'none') return value;
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    if (fmt.numFmt === 'currency') return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (fmt.numFmt === 'percent') return `${(num * 100).toFixed(1)}%`;
    if (fmt.numFmt === 'decimal') return num.toFixed(2);
    return value;
  }, []);

  const commitEdit = useCallback(() => {
    if (!editing) return;
    setWorkbooks(prev => {
      const next = prev.map((w, i) => i !== activeWbIdx ? w : {
        ...w, sheets: { ...w.sheets, [sheet]: { ...w.sheets[sheet], [editing]: { ...w.sheets[sheet]?.[editing], value: editValue } } }
      });
      persistWorkbooks(next);
      return next;
    });
    setEditing(null);
  }, [editing, editValue, sheet, activeWbIdx, persistWorkbooks]);

  const toggleFormat = useCallback((key: 'bold' | 'italic') => {
    if (!selected) return;
    setWorkbooks(prev => {
      const next = prev.map((w, i) => {
        if (i !== activeWbIdx) return w;
        const cell = w.sheets[sheet]?.[selected] || { value: '' };
        return { ...w, sheets: { ...w.sheets, [sheet]: { ...w.sheets[sheet], [selected]: { ...cell, format: { ...cell.format, [key]: !cell.format?.[key] } } } } };
      });
      persistWorkbooks(next);
      return next;
    });
  }, [selected, sheet, activeWbIdx, persistWorkbooks]);

  const setNumFmt = useCallback((fmt: CellFormat['numFmt']) => {
    if (!selected) return;
    setWorkbooks(prev => {
      const next = prev.map((w, i) => {
        if (i !== activeWbIdx) return w;
        const cell = w.sheets[sheet]?.[selected] || { value: '' };
        return { ...w, sheets: { ...w.sheets, [sheet]: { ...w.sheets[sheet], [selected]: { ...cell, format: { ...cell.format, numFmt: fmt } } } } };
      });
      persistWorkbooks(next);
      return next;
    });
  }, [selected, sheet, activeWbIdx, persistWorkbooks]);

  const addWorkbook = () => {
    const id = `wb-${Date.now()}`;
    const newWb: Workbook = { id, name: `Workbook ${workbooks.length + 1}`, sheetOrder: ['Sheet 1'], sheets: { 'Sheet 1': {} }, namedRanges: {}, charts: [] };
    const next = [...workbooks, newWb];
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

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(reader.result as string);
      const newCells: Record<CellKey, CellData> = {};
      rows.forEach((row, ri) => row.forEach((val, ci) => {
        if (ci < COLS && ri < ROWS && val) newCells[cellKey(ci, ri)] = { value: val };
      }));
      setWorkbooks(prev => {
        const next = prev.map((w, i) => i !== activeWbIdx ? w : { ...w, sheets: { ...w.sheets, [sheet]: newCells } });
        persistWorkbooks(next);
        return next;
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportCSV = () => {
    const csv = toCSV(cells);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${wb.name}-${sheet}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const addChart = useCallback((range: string, type: ChartObj['type'], title: string) => {
    const chart: ChartObj = { id: `ch-${Date.now()}`, range, type, title };
    setWorkbooks(prev => {
      const next = prev.map((w, i) => i !== activeWbIdx ? w : { ...w, charts: [...(w.charts || []), chart] });
      persistWorkbooks(next);
      return next;
    });
    setShowChartPanel(true);
  }, [activeWbIdx, persistWorkbooks]);

  const removeChart = useCallback((id: string) => {
    setWorkbooks(prev => {
      const next = prev.map((w, i) => i !== activeWbIdx ? w : { ...w, charts: (w.charts || []).filter(c => c.id !== id) });
      persistWorkbooks(next);
      return next;
    });
  }, [activeWbIdx, persistWorkbooks]);

  // Multi-select
  const selectedKeys = useMemo(() => {
    if (!selRange) return selected ? [selected] : [];
    const s = parseRef(selRange.start), e = parseRef(selRange.end);
    if (!s || !e) return selected ? [selected] : [];
    const keys: CellKey[] = [];
    for (let c = Math.min(s[0], e[0]); c <= Math.max(s[0], e[0]); c++)
      for (let r = Math.min(s[1], e[1]); r <= Math.max(s[1], e[1]); r++)
        keys.push(cellKey(c, r));
    return keys;
  }, [selRange, selected]);

  const selectionStats = useMemo(() => {
    if (selectedKeys.length <= 1) return null;
    const vals = selectedKeys.map(k => parseFloat(evaluate(cellVal(cells[k]), cells, wb.namedRanges))).filter(v => !isNaN(v));
    if (vals.length === 0) return null;
    return { sum: vals.reduce((a, b) => a + b, 0), avg: vals.reduce((a, b) => a + b, 0) / vals.length, count: vals.length };
  }, [selectedKeys, cells, evaluate, wb.namedRanges]);

  // EventBus listeners for AI
  useEffect(() => {
    const handleCreate = (payload: any) => {
      if (!payload?.name || !payload?.headers) return;
      const name = payload.name;
      const newCells: Record<CellKey, CellData> = {};
      payload.headers.forEach((h: string, i: number) => { newCells[cellKey(i, 0)] = { value: h, format: { bold: true } }; });
      if (payload.rows) {
        payload.rows.forEach((row: string[], ri: number) => {
          row.forEach((val: string, ci: number) => { newCells[cellKey(ci, ri + 1)] = { value: val }; });
        });
      }
      setWorkbooks(prev => {
        const next = prev.map((w, i) => i !== activeWbIdx ? w : {
          ...w, sheetOrder: [...w.sheetOrder, name], sheets: { ...w.sheets, [name]: newCells }
        });
        persistWorkbooks(next);
        return next;
      });
      setSheet(name);
    };
    const handleUpdate = (payload: any) => {
      if (!payload?.cells) return;
      setWorkbooks(prev => {
        const next = prev.map((w, i) => {
          if (i !== activeWbIdx) return w;
          const targetSheet = payload.sheet || sheet;
          const existing = { ...w.sheets[targetSheet] };
          for (const [key, val] of Object.entries(payload.cells as Record<string, string>)) {
            existing[key] = { ...existing[key], value: val };
          }
          return { ...w, sheets: { ...w.sheets, [targetSheet]: existing } };
        });
        persistWorkbooks(next);
        return next;
      });
    };
    const handleChart = (payload: any) => {
      if (!payload?.range || !payload?.chart_type) return;
      addChart(payload.range, payload.chart_type, payload.title || 'Chart');
    };

    eventBus.on('spreadsheet.create', handleCreate);
    eventBus.on('spreadsheet.update', handleUpdate);
    eventBus.on('spreadsheet.chart', handleChart);
    return () => {
      eventBus.off('spreadsheet.create', handleCreate);
      eventBus.off('spreadsheet.update', handleUpdate);
      eventBus.off('spreadsheet.chart', handleChart);
    };
  }, [activeWbIdx, sheet, addChart, persistWorkbooks]);

  // Build chart data from range
  const buildChartData = useCallback((range: string) => {
    const keys = parseRange(range);
    if (keys.length === 0) return [];
    // Determine grid dimensions
    const refs = keys.map(k => parseRef(k)!).filter(Boolean);
    const minC = Math.min(...refs.map(r => r[0])), maxC = Math.max(...refs.map(r => r[0]));
    const minR = Math.min(...refs.map(r => r[1])), maxR = Math.max(...refs.map(r => r[1]));
    const data: any[] = [];
    for (let r = minR + 1; r <= maxR; r++) {
      const row: any = { name: evaluate(cellVal(cells[cellKey(minC, r)]), cells, wb.namedRanges) };
      for (let c = minC + 1; c <= maxC; c++) {
        const header = evaluate(cellVal(cells[cellKey(c, minR)]), cells, wb.namedRanges) || `Col${c}`;
        row[header] = parseFloat(evaluate(cellVal(cells[cellKey(c, r)]), cells, wb.namedRanges)) || 0;
      }
      data.push(row);
    }
    return data;
  }, [cells, evaluate, wb.namedRanges]);

  if (!loaded) return <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">Loading…</div>;

  return (
    <div className="flex flex-col h-full bg-background font-mono text-xs">
      {/* Toolbar */}
      <div className="h-8 border-b border-border flex items-center px-2 gap-1.5">
        <select value={activeWbIdx} onChange={e => { const i = Number(e.target.value); setActiveWbIdx(i); setSheet(workbooks[i].sheetOrder[0]); }}
          className="text-[10px] bg-card border border-border rounded px-1 py-0.5 text-foreground max-w-[120px]">
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
        <div className="w-px h-4 bg-border mx-1" />
        {/* Formatting */}
        <button onClick={() => toggleFormat('bold')} className={`p-0.5 rounded ${cells[selected || '']?.format?.bold ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted'}`}><Bold size={11} /></button>
        <button onClick={() => toggleFormat('italic')} className={`p-0.5 rounded ${cells[selected || '']?.format?.italic ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted'}`}><Italic size={11} /></button>
        <select value={cells[selected || '']?.format?.numFmt || 'none'} onChange={e => setNumFmt(e.target.value as any)}
          className="text-[9px] bg-card border border-border rounded px-1 py-0.5 text-foreground">
          <option value="none">Auto</option>
          <option value="currency">$</option>
          <option value="percent">%</option>
          <option value="decimal">.00</option>
        </select>
        <div className="w-px h-4 bg-border mx-1" />
        <button onClick={() => { if (selRange) addChart(`${selRange.start}:${selRange.end}`, 'bar', 'Chart'); }}
          className="p-0.5 rounded text-muted-foreground hover:bg-muted flex items-center gap-0.5" title="Add Chart from Selection">
          <BarChart3 size={11} /><span className="text-[9px]">Chart</span>
        </button>
        <button onClick={() => setShowChartPanel(!showChartPanel)}
          className={`p-0.5 rounded text-[9px] ${showChartPanel ? 'text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
          Charts
        </button>
        <div className="ml-auto flex items-center gap-1">
          <FileSpreadsheet size={10} className="text-primary/60" />
          <span className="font-display text-[8px] tracking-[0.15em] uppercase text-primary/60">PrimeGrid</span>
        </div>
      </div>

      {/* Formula bar */}
      <div className="h-7 border-b border-border flex items-center px-2 gap-2">
        <span className="text-[10px] text-primary font-bold w-8">{selected || ''}</span>
        <div className="flex-1 border border-border rounded px-1.5 py-0.5 text-[10px] text-muted-foreground bg-card">
          {selected ? (cellVal(cells[selected]) || '') : ''}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
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
                    <td className={`bg-muted/30 border border-border text-[9px] text-muted-foreground text-center px-1 ${freezeRow && r === 0 ? 'sticky top-6 z-[5]' : ''}`}>{r + 1}</td>
                    {COL_LABELS.map((_, c) => {
                      const key = cellKey(c, r);
                      const isSelected = selectedKeys.includes(key);
                      const isEditing = editing === key;
                      const cell = cells[key];
                      const raw = cellVal(cell);
                      const display = formatDisplay(evaluate(raw, cells, wb.namedRanges), cell?.format);
                      const fmt = cell?.format;
                      return (
                        <td key={key}
                          className={`border border-border px-1 py-0.5 text-[10px] cursor-cell ${isSelected ? 'ring-1 ring-primary bg-primary/5' : 'hover:bg-muted/20'} ${freezeRow && r === 0 ? 'sticky top-6 z-[5] bg-muted/30' : ''}`}
                          style={{ backgroundColor: fmt?.bgColor, color: fmt?.textColor }}
                          onClick={() => { setSelected(key); if (!dragging) setSelRange(null); }}
                          onMouseDown={() => { setDragging(true); setSelRange({ start: key, end: key }); }}
                          onMouseEnter={() => { if (dragging) setSelRange(prev => prev ? { ...prev, end: key } : null); }}
                          onMouseUp={() => setDragging(false)}
                          onDoubleClick={() => { setEditing(key); setEditValue(raw); }}
                        >
                          {isEditing ? (
                            <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                              className="w-full bg-transparent outline-none text-[10px]" />
                          ) : (
                            <span className={`${fmt?.bold ? 'font-bold' : ''} ${fmt?.italic ? 'italic' : ''} ${r === 0 && raw ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{display}</span>
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

        {/* Charts panel */}
        {showChartPanel && charts.length > 0 && (
          <div className="w-64 border-l border-border flex flex-col">
            <div className="p-2 border-b border-border">
              <span className="font-display text-[9px] tracking-wider uppercase text-primary">Charts</span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-3">
                {charts.map(chart => {
                  const data = buildChartData(chart.range);
                  const keys = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'name') : [];
                  return (
                    <div key={chart.id} className="border border-border rounded p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-foreground font-bold">{chart.title}</span>
                        <button onClick={() => removeChart(chart.id)} className="text-muted-foreground hover:text-destructive"><X size={10} /></button>
                      </div>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          {chart.type === 'bar' ? (
                            <BarChart data={data}>
                              <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                              <YAxis tick={{ fontSize: 8 }} />
                              <Tooltip contentStyle={{ fontSize: 9 }} />
                              {keys.map((k, i) => <Bar key={k} dataKey={k} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                            </BarChart>
                          ) : chart.type === 'line' ? (
                            <LineChart data={data}>
                              <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                              <YAxis tick={{ fontSize: 8 }} />
                              <Tooltip contentStyle={{ fontSize: 9 }} />
                              {keys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />)}
                            </LineChart>
                          ) : (
                            <PieChart>
                              <Pie data={data.map((d, i) => ({ name: d.name, value: d[keys[0]] || 0 }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50}>
                                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                              </Pie>
                              <Tooltip contentStyle={{ fontSize: 9 }} />
                            </PieChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                      <span className="text-[8px] text-muted-foreground">{chart.range} • {chart.type}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Sheet tabs + status bar */}
      <div className="h-6 border-t border-border flex items-center px-2 gap-1">
        {wb.sheetOrder.map(s => (
          <button key={s} onClick={() => setSheet(s)}
            className={`text-[9px] px-2 py-0.5 rounded transition-colors ${sheet === s ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}>
            {s}
          </button>
        ))}
        <button onClick={addSheet} className="p-0.5 rounded hover:bg-muted text-muted-foreground" title="Add Sheet"><Plus size={10} /></button>
        <div className="ml-auto text-[9px] text-muted-foreground/60 flex gap-3">
          <span>Cells: {Object.keys(cells).length}</span>
          {selectionStats && (
            <>
              <span>SUM: {selectionStats.sum.toFixed(2)}</span>
              <span>AVG: {selectionStats.avg.toFixed(2)}</span>
              <span>CNT: {selectionStats.count}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

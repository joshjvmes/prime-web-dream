import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, Thermometer, Droplets, Gauge, Radio, Power, Eye } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { eventBus } from '@/hooks/useEventBus';

type DeviceType = 'temp' | 'humidity' | 'pressure' | 'radiation' | 'valve' | 'switch' | 'motor' | 'camera';
type DeviceStatus = 'online' | 'offline' | 'warning';
type Zone = 'Lab A' | 'Server Room' | 'Energy Wing' | 'Perimeter';

interface IoTDevice {
  id: string;
  name: string;
  type: DeviceType;
  zone: Zone;
  status: DeviceStatus;
  reading: number;
  unit: string;
  battery: number;
  threshold?: { min: number; max: number };
  history: number[];
  enabled: boolean;
}

const TYPE_ICONS: Record<DeviceType, React.ReactNode> = {
  temp: <Thermometer size={12} />, humidity: <Droplets size={12} />,
  pressure: <Gauge size={12} />, radiation: <Radio size={12} />,
  valve: <Power size={12} />, switch: <Power size={12} />,
  motor: <Power size={12} />, camera: <Eye size={12} />,
};

const ZONES: Zone[] = ['Lab A', 'Server Room', 'Energy Wing', 'Perimeter'];

const makeHistory = (base: number, range: number) => Array.from({ length: 20 }, () => base + (Math.random() - 0.5) * range);

const INITIAL_DEVICES: IoTDevice[] = [
  { id: 'iot-01', name: 'TH-Sensor-01', type: 'temp', zone: 'Lab A', status: 'online', reading: 22.4, unit: '°C', battery: 89, threshold: { min: 18, max: 28 }, history: makeHistory(22, 4), enabled: true },
  { id: 'iot-02', name: 'HM-Sensor-01', type: 'humidity', zone: 'Lab A', status: 'online', reading: 45, unit: '%', battery: 72, threshold: { min: 30, max: 60 }, history: makeHistory(45, 15), enabled: true },
  { id: 'iot-03', name: 'TH-Sensor-02', type: 'temp', zone: 'Server Room', status: 'online', reading: 19.1, unit: '°C', battery: 95, threshold: { min: 15, max: 24 }, history: makeHistory(19, 3), enabled: true },
  { id: 'iot-04', name: 'PR-Sensor-01', type: 'pressure', zone: 'Server Room', status: 'warning', reading: 1024, unit: 'hPa', battery: 34, threshold: { min: 990, max: 1020 }, history: makeHistory(1015, 20), enabled: true },
  { id: 'iot-05', name: 'RAD-Sensor-01', type: 'radiation', zone: 'Energy Wing', status: 'online', reading: 0.12, unit: 'μSv/h', battery: 88, threshold: { min: 0, max: 0.5 }, history: makeHistory(0.12, 0.1), enabled: true },
  { id: 'iot-06', name: 'Valve-Main', type: 'valve', zone: 'Energy Wing', status: 'online', reading: 1, unit: 'open', battery: 100, history: [], enabled: true },
  { id: 'iot-07', name: 'Motor-Pump-A', type: 'motor', zone: 'Energy Wing', status: 'online', reading: 2400, unit: 'RPM', battery: 100, history: makeHistory(2400, 200), enabled: true },
  { id: 'iot-08', name: 'CAM-Perimeter-1', type: 'camera', zone: 'Perimeter', status: 'online', reading: 30, unit: 'fps', battery: 67, history: [], enabled: true },
  { id: 'iot-09', name: 'CAM-Perimeter-2', type: 'camera', zone: 'Perimeter', status: 'offline', reading: 0, unit: 'fps', battery: 0, history: [], enabled: false },
  { id: 'iot-10', name: 'TH-Sensor-03', type: 'temp', zone: 'Perimeter', status: 'online', reading: 8.3, unit: '°C', battery: 41, threshold: { min: -10, max: 45 }, history: makeHistory(8, 5), enabled: true },
];

function MiniSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 20;
  const w = 80;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="text-primary">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={points} />
    </svg>
  );
}

export default function PrimeIoTApp() {
  const [devices, setDevices] = useState<IoTDevice[]>(INITIAL_DEVICES);
  const [selected, setSelected] = useState<string | null>('iot-01');
  const [zoneFilter, setZoneFilter] = useState<Zone | 'all'>('all');
  const [view, setView] = useState<'list' | 'alerts'>('list');

  // ROKCAT navigation listener
  const ZONE_MAP: Record<string, Zone> = { 'lab-a': 'Lab A', 'server-room': 'Server Room', 'energy-wing': 'Energy Wing', 'perimeter': 'Perimeter' };
  useEffect(() => {
    const handler = (payload: any) => {
      if (payload?.app === 'iot' && payload?.context) {
        const ctx = payload.context.toLowerCase();
        if (ctx === 'alerts') setView('alerts');
        else if (ZONE_MAP[ctx]) { setView('list'); setZoneFilter(ZONE_MAP[ctx]); }
      }
    };
    eventBus.on('app.navigate', handler);
    return () => eventBus.off('app.navigate', handler);
  }, []);

  // Simulated live updates
  useEffect(() => {
    const iv = setInterval(() => {
      setDevices(prev => prev.map(d => {
        if (!d.enabled || d.status === 'offline') return d;
        if (['temp', 'humidity', 'pressure', 'radiation'].includes(d.type)) {
          const newReading = +(d.reading + (Math.random() - 0.5) * (d.type === 'pressure' ? 2 : d.type === 'radiation' ? 0.02 : 1)).toFixed(2);
          const newHistory = [...d.history.slice(-19), newReading];
          const isWarning = d.threshold && (newReading < d.threshold.min || newReading > d.threshold.max);
          return { ...d, reading: newReading, history: newHistory, status: isWarning ? 'warning' as DeviceStatus : 'online' as DeviceStatus };
        }
        return d;
      }));
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const filtered = zoneFilter === 'all' ? devices : devices.filter(d => d.zone === zoneFilter);
  const alerts = devices.filter(d => d.status === 'warning' || d.status === 'offline');
  const sel = devices.find(d => d.id === selected);

  const toggleDevice = (id: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, enabled: !d.enabled, status: d.enabled ? 'offline' as DeviceStatus : 'online' as DeviceStatus, reading: d.enabled ? 0 : d.reading } : d));
  };

  return (
    <div className="flex h-full bg-background text-foreground font-mono text-xs">
      {/* Device List */}
      <div className="w-56 border-r border-border flex flex-col shrink-0">
        <div className="p-2 border-b border-border">
          <div className="flex items-center gap-1.5 mb-2">
            <Wifi size={12} className="text-primary" />
            <span className="font-display text-[9px] tracking-widest uppercase text-primary">IoT Devices</span>
            <span className="ml-auto text-[9px] text-muted-foreground">{devices.filter(d => d.status === 'online').length}/{devices.length}</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => { setView('list'); setZoneFilter('all'); }} className={`px-1.5 py-0.5 rounded text-[8px] ${zoneFilter === 'all' && view === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>All</button>
            {ZONES.map(z => (
              <button key={z} onClick={() => { setView('list'); setZoneFilter(z); }} className={`px-1.5 py-0.5 rounded text-[8px] ${zoneFilter === z ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>{z}</button>
            ))}
            <button onClick={() => setView('alerts')} className={`px-1.5 py-0.5 rounded text-[8px] ${view === 'alerts' ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground'}`}>
              ⚠ {alerts.length}
            </button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-0.5">
            {(view === 'alerts' ? alerts : filtered).map(d => (
              <button
                key={d.id}
                onClick={() => setSelected(d.id)}
                className={`w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors ${
                  selected === d.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/30'
                }`}
              >
                <span className={d.status === 'online' ? 'text-prime-green' : d.status === 'warning' ? 'text-prime-amber' : 'text-muted-foreground'}>
                  {TYPE_ICONS[d.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] truncate">{d.name}</p>
                  <p className="text-[8px] text-muted-foreground">{d.zone}</p>
                </div>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  d.status === 'online' ? 'bg-prime-green' : d.status === 'warning' ? 'bg-prime-amber animate-pulse' : 'bg-muted-foreground'
                }`} />
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Detail */}
      <div className="flex-1 flex flex-col min-w-0">
        {sel ? (
          <>
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className={sel.status === 'online' ? 'text-prime-green' : sel.status === 'warning' ? 'text-prime-amber' : 'text-muted-foreground'}>
                  {TYPE_ICONS[sel.type]}
                </span>
                <div>
                  <h3 className="text-sm font-display text-foreground">{sel.name}</h3>
                  <p className="text-[9px] text-muted-foreground">{sel.zone} • {sel.type} • {sel.id}</p>
                </div>
                <span className={`ml-auto px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  sel.status === 'online' ? 'bg-prime-green/20 text-prime-green' :
                  sel.status === 'warning' ? 'bg-prime-amber/20 text-prime-amber' :
                  'bg-muted text-muted-foreground'
                }`}>{sel.status}</span>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-4">
                {/* Current Reading */}
                <div className="p-3 rounded border border-border text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Current Reading</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{sel.reading}<span className="text-sm text-muted-foreground ml-1">{sel.unit}</span></p>
                  {sel.threshold && (
                    <p className="text-[9px] text-muted-foreground mt-1">Threshold: {sel.threshold.min} — {sel.threshold.max} {sel.unit}</p>
                  )}
                </div>

                {/* Sparkline */}
                {sel.history.length > 1 && (
                  <div className="p-3 rounded border border-border">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">History (last 20 readings)</p>
                    <MiniSparkline data={sel.history} />
                  </div>
                )}

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded border border-border">
                    <p className="text-[9px] text-muted-foreground">Battery</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${sel.battery > 50 ? 'bg-prime-green' : sel.battery > 20 ? 'bg-prime-amber' : 'bg-destructive'}`} style={{ width: `${sel.battery}%` }} />
                      </div>
                      <span className="text-[10px]">{sel.battery}%</span>
                    </div>
                  </div>
                  <div className="p-2 rounded border border-border">
                    <p className="text-[9px] text-muted-foreground">Enabled</p>
                    <button onClick={() => toggleDevice(sel.id)} className={`mt-1 px-2 py-0.5 rounded text-[10px] border ${sel.enabled ? 'border-prime-green/50 text-prime-green' : 'border-border text-muted-foreground'}`}>
                      {sel.enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* Alerts */}
                {sel.status === 'warning' && sel.threshold && (
                  <div className="p-2 rounded border border-prime-amber/30 bg-prime-amber/5 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-prime-amber shrink-0" />
                    <p className="text-[10px] text-prime-amber">
                      Reading {sel.reading} {sel.unit} is outside threshold ({sel.threshold.min}–{sel.threshold.max})
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-[11px]">Select a device</div>
        )}
      </div>
    </div>
  );
}

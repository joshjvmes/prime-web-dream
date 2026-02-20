import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, subMonths,
  getDay, isSameDay, isToday, getDayOfYear, getMonth
} from 'date-fns';
import { ChevronLeft, ChevronRight, Diamond, Sun, Moon } from 'lucide-react';

// Moon phase calculation using synodic period
const SYNODIC_PERIOD = 29.53058867;
const KNOWN_NEW_MOON = new Date(2000, 0, 6, 18, 14); // Jan 6, 2000

function getMoonPhase(date: Date): number {
  const diff = date.getTime() - KNOWN_NEW_MOON.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  const phase = ((days % SYNODIC_PERIOD) + SYNODIC_PERIOD) % SYNODIC_PERIOD;
  return phase;
}

function getMoonPhaseIndex(date: Date): number {
  const phase = getMoonPhase(date);
  const segment = SYNODIC_PERIOD / 8;
  return Math.floor(phase / segment) % 8;
}

const MOON_PHASE_NAMES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
];

const MOON_PHASE_ICONS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];

function getMoonIllumination(date: Date): number {
  const phase = getMoonPhase(date);
  const angle = (phase / SYNODIC_PERIOD) * Math.PI * 2;
  return Math.round((1 - Math.cos(angle)) / 2 * 100);
}

function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

function primeFactorization(n: number): string {
  if (n < 2) return String(n);
  const factors: string[] = [];
  let x = n;
  for (let i = 2; i * i <= x; i++) {
    let count = 0;
    while (x % i === 0) { count++; x /= i; }
    if (count > 0) factors.push(count > 1 ? `${i}^${count}` : String(i));
  }
  if (x > 1) factors.push(String(x));
  return factors.join(' × ');
}

function latticeCoord(day: number): string {
  const primes = [2, 3, 5, 7, 11, 13];
  const coords = primes.slice(0, 3).map(p => ((day * p) % 97));
  return `⟨${coords.join(',')}⟩`;
}

function getSeasonTint(month: number): string {
  if (month >= 11 || month <= 1) return 'bg-blue-500/5'; // winter
  if (month >= 2 && month <= 4) return 'bg-green-500/5'; // spring
  if (month >= 5 && month <= 7) return 'bg-amber-500/5'; // summer
  return 'bg-orange-500/5'; // autumn
}

function getSolarCategory(date: Date): string {
  const doy = getDayOfYear(date);
  if (doy <= 80 || doy >= 355) return 'Low Arc';
  if (doy <= 172) return 'Rising Arc';
  if (doy <= 264) return 'High Arc';
  return 'Falling Arc';
}

// Solstice/equinox approximate day-of-year
function getSolarProgress(date: Date): { daysSinceSolstice: number; daysToNext: number; label: string } {
  const doy = getDayOfYear(date);
  const markers = [
    { doy: 21, label: 'Winter Solstice' },
    { doy: 80, label: 'Spring Equinox' },
    { doy: 172, label: 'Summer Solstice' },
    { doy: 264, label: 'Autumn Equinox' },
    { doy: 356, label: 'Winter Solstice' },
  ];
  for (let i = 0; i < markers.length - 1; i++) {
    if (doy >= markers[i].doy && doy < markers[i + 1].doy) {
      return {
        daysSinceSolstice: doy - markers[i].doy,
        daysToNext: markers[i + 1].doy - doy,
        label: `${markers[i].label} → ${markers[i + 1].label}`,
      };
    }
  }
  return { daysSinceSolstice: 0, daysToNext: 21, label: 'Winter Solstice → Spring Equinox' };
}

const SYSTEM_EVENTS = [
  { title: 'Q3 batch scheduled', offset: 3 },
  { title: 'Energy harvest peak', offset: 7 },
  { title: 'Lattice maintenance window', offset: 12 },
  { title: 'PrimeNet sync cycle', offset: 18 },
  { title: 'FoldMem defrag window', offset: 24 },
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function PrimeCalendarApp() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDayOfWeek = getDay(startOfMonth(currentMonth));
  const today = new Date();
  const monthNum = getMonth(currentMonth);
  const seasonTint = getSeasonTint(monthNum);

  const lunarRibbon = useMemo(() => {
    const phases: { idx: number; icon: string }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - 15 + i);
      phases.push({ idx: getMoonPhaseIndex(d), icon: MOON_PHASE_ICONS[getMoonPhaseIndex(d)] });
    }
    return phases;
  }, []);

  const solar = getSolarProgress(today);
  const solarPct = Math.round((solar.daysSinceSolstice / (solar.daysSinceSolstice + solar.daysToNext)) * 100);

  const upcomingEvents = useMemo(() => {
    return SYSTEM_EVENTS.map(evt => {
      const d = new Date(today);
      d.setDate(d.getDate() + evt.offset);
      return { ...evt, date: d };
    });
  }, []);

  return (
    <div className="h-full bg-background flex flex-col font-mono text-xs overflow-hidden">
      {/* Header with nav */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary">
          <ChevronLeft size={14} />
        </button>
        <div className="text-center">
          <p className="font-display text-[11px] tracking-wider uppercase text-primary">{format(currentMonth, 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentMonth(new Date())} className="px-2 py-0.5 text-[9px] border border-border rounded hover:bg-primary/10 text-muted-foreground hover:text-primary">Today</button>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Lunar Ribbon */}
      <div className="px-3 py-1.5 border-b border-border/50">
        <div className="flex items-center gap-0.5">
          <Moon size={10} className="text-muted-foreground shrink-0 mr-1" />
          <div className="flex gap-px flex-1 overflow-hidden">
            {lunarRibbon.map((p, i) => (
              <div key={i} className={`text-[8px] flex-1 text-center rounded-sm ${i === 15 ? 'bg-primary/20 ring-1 ring-primary/40' : ''}`} title={MOON_PHASE_NAMES[p.idx]}>
                {p.icon}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Solar Tracker */}
      <div className="px-3 py-1.5 border-b border-border/50 flex items-center gap-2">
        <Sun size={10} className="text-muted-foreground shrink-0" />
        <div className="flex-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden relative">
            <div className="h-full bg-primary/40 rounded-full" style={{ width: `${solarPct}%` }} />
            {/* Equinox/solstice markers */}
            <div className="absolute top-0 left-1/4 w-px h-full bg-muted-foreground/30" />
            <div className="absolute top-0 left-1/2 w-px h-full bg-muted-foreground/30" />
            <div className="absolute top-0 left-3/4 w-px h-full bg-muted-foreground/30" />
          </div>
          <p className="text-[8px] text-muted-foreground mt-0.5">{solar.label}</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 p-2 overflow-y-auto">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[9px] text-muted-foreground/60 font-display tracking-wider">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.map(day => {
              const dayNum = day.getDate();
              const phaseIdx = getMoonPhaseIndex(day);
              const prime = isPrime(dayNum);
              const selected = selectedDay && isSameDay(day, selectedDay);
              const todayMatch = isToday(day);

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDay(day)}
                  className={`relative p-1 rounded text-center transition-all min-h-[40px] flex flex-col items-center justify-center gap-0.5
                    ${seasonTint}
                    ${selected ? 'ring-1 ring-primary bg-primary/10' : 'hover:bg-muted/40'}
                    ${todayMatch ? 'border border-primary/40' : ''}
                    ${prime ? 'glow-border' : ''}
                  `}
                >
                  <div className="flex items-center gap-0.5">
                    {prime && <Diamond size={6} className="text-primary" />}
                    <span className={`text-[10px] ${todayMatch ? 'text-primary font-bold' : 'text-foreground'}`}>{dayNum}</span>
                  </div>
                  <span className="text-[7px] leading-none">{MOON_PHASE_ICONS[phaseIdx]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Day Detail / Events */}
        <div className="w-44 border-l border-border p-2 overflow-y-auto flex flex-col gap-3">
          {selectedDay ? (
            <div className="space-y-2">
              <h3 className="font-display text-[9px] tracking-wider uppercase text-primary">Day Detail</h3>
              <p className="text-[10px] text-foreground">{format(selectedDay, 'EEEE, MMMM d, yyyy')}</p>

              <div className="space-y-1.5">
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Moon Phase</p>
                  <p className="text-[10px] text-foreground">
                    {MOON_PHASE_ICONS[getMoonPhaseIndex(selectedDay)]} {MOON_PHASE_NAMES[getMoonPhaseIndex(selectedDay)]}
                  </p>
                  <p className="text-[9px] text-muted-foreground">{getMoonIllumination(selectedDay)}% illumination</p>
                </div>

                <div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Solar</p>
                  <p className="text-[10px] text-foreground">{getSolarCategory(selectedDay)}</p>
                </div>

                <div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Factorization</p>
                  <p className="text-[10px] text-foreground font-mono">{primeFactorization(selectedDay.getDate())}</p>
                  {isPrime(selectedDay.getDate()) && (
                    <p className="text-[9px] text-primary flex items-center gap-1"><Diamond size={8} /> Prime day</p>
                  )}
                </div>

                <div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Lattice Coord</p>
                  <p className="text-[10px] text-primary font-mono">{latticeCoord(selectedDay.getDate())}</p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-display text-[9px] tracking-wider uppercase text-muted-foreground">Select a day</h3>
              <p className="text-[9px] text-muted-foreground/60 mt-1">Click any day cell for details</p>
            </div>
          )}

          <div className="border-t border-border/50 pt-2">
            <h3 className="font-display text-[9px] tracking-wider uppercase text-primary mb-1.5">Upcoming Events</h3>
            <div className="space-y-1.5">
              {upcomingEvents.map((evt, i) => (
                <div key={i} className="p-1.5 rounded bg-card/50 border border-border/30">
                  <p className="text-[9px] text-foreground">{evt.title}</p>
                  <p className="text-[8px] text-muted-foreground">{format(evt.date, 'MMM d')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

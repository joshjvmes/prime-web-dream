// Moon phase calculation using synodic period
export const SYNODIC_PERIOD = 29.53058867;
export const KNOWN_NEW_MOON = new Date(2000, 0, 6, 18, 14);

export function getMoonPhase(date: Date): number {
  const diff = date.getTime() - KNOWN_NEW_MOON.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  return ((days % SYNODIC_PERIOD) + SYNODIC_PERIOD) % SYNODIC_PERIOD;
}

export function getMoonPhaseIndex(date: Date): number {
  const phase = getMoonPhase(date);
  return Math.floor(phase / (SYNODIC_PERIOD / 8)) % 8;
}

export const MOON_PHASE_NAMES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
];

export const MOON_PHASE_ICONS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];

export function getMoonIllumination(date: Date): number {
  const phase = getMoonPhase(date);
  const angle = (phase / SYNODIC_PERIOD) * Math.PI * 2;
  return Math.round((1 - Math.cos(angle)) / 2 * 100);
}

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

export function primeFactorization(n: number): string {
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

export function latticeCoord(day: number): string {
  const primes = [2, 3, 5, 7, 11, 13];
  const coords = primes.slice(0, 3).map(p => ((day * p) % 97));
  return `⟨${coords.join(',')}⟩`;
}

export function getSeasonTint(month: number): string {
  if (month >= 11 || month <= 1) return 'bg-blue-500/5';
  if (month >= 2 && month <= 4) return 'bg-green-500/5';
  if (month >= 5 && month <= 7) return 'bg-amber-500/5';
  return 'bg-orange-500/5';
}

export function getSolarCategory(date: Date): string {
  const doy = getDayOfYear(date);
  if (doy <= 80 || doy >= 355) return 'Low Arc';
  if (doy <= 172) return 'Rising Arc';
  if (doy <= 264) return 'High Arc';
  return 'Falling Arc';
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getSolarProgress(date: Date): { daysSinceSolstice: number; daysToNext: number; label: string } {
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

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  color: string;
  reminder_minutes: number | null;
  recurring: string | null;
  created_at: string;
}

export const EVENT_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
];

export const REMINDER_OPTIONS = [
  { value: null, label: 'None' },
  { value: 5, label: '5 min before' },
  { value: 15, label: '15 min before' },
  { value: 30, label: '30 min before' },
  { value: 60, label: '1 hour before' },
];

export const RECURRING_OPTIONS = [
  { value: null, label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

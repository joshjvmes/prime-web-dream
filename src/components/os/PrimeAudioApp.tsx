import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds
}

const TRACKS: Track[] = [
  { id: 't1', title: 'Harmonic Fold', artist: 'Lattice Core', duration: 234 },
  { id: 't2', title: 'Qutrit Resonance', artist: 'Q3 Engine', duration: 187 },
  { id: 't3', title: 'Geodesic Flow', artist: 'PrimeNet', duration: 312 },
  { id: 't4', title: 'Adinkra Pulse', artist: 'Storage Layer', duration: 198 },
  { id: 't5', title: 'Fibonacci Drift', artist: 'QK Scheduler', duration: 265 },
  { id: 't6', title: 'Dimensional Echo', artist: 'Energy System', duration: 221 },
  { id: 't7', title: 'Prime Spiral', artist: 'GeomC Compiler', duration: 178 },
  { id: 't8', title: 'Over-Unity Hum', artist: 'Energy System', duration: 290 },
];

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function PrimeAudioApp() {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(75);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const waveRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number>(0);
  const phaseRef = useRef(0);

  const track = TRACKS[currentTrack];

  // Progress auto-advance
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= track.duration) {
          if (repeat) return 0;
          nextTrack();
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [playing, track.duration, repeat]);

  const nextTrack = useCallback(() => {
    if (shuffle) {
      setCurrentTrack(Math.floor(Math.random() * TRACKS.length));
    } else {
      setCurrentTrack(prev => (prev + 1) % TRACKS.length);
    }
    setProgress(0);
  }, [shuffle]);

  const prevTrack = useCallback(() => {
    if (progress > 3) { setProgress(0); return; }
    setCurrentTrack(prev => (prev - 1 + TRACKS.length) % TRACKS.length);
    setProgress(0);
  }, [progress]);

  // Waveform animation
  useEffect(() => {
    const svg = waveRef.current;
    if (!svg) return;

    const draw = () => {
      if (playing) phaseRef.current += 0.05;
      const paths = svg.querySelectorAll('.wave-path');
      paths.forEach((path, i) => {
        const points: string[] = [];
        const amp = playing ? 15 + i * 8 : 2;
        const freq = 0.02 + i * 0.005;
        for (let x = 0; x <= 400; x += 2) {
          const y = 50 + Math.sin(x * freq + phaseRef.current + i * 1.5) * amp * (volume / 100);
          points.push(`${x},${y}`);
        }
        path.setAttribute('points', points.join(' '));
      });
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, volume]);

  return (
    <div className="flex h-full bg-background font-mono text-xs">
      {/* Playlist */}
      <div className="w-44 border-r border-border flex flex-col">
        <div className="p-2 border-b border-border">
          <span className="font-display text-[9px] tracking-wider uppercase text-primary">Playlist</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1">
            {TRACKS.map((t, i) => (
              <button
                key={t.id}
                onClick={() => { setCurrentTrack(i); setProgress(0); }}
                className={`w-full text-left px-2 py-1.5 rounded transition-colors ${currentTrack === i ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
              >
                <div className="text-[10px] truncate">{t.title}</div>
                <div className="text-[8px] text-muted-foreground/60">{t.artist} • {formatTime(t.duration)}</div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Waveform */}
        <div className="flex-1 flex items-center justify-center p-4">
          <svg ref={waveRef} viewBox="0 0 400 100" className="w-full h-full max-h-40">
            <polyline className="wave-path" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.6" points="" />
            <polyline className="wave-path" fill="none" stroke="hsl(270, 80%, 60%)" strokeWidth="1" opacity="0.4" points="" />
            <polyline className="wave-path" fill="none" stroke="hsl(45, 90%, 55%)" strokeWidth="0.8" opacity="0.3" points="" />
          </svg>
        </div>

        {/* Equalizer bars */}
        <div className="flex items-end justify-center gap-1 h-12 px-4">
          {Array.from({ length: 20 }, (_, i) => {
            const h = playing ? 8 + Math.random() * 30 * (volume / 100) : 4;
            return (
              <div
                key={i}
                className="w-2 bg-primary/60 rounded-t transition-all duration-150"
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>

        {/* Track info */}
        <div className="px-4 py-2 text-center">
          <div className="text-sm text-foreground font-display tracking-wide">{track.title}</div>
          <div className="text-[10px] text-muted-foreground">{track.artist}</div>
        </div>

        {/* Progress */}
        <div className="px-4 flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground w-8 text-right">{formatTime(progress)}</span>
          <Slider
            value={[progress]}
            onValueChange={v => setProgress(v[0])}
            max={track.duration}
            step={1}
            className="flex-1"
          />
          <span className="text-[9px] text-muted-foreground w-8">{formatTime(track.duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 py-3">
          <button onClick={() => setShuffle(s => !s)} className={`p-1 rounded ${shuffle ? 'text-primary' : 'text-muted-foreground'} hover:bg-muted`}>
            <Shuffle size={14} />
          </button>
          <button onClick={prevTrack} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted">
            <SkipBack size={16} />
          </button>
          <button
            onClick={() => setPlaying(p => !p)}
            className="p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/80"
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button onClick={nextTrack} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted">
            <SkipForward size={16} />
          </button>
          <button onClick={() => setRepeat(r => !r)} className={`p-1 rounded ${repeat ? 'text-primary' : 'text-muted-foreground'} hover:bg-muted`}>
            <Repeat size={14} />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <Volume2 size={12} className="text-muted-foreground" />
          <Slider value={[volume]} onValueChange={v => setVolume(v[0])} max={100} step={1} className="w-24" />
          <span className="text-[9px] text-muted-foreground w-6">{volume}%</span>
        </div>
      </div>
    </div>
  );
}

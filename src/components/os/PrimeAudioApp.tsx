import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2 } from 'lucide-react';
import { eventBus } from '@/hooks/useEventBus';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  buildSound: (ctx: AudioContext, dest: AudioNode) => { stop: () => void };
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// --- Synth builders ---

function harmonicFold(ctx: AudioContext, dest: AudioNode) {
  const gain = ctx.createGain();
  gain.gain.value = 0.15;
  gain.connect(dest);

  const oscs: OscillatorNode[] = [];
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.3;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 8;
  lfo.connect(lfoGain);
  lfo.start();

  [220, 330, 440, 550].forEach((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    lfoGain.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.value = 0.25 - i * 0.05;
    osc.connect(g).connect(gain);
    osc.start();
    oscs.push(osc);
  });

  return { stop: () => { oscs.forEach(o => { try { o.stop(); } catch {} }); try { lfo.stop(); } catch {} } };
}

function qutritResonance(ctx: AudioContext, dest: AudioNode) {
  const gain = ctx.createGain();
  gain.gain.value = 0.12;
  gain.connect(dest);
  const oscs: OscillatorNode[] = [];
  [261.63, 263.5, 259.8].forEach((f) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 5;
    osc.connect(filter).connect(gain);
    osc.start();
    oscs.push(osc);
  });
  return { stop: () => oscs.forEach(o => { try { o.stop(); } catch {} }) };
}

function geodesicFlow(ctx: AudioContext, dest: AudioNode) {
  const gain = ctx.createGain();
  gain.gain.value = 0.1;
  gain.connect(dest);

  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 400;
  filter.Q.value = 15;

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.1;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 600;
  lfo.connect(lfoG).connect(filter.frequency);
  lfo.start();

  noise.connect(filter).connect(gain);
  noise.start();
  return { stop: () => { try { noise.stop(); lfo.stop(); } catch {} } };
}

function adinkraPulse(ctx: AudioContext, dest: AudioNode) {
  const gain = ctx.createGain();
  gain.gain.value = 0.18;
  gain.connect(dest);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 55;
  const subGain = ctx.createGain();
  subGain.gain.value = 0.6;
  osc.connect(subGain).connect(gain);
  osc.start();

  // Rhythmic pulse via LFO on gain
  const lfo = ctx.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 2;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.5;
  lfo.connect(lfoG).connect(subGain.gain);
  lfo.start();

  const kick = ctx.createOscillator();
  kick.type = 'triangle';
  kick.frequency.value = 110;
  const kickG = ctx.createGain();
  kickG.gain.value = 0.3;
  kick.connect(kickG).connect(gain);
  kick.start();

  return { stop: () => { try { osc.stop(); lfo.stop(); kick.stop(); } catch {} } };
}

function fibonacciDrift(ctx: AudioContext, dest: AudioNode) {
  const gain = ctx.createGain();
  gain.gain.value = 0.1;
  gain.connect(dest);

  const fibs = [1, 1, 2, 3, 5, 8, 13, 21];
  const baseFreq = 220;
  const oscs: OscillatorNode[] = [];

  fibs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = baseFreq * (f / fibs[fibs.length - 1]) * 2;
    const g = ctx.createGain();
    g.gain.value = 0.08;
    // Slow phase modulation
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05 + i * 0.02;
    const lG = ctx.createGain();
    lG.gain.value = 0.08;
    lfo.connect(lG).connect(g.gain);
    lfo.start();
    osc.connect(g).connect(gain);
    osc.start();
    oscs.push(osc, lfo);
  });

  return { stop: () => oscs.forEach(o => { try { o.stop(); } catch {} }) };
}

function dimensionalEcho(ctx: AudioContext, dest: AudioNode) {
  const gain = ctx.createGain();
  gain.gain.value = 0.12;
  gain.connect(dest);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 330;

  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.4;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.5;

  osc.connect(gain);
  gain.connect(delay).connect(feedback).connect(gain);
  osc.start();

  // Slow pitch sweep
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.08;
  const lG = ctx.createGain();
  lG.gain.value = 30;
  lfo.connect(lG).connect(osc.frequency);
  lfo.start();

  return { stop: () => { try { osc.stop(); lfo.stop(); } catch {} } };
}

function primeSpiral(ctx: AudioContext, dest: AudioNode) {
  const gain = ctx.createGain();
  gain.gain.value = 0.08;
  gain.connect(dest);
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23];
  const oscs: OscillatorNode[] = [];
  primes.forEach((p) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55 * p;
    const g = ctx.createGain();
    g.gain.value = 0.04;
    osc.connect(g).connect(gain);
    osc.start();
    oscs.push(osc);
  });
  return { stop: () => oscs.forEach(o => { try { o.stop(); } catch {} }) };
}

function overUnityHum(ctx: AudioContext, dest: AudioNode) {
  const gain = ctx.createGain();
  gain.gain.value = 0.15;
  gain.connect(dest);

  const base = ctx.createOscillator();
  base.type = 'sawtooth';
  base.frequency.value = 60;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 200;
  filter.Q.value = 8;
  base.connect(filter).connect(gain);
  base.start();

  const harm = ctx.createOscillator();
  harm.type = 'sine';
  harm.frequency.value = 120;
  const hG = ctx.createGain();
  hG.gain.value = 0.3;
  harm.connect(hG).connect(gain);
  harm.start();

  const harm2 = ctx.createOscillator();
  harm2.type = 'sine';
  harm2.frequency.value = 180;
  const h2G = ctx.createGain();
  h2G.gain.value = 0.15;
  harm2.connect(h2G).connect(gain);
  harm2.start();

  return { stop: () => { try { base.stop(); harm.stop(); harm2.stop(); } catch {} } };
}

const TRACKS: Track[] = [
  { id: 't1', title: 'Harmonic Fold', artist: 'Lattice Core', duration: 234, buildSound: harmonicFold },
  { id: 't2', title: 'Qutrit Resonance', artist: 'Q3 Engine', duration: 187, buildSound: qutritResonance },
  { id: 't3', title: 'Geodesic Flow', artist: 'PrimeNet', duration: 312, buildSound: geodesicFlow },
  { id: 't4', title: 'Adinkra Pulse', artist: 'Storage Layer', duration: 198, buildSound: adinkraPulse },
  { id: 't5', title: 'Fibonacci Drift', artist: 'QK Scheduler', duration: 265, buildSound: fibonacciDrift },
  { id: 't6', title: 'Dimensional Echo', artist: 'Energy System', duration: 221, buildSound: dimensionalEcho },
  { id: 't7', title: 'Prime Spiral', artist: 'GeomC Compiler', duration: 178, buildSound: primeSpiral },
  { id: 't8', title: 'Over-Unity Hum', artist: 'Energy System', duration: 290, buildSound: overUnityHum },
];

export default function PrimeAudioApp() {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(75);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const activeSoundRef = useRef<{ stop: () => void } | null>(null);
  const waveRef = useRef<SVGSVGElement>(null);
  const eqRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const progressOffsetRef = useRef(0);

  const track = TRACKS[currentTrack];

  // Initialize AudioContext lazily
  const ensureAudioCtx = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = volume / 100;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    master.connect(analyser).connect(ctx.destination);
    audioCtxRef.current = ctx;
    masterGainRef.current = master;
    analyserRef.current = analyser;
    return ctx;
  }, []);

  // Volume
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  // Stop current sound
  const stopSound = useCallback(() => {
    if (activeSoundRef.current) {
      activeSoundRef.current.stop();
      activeSoundRef.current = null;
    }
  }, []);

  // Start sound for current track
  const startSound = useCallback((trackIdx: number, fromProgress = 0) => {
    stopSound();
    const ctx = ensureAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const t = TRACKS[trackIdx];
    const sound = t.buildSound(ctx, masterGainRef.current!);
    activeSoundRef.current = sound;
    startTimeRef.current = ctx.currentTime;
    progressOffsetRef.current = fromProgress;
  }, [ensureAudioCtx, stopSound]);

  // Play/pause
  const togglePlay = useCallback(() => {
    if (playing) {
      stopSound();
      setPlaying(false);
    } else {
      startSound(currentTrack, progress);
      setPlaying(true);
    }
  }, [playing, currentTrack, progress, startSound, stopSound]);

  // Progress timer
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const elapsed = progressOffsetRef.current + (ctx.currentTime - startTimeRef.current);
      if (elapsed >= track.duration) {
        if (repeat) {
          setProgress(0);
          startSound(currentTrack, 0);
        } else {
          // next track
          const next = shuffle
            ? Math.floor(Math.random() * TRACKS.length)
            : (currentTrack + 1) % TRACKS.length;
          setCurrentTrack(next);
          setProgress(0);
          startSound(next, 0);
        }
        return;
      }
      setProgress(elapsed);
    }, 250);
    return () => clearInterval(interval);
  }, [playing, track.duration, repeat, shuffle, currentTrack, startSound]);

  const nextTrack = useCallback(() => {
    const next = shuffle
      ? Math.floor(Math.random() * TRACKS.length)
      : (currentTrack + 1) % TRACKS.length;
    setCurrentTrack(next);
    setProgress(0);
    if (playing) startSound(next, 0);
  }, [shuffle, currentTrack, playing, startSound]);

  const prevTrack = useCallback(() => {
    if (progress > 3) {
      setProgress(0);
      if (playing) startSound(currentTrack, 0);
      return;
    }
    const prev = (currentTrack - 1 + TRACKS.length) % TRACKS.length;
    setCurrentTrack(prev);
    setProgress(0);
    if (playing) startSound(prev, 0);
  }, [progress, currentTrack, playing, startSound]);

  // Seek
  const handleSeek = useCallback((v: number[]) => {
    const pos = v[0];
    setProgress(pos);
    if (playing) startSound(currentTrack, pos);
  }, [playing, currentTrack, startSound]);

  // Waveform + EQ visualization from AnalyserNode
  useEffect(() => {
    const svg = waveRef.current;
    const eq = eqRef.current;
    const analyser = analyserRef.current;

    const timeBuf = analyser ? new Uint8Array(analyser.fftSize) : null;
    const freqBuf = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const draw = () => {
      // Waveform
      if (svg) {
        const paths = svg.querySelectorAll('.wave-path');
        if (analyser && timeBuf && playing) {
          analyser.getByteTimeDomainData(timeBuf);
          paths.forEach((path, pi) => {
            const points: string[] = [];
            const step = Math.floor(timeBuf.length / 200);
            for (let x = 0; x < 200; x++) {
              const val = timeBuf[x * step] / 128.0;
              const y = 50 + (val - 1) * (40 + pi * 15);
              points.push(`${x * 2},${y}`);
            }
            path.setAttribute('points', points.join(' '));
          });
        } else {
          paths.forEach((path) => {
            const points: string[] = [];
            for (let x = 0; x <= 400; x += 4) points.push(`${x},50`);
            path.setAttribute('points', points.join(' '));
          });
        }
      }

      // EQ bars
      if (eq) {
        const bars = eq.children;
        if (analyser && freqBuf && playing) {
          analyser.getByteFrequencyData(freqBuf);
          const binCount = freqBuf.length;
          const barCount = bars.length;
          for (let i = 0; i < barCount; i++) {
            const idx = Math.floor((i / barCount) * binCount * 0.6);
            const val = freqBuf[idx] / 255;
            (bars[i] as HTMLElement).style.height = `${4 + val * 36}px`;
          }
        } else {
          for (let i = 0; i < bars.length; i++) {
            (bars[i] as HTMLElement).style.height = '4px';
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSound();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  // EventBus listener for remote audio control (from Hyper AI)
  useEffect(() => {
    const handleAudioControl = (payload: any) => {
      if (!payload?.action) return;
      switch (payload.action) {
        case 'play':
          if (payload.track_name) {
            const idx = TRACKS.findIndex(t => t.title.toLowerCase().includes(String(payload.track_name).toLowerCase()));
            if (idx >= 0) {
              setCurrentTrack(idx);
              setProgress(0);
              startSound(idx, 0);
              setPlaying(true);
              return;
            }
          }
          if (!playing) {
            startSound(currentTrack, progress);
            setPlaying(true);
          }
          break;
        case 'pause':
          if (playing) {
            stopSound();
            setPlaying(false);
          }
          break;
        case 'skip':
          nextTrack();
          break;
        case 'volume':
          if (typeof payload.volume === 'number') {
            setVolume(Math.max(0, Math.min(100, payload.volume)));
          }
          break;
      }
    };
    eventBus.on('audio.control', handleAudioControl);
    return () => { eventBus.off('audio.control', handleAudioControl); };
  }, [playing, currentTrack, progress, startSound, stopSound, nextTrack]);

  // ROKCAT navigate listener
  useEffect(() => {
    const handler = (payload: any) => {
      if (payload?.app !== 'audio' || !payload?.context) return;
      const ctx = payload.context.toLowerCase();
      if (ctx === 'play' && !playing) { startSound(currentTrack, progress); setPlaying(true); }
      else if (ctx === 'pause' && playing) { stopSound(); setPlaying(false); }
      else if (ctx === 'next') nextTrack();
      else if (ctx === 'prev') prevTrack();
    };
    eventBus.on('app.navigate', handler);
    return () => eventBus.off('app.navigate', handler);
  }, [playing, currentTrack, progress, startSound, stopSound, nextTrack, prevTrack]);


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
                onClick={() => { setCurrentTrack(i); setProgress(0); if (playing) startSound(i, 0); }}
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
        <div ref={eqRef} className="flex items-end justify-center gap-1 h-12 px-4">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="w-2 bg-primary/60 rounded-t transition-all duration-75"
              style={{ height: '4px' }}
            />
          ))}
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
            onValueChange={handleSeek}
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
            onClick={togglePlay}
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

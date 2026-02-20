import { useEffect, useRef, useCallback } from 'react';
import { AppType } from '@/types/os';

export interface PulseSettings {
  enabled: boolean;
  frequency: 'calm' | 'normal' | 'active';
  aiTips: boolean;
}

const DEFAULT_PULSE_SETTINGS: PulseSettings = {
  enabled: true,
  frequency: 'normal',
  aiTips: true,
};

export function loadPulseSettings(): PulseSettings {
  try {
    const s = localStorage.getItem('prime-os-pulse-settings');
    return s ? { ...DEFAULT_PULSE_SETTINGS, ...JSON.parse(s) } : DEFAULT_PULSE_SETTINGS;
  } catch {
    return DEFAULT_PULSE_SETTINGS;
  }
}

export function savePulseSettings(settings: PulseSettings) {
  localStorage.setItem('prime-os-pulse-settings', JSON.stringify(settings));
}

const FREQUENCY_MS: Record<string, [number, number]> = {
  calm: [60000, 120000],
  normal: [30000, 75000],
  active: [15000, 40000],
};

// General ambient messages
const AMBIENT_MESSAGES = [
  { title: 'QK Scheduler', message: 'Fibonacci Waltz cycle complete — all qutrit states balanced' },
  { title: 'FoldMem', message: 'Auto-compact triggered — 0% fragmentation restored' },
  { title: 'PrimeNet', message: 'Geodesic route recalculated — 2 hops optimized' },
  { title: 'Energy', message: `COP adjusted to ${(3.0 + Math.random() * 0.5).toFixed(2)} — harvesting surplus` },
  { title: 'Lattice', message: 'Coherence optimized — 0.3% efficiency gain' },
  { title: 'Storage', message: 'Adinkra encoding pass — 75.2% compression maintained' },
  { title: 'Q3 Engine', message: `Idle inference batch — ${Math.floor(200 + Math.random() * 300)} samples processed` },
  { title: 'PrimeNet', message: `Node heartbeat: ${Math.floor(4 + Math.random() * 4)} peers, latency 0.${Math.floor(2 + Math.random() * 5)}ms` },
  { title: 'QK Scheduler', message: `Qutrit core #${Math.floor(100 + Math.random() * 549)} rebalanced to state |${Math.floor(Math.random() * 3)}⟩` },
  { title: 'Lattice Shield', message: 'Perimeter scan clean — 0 anomalies detected' },
  { title: 'GeomC', message: `Background fold optimization — ${Math.floor(10 + Math.random() * 30)} patterns improved` },
  { title: 'FoldMem', message: `11D address space: ${(98 + Math.random() * 2).toFixed(1)}% utilization` },
];

// Context-aware messages based on open apps
const CONTEXTUAL_MESSAGES: Record<string, { title: string; message: string }[]> = {
  terminal: [
    { title: 'Hyper', message: 'Shell session active — try `ask` to chat with me directly' },
  ],
  energy: [
    { title: 'Energy', message: `Dimensional coupling resonance at ${(91 + Math.random() * 8).toFixed(1)}%` },
  ],
  primenet: [
    { title: 'PrimeNet', message: `Mesh topology stable — ${Math.floor(5 + Math.random() * 5)} active geodesic routes` },
  ],
  monitor: [
    { title: 'Monitor', message: `System load: ${(0.2 + Math.random() * 0.4).toFixed(2)} — well within bounds` },
  ],
  q3inference: [
    { title: 'Q3 Engine', message: `Model weights warm — inference latency at ${Math.floor(400 + Math.random() * 150)}μs` },
  ],
};

// AI tip prompts for context-aware tips
const AI_TIP_CONTEXTS: Record<string, string> = {
  terminal: 'The user has the terminal open. Give a very short tip about a terminal command they might not know (q3 infer, geomc repl, primenet trace, psh debug, ask, etc).',
  energy: 'The user is viewing the energy monitor. Give a very short tip about COP readings or energy harvesting.',
  files: 'The user is browsing files. Give a very short tip about the prime file system or semantic navigation.',
  hypersphere: 'The user is using Hyper AI. Give a very short follow-up suggestion or capability they might not know about.',
  geomc: 'The user is using the GeomC compiler. Give a very short tip about geometric programming patterns.',
  '': 'The desktop is quiet with no apps open. Give a very short suggestion of something interesting to explore in PRIME OS.',
};

export function useSystemPulse(
  pushNotification: (title: string, message: string) => void,
  activeApps: AppType[] = [],
  isActive: boolean = true,
) {
  const lastAiTipRef = useRef<number>(0);
  const settingsRef = useRef<PulseSettings>(loadPulseSettings());

  // Reload settings periodically
  useEffect(() => {
    const id = setInterval(() => {
      settingsRef.current = loadPulseSettings();
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // Ambient pulse
  useEffect(() => {
    if (!isActive) return;

    const scheduleNext = () => {
      const settings = settingsRef.current;
      if (!settings.enabled) return;
      const [min, max] = FREQUENCY_MS[settings.frequency] || FREQUENCY_MS.normal;
      const delay = min + Math.random() * (max - min);

      return setTimeout(() => {
        // Pick contextual message if an app matches, otherwise general
        let pool = [...AMBIENT_MESSAGES];
        for (const app of activeApps) {
          if (CONTEXTUAL_MESSAGES[app]) {
            pool = [...pool, ...CONTEXTUAL_MESSAGES[app]];
          }
        }
        const msg = pool[Math.floor(Math.random() * pool.length)];
        pushNotification(msg.title, msg.message);
        timerRef.current = scheduleNext();
      }, delay);
    };

    const timerRef = { current: scheduleNext() };
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isActive, activeApps, pushNotification]);

  // AI Tips (rate-limited, uses hyper-chat)
  const fetchAiTip = useCallback(async () => {
    const settings = settingsRef.current;
    if (!settings.aiTips || !settings.enabled) return;
    const now = Date.now();
    if (now - lastAiTipRef.current < 180000) return; // 3 min cooldown
    lastAiTipRef.current = now;

    // Pick context
    const relevantApp = activeApps.find(a => AI_TIP_CONTEXTS[a]) || '';
    const contextPrompt = AI_TIP_CONTEXTS[relevantApp] || AI_TIP_CONTEXTS[''];

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/hyper-chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
          body: JSON.stringify({
            messages: [{ role: 'user', content: `You are sending a quick proactive tip notification to the user. ${contextPrompt} Reply with ONLY the tip text, max 15 words. No greeting, no prefix.` }],
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (!res.ok) return;

      // Parse SSE stream for the text
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
          try {
            const json = JSON.parse(line.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) text += delta;
          } catch {}
        }
      }
      if (text.trim()) {
        pushNotification('Hyper', text.trim());
      }
    } catch {}
  }, [activeApps, pushNotification]);

  // Schedule AI tips
  useEffect(() => {
    if (!isActive) return;
    // First tip after 2-4 min, then every 3-5 min
    const firstDelay = 120000 + Math.random() * 120000;
    const timer = setTimeout(() => {
      fetchAiTip();
      const interval = setInterval(fetchAiTip, 180000 + Math.random() * 120000);
      return () => clearInterval(interval);
    }, firstDelay);
    return () => clearTimeout(timer);
  }, [isActive, fetchAiTip]);
}

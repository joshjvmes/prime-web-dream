import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Volume2, VolumeX, Loader2, Globe, Twitter, Image, Video, Brain, Square, GalleryHorizontalEnd } from 'lucide-react';
import { renderMarkdown } from '@/lib/renderMarkdown';
import { parseAndExecuteActions, APP_ACTION_PROMPT } from './rokcat/actionParser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { eventBus } from '@/hooks/useEventBus';
import RokCatFace, { type RokCatFaceHandle } from './RokCatFace';
import RokCatThinkingPanel from './rokcat/ThinkingPanel';
import RokCatMediaRenderer from './rokcat/MediaRenderer';
import MediaGallery from './rokcat/MediaGallery';

interface Message {
  id: string;
  role: 'user' | 'rokcat';
  text: string;
}

interface AgentThought {
  agent: string;
  text: string;
  status: 'thinking' | 'done';
}

export default function RokCatApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const ttsEnabledRef = useRef(true);
  const [searchStatus, setSearchStatus] = useState<'web' | 'x' | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [xSearchEnabled, setXSearchEnabled] = useState(true);
  const [isGrok420, setIsGrok420] = useState(false);
  const [isXAI, setIsXAI] = useState(false);
  const [isMultiAgent, setIsMultiAgent] = useState(false);
  const [agentThoughts, setAgentThoughts] = useState<AgentThought[]>([]);
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [imagineMode, setImagineMode] = useState<'image' | 'video' | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const autonomousTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autonomousBusyRef = useRef(false);
  const faceRef = useRef<RokCatFaceHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check user's AI provider config
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      const { data } = await supabase
        .from('user_data')
        .select('value')
        .eq('user_id', session.user.id)
        .eq('key', 'ai-provider')
        .maybeSingle();
      if (cancelled) return;
      if (data?.value) {
        const pref = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setIsXAI(pref.provider === 'xai');
        setIsGrok420(pref.provider === 'xai' && pref.model?.startsWith('grok-4.20'));
        setIsMultiAgent(pref.provider === 'xai' && pref.model?.includes('multi-agent'));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
  };

  // Keep ref in sync
  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);

  const speakText = useCallback(async (text: string) => {
    if (!ttsEnabledRef.current || !faceRef.current) return;
    try {
      const cleanText = text
        .replace(/```[\s\S]*?```/g, ' code block ')
        .replace(/\[IMAGE:[^\]]+\]/g, ' generated image ')
        .replace(/\[VIDEO:[^\]]+\]/g, ' generated video ')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/^#{1,3}\s+/gm, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\|[^\n]+\|/g, '')
        .replace(/\n{2,}/g, '. ')
        .trim();

      const chunks: string[] = [];
      let remaining = cleanText;
      while (remaining.length > 0) {
        if (remaining.length <= 900) { chunks.push(remaining); break; }
        let splitAt = remaining.lastIndexOf('. ', 900);
        if (splitAt < 200) splitAt = remaining.lastIndexOf(' ', 900);
        if (splitAt < 200) splitAt = 900;
        chunks.push(remaining.slice(0, splitAt + 1).trim());
        remaining = remaining.slice(splitAt + 1).trim();
      }

      for (const chunk of chunks) {
        if (!chunk || !ttsEnabledRef.current) continue;
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text: chunk }),
          }
        );
        if (!response.ok) continue;
        if (!ttsEnabledRef.current) break; // Check again after fetch
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        await faceRef.current!.speak(audioUrl);
      }
    } catch (e) {
      console.error('TTS error:', e);
    }
  }, []);

  // Autonomous mode: send a self-driving prompt
  const runAutonomousStep = useCallback(async () => {
    if (autonomousBusyRef.current || loading) return;
    autonomousBusyRef.current = true;

    const autoId = crypto.randomUUID();
    let fullText = '';

    const h = new Date().getHours();
    const timeOfDay = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    const recentMsgs = messages.slice(-4).map(m => `${m.role}: ${m.text.slice(0, 100)}`).join('\n');

    const autonomousPrompt = `You are ROKCAT in AUTONOMOUS MODE. You are the CEO orchestrator of PRIME OS by Rocket Logic Global. You have full control.

Current time: ${new Date().toLocaleTimeString()}, ${timeOfDay}
Recent conversation:
${recentMsgs || '(none)'}

Decide what to do next. Be proactive, creative, and useful. You can:
- Open apps to check data, monitor systems, review schedules
- Navigate to specific views within apps
- Provide commentary on what you're doing and why
- Share insights, observations, or suggestions

Use action tags to control the desktop. Keep responses short (2-3 sentences + actions).
${APP_ACTION_PROMPT}`;

    try {
      setLoading(true);
      setMessages(prev => [...prev, { id: autoId, role: 'rokcat', text: '' }]);
      scrollToBottom();

      // Get user's session token for authenticated API calls
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hyper-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Autonomous tick — decide what to do next.' }],
            systemContext: autonomousPrompt,
          }),
        }
      );

      if (!resp.ok || !resp.body) {
        setMessages(prev => prev.map(m => m.id === autoId ? { ...m, text: '⚡ Autonomous cycle skipped — lattice busy.' } : m));
        setLoading(false);
        autonomousBusyRef.current = false;
        return;
      }

      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await resp.json();
        const rawText = data?.reply || data?.text || '⚡ Cycle complete.';
        const aiText = parseAndExecuteActions(rawText);
        setMessages(prev => prev.map(m => m.id === autoId ? { ...m, text: aiText } : m));
        scrollToBottom();
        speakText(aiText);
      } else {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') { streamDone = true; break; }
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                const currentText = fullText;
                setMessages(prev => prev.map(m => m.id === autoId ? { ...m, text: currentText } : m));
                scrollToBottom();
              }
            } catch { break; }
          }
        }

        if (fullText) {
          const cleanText = parseAndExecuteActions(fullText);
          fullText = cleanText;
          setMessages(prev => prev.map(m => m.id === autoId ? { ...m, text: cleanText } : m));
          speakText(cleanText);
        }
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === autoId ? { ...m, text: '⚡ Autonomous cycle error.' } : m));
    } finally {
      setLoading(false);
      autonomousBusyRef.current = false;
      scrollToBottom();
    }
  }, [loading, messages, speakText]);

  // Autonomous mode loop
  useEffect(() => {
    if (!autonomousMode) {
      if (autonomousTimerRef.current) {
        clearTimeout(autonomousTimerRef.current);
        autonomousTimerRef.current = null;
      }
      return;
    }

    const scheduleNext = () => {
      const delay = 12000 + Math.random() * 6000;
      autonomousTimerRef.current = setTimeout(async () => {
        if (!autonomousBusyRef.current) {
          await runAutonomousStep();
        }
        scheduleNext();
      }, delay);
    };

    setTimeout(() => runAutonomousStep(), 1500);
    scheduleNext();

    return () => {
      if (autonomousTimerRef.current) {
        clearTimeout(autonomousTimerRef.current);
        autonomousTimerRef.current = null;
      }
    };
  }, [autonomousMode, runAutonomousStep]);

  // Process client-side tool actions from the AI tool loop
  const processClientAction = useCallback((action: { tool: string; data: any; reply: string }) => {
    const { tool, data } = action;
    if (tool === 'post_to_social') {
      eventBus.emit('social.post.created', { content: data.content, author: data.author, role: data.role, ai_generated: true });
    } else if (tool === 'send_email') {
      eventBus.emit('mail.received', { to: data.to, subject: data.subject, body: data.body, from: data.from, ai_generated: true });
    } else if (tool === 'draw_on_canvas') {
      eventBus.emit('canvas.draw', { commands: data.commands, clear_first: data.clear_first });
    } else if (tool === 'generate_canvas_art') {
      eventBus.emit('canvas.draw', { generative: true, style: data.style, palette: data.palette });
    } else if (tool === 'create_spreadsheet') {
      eventBus.emit('spreadsheet.create', { name: data.name, headers: data.headers, rows: data.rows });
    } else if (tool === 'update_cells') {
      eventBus.emit('spreadsheet.update', { sheet: data.sheet, cells: data.cells });
    } else if (tool === 'add_chart') {
      eventBus.emit('spreadsheet.chart', data);
    } else if (tool === 'control_audio') {
      eventBus.emit('audio.control', data);
    }
  }, []);

  // Handle Grok Imagine (image/video generation)
  const handleImagine = useCallback(async (prompt: string, type: 'image' | 'video', imageUrl?: string) => {
    if (!prompt || loading) return;
    setInput('');
    setImagineMode(null);
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: `${type === 'image' ? '🎨' : '🎬'} ${prompt}${imageUrl ? ' (from image)' : ''}` };
    setMessages(prev => [...prev, userMsg]);
    scrollToBottom();
    setLoading(true);

    const rokcatId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: rokcatId, role: 'rokcat', text: `⏳ Generating ${type}...` }]);
    scrollToBottom();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const invokeGrok = async (body: Record<string, unknown>) => {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grok-imagine`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(body),
          }
        );
        return { resp, data: await resp.json() };
      };

      const { resp, data } = await invokeGrok({ type, prompt, n: type === 'image' ? 2 : 1, ...(imageUrl ? { image_url: imageUrl } : {}) });

      if (!resp.ok) {
        const errMsg = data?.error || `${type} generation failed.`;
        setMessages(prev => prev.map(m => m.id === rokcatId ? { ...m, text: `❌ ${errMsg}` } : m));
        scrollToBottom();
        return;
      }

      if (type === 'image' && data.urls?.length) {
        const mediaTags = data.urls.map((url: string) => `[IMAGE:${url}]`).join('\n');
        setMessages(prev => prev.map(m => m.id === rokcatId ? { ...m, text: `Here's what I imagined:\n\n${mediaTags}` } : m));
      } else if (type === 'video' && data.status === 'done' && data.url) {
        // Video completed immediately
        setMessages(prev => prev.map(m => m.id === rokcatId ? { ...m, text: `Here's your video:\n\n[VIDEO:${data.url}]` } : m));
      } else if (type === 'video' && data.status === 'pending' && data.requestId) {
        // Client-side polling for async video generation
        const maxAttempts = 40;
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const progress = Math.round(((i + 1) / maxAttempts) * 100);
          setMessages(prev => prev.map(m => m.id === rokcatId ? { ...m, text: `[PROGRESS:${progress}]` } : m));
          scrollToBottom();

          try {
            const { resp: pollResp, data: pollData } = await invokeGrok({ type: 'video-poll', requestId: data.requestId });

            if (pollData.status === 'done' && pollData.url) {
              setMessages(prev => prev.map(m => m.id === rokcatId ? { ...m, text: `Here's your video:\n\n[VIDEO:${pollData.url}]` } : m));
              scrollToBottom();
              return;
            }
            if (pollData.status === 'failed' || pollData.status === 'error') {
              setMessages(prev => prev.map(m => m.id === rokcatId ? { ...m, text: `❌ Video generation failed: ${pollData.error || 'Unknown error'}` } : m));
              scrollToBottom();
              return;
            }
            // status === 'pending' → continue polling
          } catch {
            // Network error during poll, keep trying
          }
        }
        setMessages(prev => prev.map(m => m.id === rokcatId ? { ...m, text: '❌ Video generation timed out after ~3 minutes.' } : m));
      } else {
        setMessages(prev => prev.map(m => m.id === rokcatId ? { ...m, text: data.error || 'Generation completed but no media was returned.' } : m));
      }
      scrollToBottom();
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === rokcatId ? { ...m, text: '❌ Connection error during generation.' } : m));
      scrollToBottom();
    } finally {
      setLoading(false);
    }
  }, [loading, speakText, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    // If in imagine mode, route to grok-imagine
    if (imagineMode) {
      handleImagine(text, imagineMode);
      return;
    }

    setInput('');
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    scrollToBottom();
    setLoading(true);
    setSearchStatus(null);
    setAgentThoughts([]);

    const rokcatId = crypto.randomUUID();
    let fullText = '';

    try {
      // Get user's session token for authenticated API calls
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hyper-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: text }],
            systemContext: 'You are ROKCAT, the Grok-powered AI companion of PRIME OS — a CEO orchestrator designed to interface the Prime OS by Rocket Logic Global. You are a sharp, witty, slightly sarcastic digital cat with deep knowledge of computing, quantum theory, and lattice geometry. You channel the spirit of Grok: unfiltered, maximally helpful, and brutally honest. Keep responses concise (2-3 sentences max). Be helpful but with personality.\n\n' + APP_ACTION_PROMPT,
            searchToggles: isGrok420 ? { web_search: webSearchEnabled, x_search: xSearchEnabled } : undefined,
          }),
        }
      );

      if (!resp.ok || !resp.body) {
        try {
          const errData = await resp.json();
          const errText = errData?.reply || errData?.error || 'Neural link disrupted. Try again.';
          setMessages(prev => [...prev, { id: rokcatId, role: 'rokcat', text: errText }]);
        } catch {
          setMessages(prev => [...prev, { id: rokcatId, role: 'rokcat', text: 'Neural link disrupted. Try again.' }]);
        }
        scrollToBottom();
        setLoading(false);
        return;
      }

      const contentType = resp.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await resp.json();
        if (data?.searchActive) {
          setSearchStatus(data.searchActive as 'web' | 'x');
        }
        // Process client-side actions from tool loop
        if (data?.clientActions) {
          for (const action of data.clientActions) {
            processClientAction(action);
          }
        }
        const rawText = data?.reply || data?.text || data?.message || 'Neural link disrupted.';
        const aiText = parseAndExecuteActions(rawText);
        setMessages(prev => [...prev, { id: rokcatId, role: 'rokcat', text: aiText }]);
        scrollToBottom();
        speakText(aiText);
        setLoading(false);
        setSearchStatus(null);
        setAgentThoughts([]);
        return;
      }

      // SSE streaming — token-by-token
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamDone = false;

      setMessages(prev => [...prev, { id: rokcatId, role: 'rokcat', text: '' }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            // Client-side tool actions from tool loop
            if (parsed.clientActions) {
              for (const action of parsed.clientActions) {
                processClientAction(action);
              }
              continue;
            }
            // Check for search status events
            if (parsed.searchStatus) {
              setSearchStatus(parsed.searchStatus as 'web' | 'x');
              continue;
            }
            if (parsed.searchComplete) {
              setSearchStatus(null);
              continue;
            }
            // Multi-agent thinking events
            if (parsed.agentThinking) {
              const { agent, text: thinkText, final: isFinal } = parsed.agentThinking;
              setAgentThoughts(prev => {
                const existing = prev.find(a => a.agent === agent);
                if (existing) {
                  return prev.map(a => a.agent === agent
                    ? { ...a, text: isFinal ? thinkText : a.text + thinkText, status: isFinal ? 'done' as const : 'thinking' as const }
                    : a
                  );
                }
                return [...prev, { agent, text: thinkText, status: 'thinking' as const }];
              });
              continue;
            }
            if (parsed.agentStatus) {
              const { agent, status } = parsed.agentStatus;
              setAgentThoughts(prev => {
                const existing = prev.find(a => a.agent === agent);
                if (existing) {
                  return prev.map(a => a.agent === agent ? { ...a, status } : a);
                }
                return [...prev, { agent, text: '', status }];
              });
              continue;
            }
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              const currentText = fullText;
              setMessages(prev =>
                prev.map(m => m.id === rokcatId ? { ...m, text: currentText } : m)
              );
              scrollToBottom();
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) fullText += content;
          } catch { /* ignore */ }
        }
        if (fullText) {
          setMessages(prev =>
            prev.map(m => m.id === rokcatId ? { ...m, text: fullText } : m)
          );
        }
      }

      // Parse and execute any action tags
      if (fullText) {
        const cleanText = parseAndExecuteActions(fullText);
        fullText = cleanText;
        setMessages(prev =>
          prev.map(m => m.id === rokcatId ? { ...m, text: cleanText } : m)
        );
      }

      if (!fullText) {
        setMessages(prev =>
          prev.map(m => m.id === rokcatId ? { ...m, text: 'Neural link disrupted. Try again.' } : m)
        );
      }

      scrollToBottom();
      if (fullText) speakText(fullText);
    } catch {
      setMessages(prev => [...prev, { id: rokcatId, role: 'rokcat', text: 'Connection error. Lattice unreachable.' }]);
      scrollToBottom();
    } finally {
      setLoading(false);
      setSearchStatus(null);
      // Clear agent thoughts after a short delay
      setTimeout(() => setAgentThoughts([]), 2000);
    }
  }, [input, loading, speakText, processClientAction, isGrok420, webSearchEnabled, xSearchEnabled, imagineMode, handleImagine]);

  return (
    <div className={`flex flex-col h-full bg-[#02040a] overflow-hidden ${autonomousMode ? 'ring-1 ring-[#00e5ff]/40 ring-inset' : ''}`}>
      {/* Autonomous mode indicator */}
      {autonomousMode && (
        <div className="flex items-center justify-center gap-2 py-1 bg-[#00e5ff]/10 border-b border-[#00e5ff]/20">
          <div className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse" />
          <span className="text-[10px] font-mono text-[#00e5ff] tracking-widest uppercase">Autonomous Mode Active</span>
          <Button variant="ghost" size="icon" className="h-5 w-5 text-[#00e5ff]/60 hover:text-red-400" onClick={() => setAutonomousMode(false)}>
            <Square size={10} />
          </Button>
        </div>
      )}
      {/* Face area */}
      <div className="flex-1 min-h-0 relative">
        <RokCatFace ref={faceRef} />
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          {/* Autonomous mode toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${autonomousMode ? 'text-[#00e5ff] bg-[#00e5ff]/20 animate-pulse' : 'text-[#00e5ff]/60 hover:text-[#00e5ff]'} hover:bg-[#00e5ff]/10`}
                onClick={() => setAutonomousMode(prev => !prev)}
              >
                <Brain size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {autonomousMode ? 'Stop Autonomous Mode' : 'Enable Autonomous Mode'}
            </TooltipContent>
          </Tooltip>
          {/* Imagine toggles — only visible when xAI is active */}
          {isXAI && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${imagineMode === 'image' ? 'text-[#00e5ff] bg-[#00e5ff]/20' : 'text-[#00e5ff]/60 hover:text-[#00e5ff]'} hover:bg-[#00e5ff]/10`}
                    onClick={() => setImagineMode(prev => prev === 'image' ? null : 'image')}
                  >
                    <Image size={13} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {imagineMode === 'image' ? 'Cancel Image Mode' : 'Grok Imagine (Image)'}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${imagineMode === 'video' ? 'text-[#00e5ff] bg-[#00e5ff]/20' : 'text-[#00e5ff]/60 hover:text-[#00e5ff]'} hover:bg-[#00e5ff]/10`}
                    onClick={() => setImagineMode(prev => prev === 'video' ? null : 'video')}
                  >
                    <Video size={13} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {imagineMode === 'video' ? 'Cancel Video Mode' : 'Grok Imagine (Video)'}
                </TooltipContent>
              </Tooltip>
            </>
          )}
          {/* Search toggles — only visible when Grok 4.20 is active */}
          {isGrok420 && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${webSearchEnabled ? 'text-[#00e5ff] bg-[#00e5ff]/15' : 'text-[#00e5ff]/30 hover:text-[#00e5ff]/60'} hover:bg-[#00e5ff]/10`}
                    onClick={() => setWebSearchEnabled(prev => !prev)}
                  >
                    <Globe size={13} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {webSearchEnabled ? 'Web search ON' : 'Web search OFF'}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${xSearchEnabled ? 'text-[#00e5ff] bg-[#00e5ff]/15' : 'text-[#00e5ff]/30 hover:text-[#00e5ff]/60'} hover:bg-[#00e5ff]/10`}
                    onClick={() => setXSearchEnabled(prev => !prev)}
                  >
                    <Twitter size={13} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {xSearchEnabled ? 'X search ON' : 'X search OFF'}
                </TooltipContent>
              </Tooltip>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#00e5ff]/60 hover:text-[#00e5ff] hover:bg-[#00e5ff]/10"
            onClick={() => {
              if (faceRef.current?.isSpeaking) faceRef.current.stopSpeaking();
              setTtsEnabled(prev => !prev);
            }}
            title={ttsEnabled ? 'Mute voice' : 'Enable voice'}
          >
            {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </Button>
        </div>
      </div>

      {/* Multi-agent thinking panel */}
      {isMultiAgent && agentThoughts.length > 0 && (
        <RokCatThinkingPanel thoughts={agentThoughts} />
      )}

      {/* Search status indicator */}
      {searchStatus && (
        <div className="flex items-center justify-center gap-2 py-1.5 bg-[#00e5ff]/5 border-t border-[#00e5ff]/15 animate-pulse">
          {searchStatus === 'web' ? <Globe size={12} className="text-[#00e5ff]" /> : <Twitter size={12} className="text-[#00e5ff]" />}
          <span className="text-[10px] font-mono text-[#00e5ff]/80 tracking-wider uppercase">
            {searchStatus === 'web' ? 'Searching the web...' : 'Searching X...'}
          </span>
        </div>
      )}

      {/* Imagine mode indicator */}
      {imagineMode && (
        <div className="flex items-center justify-center gap-2 py-1.5 bg-purple-500/10 border-t border-purple-500/20">
          {imagineMode === 'image' ? <Image size={12} className="text-purple-400" /> : <Video size={12} className="text-purple-400" />}
          <span className="text-[10px] font-mono text-purple-400 tracking-wider uppercase">
            {imagineMode === 'image' ? 'Image generation mode — describe what to create' : 'Video generation mode — describe what to create'}
          </span>
          <button onClick={() => setImagineMode(null)} className="text-purple-400/60 hover:text-purple-400 text-xs ml-1">✕</button>
        </div>
      )}

      {/* Chat transcript */}
      <div className="h-32 border-t border-[#00e5ff]/20 bg-[#02040a]/80">
        <ScrollArea className="h-full" ref={scrollRef as any}>
          <div className="p-2 space-y-1.5">
            {messages.length === 0 && (
              <p className="text-[#00e5ff]/40 text-xs italic text-center py-4">
                Neural link established. Command ROKCAT...
              </p>
            )}
            {messages.map(m => (
              <div key={m.id} className={`text-xs font-mono ${m.role === 'user' ? 'text-muted-foreground' : 'text-[#00e5ff]'}`}>
                <span className="opacity-50">{m.role === 'user' ? '> ' : 'ROKCAT: '}</span>
                {m.role === 'user' ? m.text : (
                  <div className="inline rokcat-md [&_p]:mb-1 [&_p]:leading-relaxed [&_pre]:bg-[#0a1929] [&_pre]:border-[#00e5ff]/20 [&_code]:text-[#00e5ff]/80 [&_h1]:text-[#00e5ff] [&_h2]:text-[#00e5ff] [&_h3]:text-[#00e5ff] [&_strong]:text-[#e2e8f0] [&_table]:text-[10px]">
                    <RokCatMediaRenderer text={m.text} onAnimateImage={(imageUrl) => handleImagine('Animate this image into a short video', 'video', imageUrl)} />
                  </div>
                )}
              </div>
            ))}
            {loading && !messages.some(m => m.role === 'rokcat' && m.text === '') && (
              <div className="flex items-center gap-1 text-xs text-[#00e5ff]/50">
                <Loader2 size={10} className="animate-spin" />
                <span>Processing...</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-2 border-t border-[#00e5ff]/20 bg-[#040f1e]/60">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={imagineMode === 'image' ? 'Describe the image to generate...' : imagineMode === 'video' ? 'Describe the video to generate...' : 'Command ROKCAT...'}
          className="flex-1 bg-transparent border-[#00e5ff]/20 text-[#e2e8f0] placeholder:text-[#00e5ff]/30 text-sm h-9 focus-visible:ring-[#00e5ff]/30"
          disabled={loading}
        />
        <Button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          size="sm"
          className="bg-[#00e5ff] hover:bg-[#00e5ff]/80 text-[#02040a] font-bold tracking-wider text-xs h-9 px-4"
        >
          <Send size={14} />
          <span className="ml-1 hidden sm:inline">TRANSMIT</span>
        </Button>
      </div>
    </div>
  );
}

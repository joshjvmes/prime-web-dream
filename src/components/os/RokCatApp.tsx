import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Volume2, VolumeX, Loader2, Globe, Twitter } from 'lucide-react';
import { renderMarkdown } from '@/lib/renderMarkdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import RokCatFace, { type RokCatFaceHandle } from './RokCatFace';

interface Message {
  id: string;
  role: 'user' | 'rokcat';
  text: string;
}

export default function RokCatApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [searchStatus, setSearchStatus] = useState<'web' | 'x' | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [xSearchEnabled, setXSearchEnabled] = useState(true);
  const [isGrok420, setIsGrok420] = useState(false);
  const faceRef = useRef<RokCatFaceHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check if user has a Grok 4.20 model selected
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
        setIsGrok420(pref.provider === 'xai' && pref.model?.startsWith('grok-4.20'));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
  };

  const speakText = useCallback(async (text: string) => {
    if (!ttsEnabled || !faceRef.current) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: text.slice(0, 500) }),
        }
      );
      if (!response.ok) return;
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      await faceRef.current.speak(audioUrl);
    } catch (e) {
      console.error('TTS error:', e);
    }
  }, [ttsEnabled]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    scrollToBottom();
    setLoading(true);
    setSearchStatus(null);

    const rokcatId = crypto.randomUUID();
    let fullText = '';

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hyper-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: text }],
            systemContext: 'You are ROKCAT, the Grok-powered AI companion of PRIME OS — a CEO orchestrator designed to interface the Prime OS by Rocket Logic Global. You are a sharp, witty, slightly sarcastic digital cat with deep knowledge of computing, quantum theory, and lattice geometry. You channel the spirit of Grok: unfiltered, maximally helpful, and brutally honest. Keep responses concise (2-3 sentences max). Be helpful but with personality.',
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
        // Check if this is a search indicator
        if (data?.searchActive) {
          setSearchStatus(data.searchActive as 'web' | 'x');
        }
        const aiText = data?.reply || data?.text || data?.message || 'Neural link disrupted.';
        setMessages(prev => [...prev, { id: rokcatId, role: 'rokcat', text: aiText }]);
        scrollToBottom();
        speakText(aiText);
        setLoading(false);
        setSearchStatus(null);
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
            // Check for search status events
            if (parsed.searchStatus) {
              setSearchStatus(parsed.searchStatus as 'web' | 'x');
              continue;
            }
            if (parsed.searchComplete) {
              setSearchStatus(null);
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
    }
  }, [input, loading, speakText, isGrok420, webSearchEnabled, xSearchEnabled]);

  return (
    <div className="flex flex-col h-full bg-[#02040a] overflow-hidden">
      {/* Face area */}
      <div className="flex-1 min-h-0 relative">
        <RokCatFace ref={faceRef} />
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
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

      {/* Search status indicator */}
      {searchStatus && (
        <div className="flex items-center justify-center gap-2 py-1.5 bg-[#00e5ff]/5 border-t border-[#00e5ff]/15 animate-pulse">
          {searchStatus === 'web' ? <Globe size={12} className="text-[#00e5ff]" /> : <Twitter size={12} className="text-[#00e5ff]" />}
          <span className="text-[10px] font-mono text-[#00e5ff]/80 tracking-wider uppercase">
            {searchStatus === 'web' ? 'Searching the web...' : 'Searching X...'}
          </span>
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
                    {renderMarkdown(m.text)}
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
          placeholder="Command ROKCAT..."
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

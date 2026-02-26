import { useState, useRef, useCallback } from 'react';
import { Send, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const faceRef = useRef<RokCatFaceHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

    try {
      const res = await supabase.functions.invoke('hyper-chat', {
        body: {
          messages: [{ role: 'user', content: text }],
          systemContext: 'You are ROKCAT, the AI companion of PRIME OS. You are a sharp, witty, slightly sarcastic digital cat with deep knowledge of computing, quantum theory, and lattice geometry. Keep responses concise (2-3 sentences max). Be helpful but with personality.',
        },
      });

      const aiText = res.data?.text || res.data?.message || 'Neural link disrupted. Try again.';
      const rokcatMsg: Message = { id: crypto.randomUUID(), role: 'rokcat', text: aiText };
      setMessages(prev => [...prev, rokcatMsg]);
      scrollToBottom();
      speakText(aiText);
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'rokcat', text: 'Connection error. Lattice unreachable.' }]);
      scrollToBottom();
    } finally {
      setLoading(false);
    }
  }, [input, loading, speakText]);

  return (
    <div className="flex flex-col h-full bg-[#02040a] overflow-hidden">
      {/* Face area */}
      <div className="flex-1 min-h-0 relative">
        <RokCatFace ref={faceRef} />
        <div className="absolute top-2 right-2 z-10">
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
                {m.text}
              </div>
            ))}
            {loading && (
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

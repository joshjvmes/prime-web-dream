import { useState, useEffect, useRef } from 'react';
import { eventBus } from '@/hooks/useEventBus';
import { Video, VideoOff, Mic, MicOff, MonitorUp, Phone, PhoneOff, MessageSquare, Users, Copy, X } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
}

const PARTICIPANTS: Participant[] = [
  { id: 'p1', name: 'Node Alpha', isMuted: false, isVideoOn: true, isSpeaking: true, isScreenSharing: false },
  { id: 'p2', name: 'Sector 7 Admin', isMuted: true, isVideoOn: true, isSpeaking: false, isScreenSharing: false },
  { id: 'p3', name: 'Lattice Core', isMuted: false, isVideoOn: false, isSpeaking: false, isScreenSharing: false },
  { id: 'p4', name: 'Fold Operator', isMuted: false, isVideoOn: true, isSpeaking: false, isScreenSharing: false },
];

const CHAT_MESSAGES = [
  { from: 'Node Alpha', text: 'Lattice expansion looking good', time: '14:22' },
  { from: 'Sector 7 Admin', text: 'COP readings are stable at 3.4', time: '14:23' },
  { from: 'Lattice Core', text: 'Geodesic routes optimized', time: '14:25' },
];

function AvatarSVG({ speaking, size = 80 }: { speaking: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="30" r="16" fill="hsl(var(--muted))" stroke="hsl(var(--primary))" strokeWidth={speaking ? 2 : 1} />
      <circle cx="40" cy="30" r="6" fill="hsl(var(--primary))" opacity={0.5} />
      <path d="M20 70 Q20 50 40 45 Q60 50 60 70" fill="hsl(var(--muted))" stroke="hsl(var(--primary))" strokeWidth={1} />
      {speaking && (
        <>
          <circle cx="40" cy="30" r="22" fill="none" stroke="hsl(var(--primary))" strokeWidth={1} opacity={0.4}>
            <animate attributeName="r" values="22;28;22" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="40" cy="30" r="26" fill="none" stroke="hsl(var(--primary))" strokeWidth={0.5} opacity={0.2}>
            <animate attributeName="r" values="26;34;26" dur="1.5s" repeatCount="indefinite" begin="0.3s" />
            <animate attributeName="opacity" values="0.2;0;0.2" dur="1.5s" repeatCount="indefinite" begin="0.3s" />
          </circle>
        </>
      )}
    </svg>
  );
}

export default function PrimeLinkApp() {
  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [callTime, setCallTime] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState(CHAT_MESSAGES);
  const meetingCode = 'PRIME-7X3K-9F2M';

  useEffect(() => {
    if (!inCall) return;
    const id = setInterval(() => setCallTime(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [inCall]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (!inCall) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background text-foreground font-mono text-xs gap-4 p-6">
        <Video size={32} className="text-primary" />
        <span className="font-display text-sm tracking-wider text-primary">PRIMELINK</span>
        <div className="w-32 h-32 rounded-lg bg-muted border border-border flex items-center justify-center">
          <AvatarSVG speaking={false} />
        </div>
        <div className="flex gap-3">
          <button onClick={() => setMicOn(!micOn)} className={`p-2 rounded-full border ${micOn ? 'border-primary text-primary' : 'border-destructive text-destructive bg-destructive/10'}`}>
            {micOn ? <Mic size={16} /> : <MicOff size={16} />}
          </button>
          <button onClick={() => setCamOn(!camOn)} className={`p-2 rounded-full border ${camOn ? 'border-primary text-primary' : 'border-destructive text-destructive bg-destructive/10'}`}>
            {camOn ? <Video size={16} /> : <VideoOff size={16} />}
          </button>
        </div>
        <div className="text-[9px] text-muted-foreground">Meeting: {meetingCode}</div>
        <button onClick={() => { setInCall(true); setCallTime(0); }} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-display text-xs tracking-wider hover:bg-primary/90 transition-colors">
          Join Call
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground font-mono text-xs">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border">
        <Video size={12} className="text-primary" />
        <span className="font-display text-[9px] tracking-wider text-primary">PRIMELINK</span>
        <span className="text-[9px] text-muted-foreground ml-2">{formatTime(callTime)}</span>
        <span className="text-[8px] text-muted-foreground ml-auto">{meetingCode}</span>
        <button onClick={() => navigator.clipboard?.writeText(meetingCode)} className="p-0.5 hover:bg-muted rounded"><Copy size={10} className="text-muted-foreground" /></button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Main video area */}
        <div className="flex-1 flex flex-col p-2 gap-2">
          {/* Main speaker */}
          <div className="flex-1 rounded-lg bg-card border border-border flex items-center justify-center relative">
            <AvatarSVG speaking={true} size={100} />
            <div className="absolute bottom-2 left-2 text-[9px] bg-background/80 px-1.5 py-0.5 rounded">{PARTICIPANTS[0].name}</div>
            {screenShare && (
              <div className="absolute inset-0 bg-card rounded-lg flex items-center justify-center border border-primary/30">
                <div className="w-3/4 h-3/4 bg-muted rounded border border-border flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">Screen Share Active</span>
                </div>
              </div>
            )}
          </div>

          {/* Participant grid */}
          <div className="flex gap-1.5 h-20">
            {PARTICIPANTS.slice(1).map(p => (
              <div key={p.id} className="flex-1 rounded bg-card border border-border flex flex-col items-center justify-center relative">
                {p.isVideoOn ? <AvatarSVG speaking={p.isSpeaking} size={36} /> : (
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">{p.name[0]}</div>
                )}
                <span className="text-[7px] text-muted-foreground mt-0.5">{p.name}</span>
                {p.isMuted && <MicOff size={8} className="absolute top-1 right-1 text-destructive" />}
              </div>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <div className="w-48 border-l border-border flex flex-col">
            <div className="flex items-center justify-between px-2 py-1 border-b border-border">
              <span className="text-[9px] text-muted-foreground">CHAT</span>
              <button onClick={() => setChatOpen(false)} className="p-0.5 hover:bg-muted rounded"><X size={10} /></button>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-2">
              {messages.map((m, i) => (
                <div key={i}>
                  <div className="flex items-center gap-1 text-[8px]"><span className="text-primary">{m.from}</span><span className="text-muted-foreground">{m.time}</span></div>
                  <p className="text-[9px] text-foreground">{m.text}</p>
                </div>
              ))}
            </div>
            <div className="p-1 border-t border-border">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => {
                if (e.key === 'Enter' && chatInput.trim()) {
                  setMessages(prev => [...prev, { from: 'You', text: chatInput, time: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5) }]);
                  setChatInput('');
                }
              }} placeholder="Message..." className="w-full px-2 py-1 rounded bg-muted border border-border text-[9px] text-foreground outline-none" />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 px-3 py-2 border-t border-border">
        <button onClick={() => setMicOn(!micOn)} className={`p-2 rounded-full transition-colors ${micOn ? 'bg-muted hover:bg-muted/70 text-foreground' : 'bg-destructive/20 text-destructive'}`}>
          {micOn ? <Mic size={14} /> : <MicOff size={14} />}
        </button>
        <button onClick={() => setCamOn(!camOn)} className={`p-2 rounded-full transition-colors ${camOn ? 'bg-muted hover:bg-muted/70 text-foreground' : 'bg-destructive/20 text-destructive'}`}>
          {camOn ? <Video size={14} /> : <VideoOff size={14} />}
        </button>
        <button onClick={() => setScreenShare(!screenShare)} className={`p-2 rounded-full transition-colors ${screenShare ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/70 text-foreground'}`}>
          <MonitorUp size={14} />
        </button>
        <button onClick={() => setChatOpen(!chatOpen)} className={`p-2 rounded-full transition-colors ${chatOpen ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/70 text-foreground'}`}>
          <MessageSquare size={14} />
        </button>
        <button onClick={() => { setInCall(false); setCallTime(0); }} className="p-2 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
          <PhoneOff size={14} />
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Phone, PhoneOff, MessageSquare, Users, Signal, Battery, Delete } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Contact {
  id: string;
  name: string;
  coord: string;
  avatar: string;
}

interface Message {
  from: 'me' | 'them';
  text: string;
  time: string;
}

const CONTACTS: Contact[] = [
  { id: 'c1', name: 'Node Alpha', coord: '⟨2,3,5⟩', avatar: 'α' },
  { id: 'c2', name: 'Sector 7 Admin', coord: '⟨7,11,13⟩', avatar: 'Σ' },
  { id: 'c3', name: 'QK Scheduler', coord: '⟨17,19,23⟩', avatar: 'Q' },
  { id: 'c4', name: 'Lattice Guard', coord: '⟨29,31,37⟩', avatar: 'Λ' },
  { id: 'c5', name: 'Fold Operator', coord: '⟨41,43,47⟩', avatar: 'F' },
  { id: 'c6', name: 'Energy Daemon', coord: '⟨53,59,61⟩', avatar: 'E' },
];

const THREADS: Record<string, Message[]> = {
  c1: [
    { from: 'them', text: 'Lattice node ⟨2,3,5⟩ reporting stable.', time: '14:22' },
    { from: 'me', text: 'Copy. Running diagnostics now.', time: '14:23' },
    { from: 'them', text: 'COP readings nominal at 3.21.', time: '14:25' },
  ],
  c2: [
    { from: 'them', text: 'Sector 7 perimeter check complete.', time: '13:10' },
    { from: 'me', text: 'Any anomalies detected?', time: '13:11' },
    { from: 'them', text: 'Negative. All clear.', time: '13:12' },
  ],
  c3: [
    { from: 'them', text: 'Fibonacci Waltz cycle #4,096 balanced.', time: '12:00' },
  ],
};

type Tab = 'calls' | 'messages' | 'contacts';

export default function PrimeCommApp() {
  const [tab, setTab] = useState<Tab>('messages');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [dialNumber, setDialNumber] = useState('');
  const [calling, setCalling] = useState(false);
  const [phoneTime, setPhoneTime] = useState('');

  useEffect(() => {
    const update = () => setPhoneTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const contact = selectedContact ? CONTACTS.find(c => c.id === selectedContact) : null;
  const messages = selectedContact ? THREADS[selectedContact] || [] : [];

  const dialPad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  return (
    <div className="flex h-full items-center justify-center bg-background p-4">
      {/* Phone frame */}
      <div className="w-[280px] h-full max-h-[520px] bg-card border-2 border-border rounded-[28px] flex flex-col overflow-hidden shadow-lg relative">
        {/* Phone status bar */}
        <div className="h-6 bg-card flex items-center justify-between px-4 pt-1">
          <span className="text-[8px] text-muted-foreground font-mono">{phoneTime}</span>
          <div className="flex items-center gap-1">
            <Signal size={8} className="text-primary" />
            <Battery size={8} className="text-primary" />
          </div>
        </div>

        {/* Notch */}
        <div className="flex justify-center -mt-0.5 mb-1">
          <div className="w-20 h-4 bg-background rounded-b-xl" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {tab === 'calls' && (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <div className="text-lg font-mono text-foreground mb-2 tracking-widest min-h-[28px]">
                {dialNumber || '—'}
              </div>
              {calling && (
                <div className="text-[10px] text-primary animate-pulse mb-2">Connecting via PrimeNet...</div>
              )}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {dialPad.map(d => (
                  <button
                    key={d}
                    onClick={() => setDialNumber(prev => prev + d)}
                    className="w-12 h-10 rounded-lg bg-muted/30 hover:bg-muted text-foreground text-sm font-mono transition-colors"
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setDialNumber(prev => prev.slice(0, -1))}
                  className="p-2 rounded-full text-muted-foreground hover:bg-muted"
                >
                  <Delete size={16} />
                </button>
                {!calling ? (
                  <button
                    onClick={() => { if (dialNumber) setCalling(true); }}
                    className="p-3 rounded-full bg-primary text-primary-foreground"
                  >
                    <Phone size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() => setCalling(false)}
                    className="p-3 rounded-full bg-destructive text-destructive-foreground"
                  >
                    <PhoneOff size={18} />
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === 'messages' && !selectedContact && (
            <ScrollArea className="flex-1">
              <div className="p-2">
                {CONTACTS.filter(c => THREADS[c.id]).map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContact(c.id)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">{c.avatar}</div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-[11px] text-foreground truncate">{c.name}</div>
                      <div className="text-[9px] text-muted-foreground truncate">{THREADS[c.id]?.[THREADS[c.id].length - 1]?.text}</div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {tab === 'messages' && selectedContact && contact && (
            <div className="flex-1 flex flex-col">
              <button onClick={() => setSelectedContact(null)} className="flex items-center gap-2 p-2 border-b border-border">
                <span className="text-[10px] text-primary">←</span>
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">{contact.avatar}</div>
                <span className="text-[11px] text-foreground">{contact.name}</span>
              </button>
              <ScrollArea className="flex-1 p-2">
                <div className="flex flex-col gap-1.5">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-2.5 py-1.5 rounded-xl text-[10px] ${m.from === 'me' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'}`}>
                        {m.text}
                        <div className={`text-[7px] mt-0.5 ${m.from === 'me' ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>{m.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {tab === 'contacts' && (
            <ScrollArea className="flex-1">
              <div className="p-2">
                {CONTACTS.map(c => (
                  <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">{c.avatar}</div>
                    <div>
                      <div className="text-[11px] text-foreground">{c.name}</div>
                      <div className="text-[8px] text-muted-foreground">{c.coord}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Bottom tabs */}
        <div className="h-12 border-t border-border flex items-center justify-around bg-card">
          {([
            { id: 'calls' as Tab, icon: <Phone size={16} />, label: 'Calls' },
            { id: 'messages' as Tab, icon: <MessageSquare size={16} />, label: 'Messages' },
            { id: 'contacts' as Tab, icon: <Users size={16} />, label: 'Contacts' },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSelectedContact(null); }}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded transition-colors ${tab === t.id ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {t.icon}
              <span className="text-[8px]">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Home indicator */}
        <div className="flex justify-center pb-1">
          <div className="w-16 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}

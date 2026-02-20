import { useState } from 'react';
import { Mail, Send, FileText, Inbox, ArrowLeft, Trash2 } from 'lucide-react';

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  folder: 'inbox' | 'sent' | 'drafts';
}

const INITIAL_EMAILS: Email[] = [
  {
    id: '1', from: 'system@prime.os', to: 'operator', subject: 'Welcome to PRIME OS',
    body: 'Welcome, Operator.\n\nYour PRIME OS workstation has been initialized with full geometric computing capabilities. All 649 cores are online and the qutrit kernel is operating within nominal parameters.\n\nKey resources:\n- Terminal (psh) for command-line access\n- Q3-Inference for quantum analysis\n- GeomC Compiler for geometric code\n\nStay within the lattice.\n\n— PRIME System',
    date: '2026-02-20T08:00:00', read: false, folder: 'inbox',
  },
  {
    id: '2', from: 'security@prime.os', to: 'operator', subject: 'Lattice Shield: Weekly Report',
    body: 'Security Summary — Week 8\n\nThreats blocked: 2,847\nLattice integrity: 99.97%\nZero-day patches: 3 applied\nAnomaly detections: 12 (all resolved)\n\nNo action required. The lattice holds.\n\n— Lattice Shield',
    date: '2026-02-19T16:30:00', read: true, folder: 'inbox',
  },
  {
    id: '3', from: 'rocketlogic@global.net', to: 'operator', subject: 'Rocket Logic: Q1 Update',
    body: 'Greetings from Rocket Logic Global.\n\nWe are pleased to report that the T3-649 architecture is exceeding performance benchmarks by 14%. The 11D fold compression is stable and COP ratings remain above 3.0 across all nodes.\n\nUpcoming: SchemaForge v2 release, PrimeNet mesh expansion.\n\n— Rocket Logic Global',
    date: '2026-02-18T10:00:00', read: true, folder: 'inbox',
  },
  {
    id: '4', from: 'operator', to: 'team@prime.os', subject: 'Re: Fold Memory Allocation',
    body: 'Acknowledged. Increasing FoldMem allocation to 48 blocks for the inference cluster.\n\nWill monitor torsion values overnight.',
    date: '2026-02-17T14:20:00', read: true, folder: 'sent',
  },
  {
    id: '5', from: 'operator', to: '', subject: 'Notes on Hypersphere calibration',
    body: 'Need to check the rotation matrices after the last kernel update. The 7D projection seems slightly off on axis 3.\n\nTODO: Run diagnostic via terminal.',
    date: '2026-02-20T07:00:00', read: true, folder: 'drafts',
  },
];

const FOLDERS = [
  { id: 'inbox' as const, label: 'Inbox', icon: <Inbox size={14} /> },
  { id: 'sent' as const, label: 'Sent', icon: <Send size={14} /> },
  { id: 'drafts' as const, label: 'Drafts', icon: <FileText size={14} /> },
];

export default function PrimeMailApp() {
  const [emails, setEmails] = useState<Email[]>(INITIAL_EMAILS);
  const [folder, setFolder] = useState<'inbox' | 'sent' | 'drafts'>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  const folderEmails = emails.filter(e => e.folder === folder);
  const selected = selectedId ? emails.find(e => e.id === selectedId) : null;

  const openEmail = (id: string) => {
    setSelectedId(id);
    setEmails(prev => prev.map(e => e.id === id ? { ...e, read: true } : e));
  };

  const sendEmail = () => {
    if (!composeTo.trim() || !composeSubject.trim()) return;
    const newEmail: Email = {
      id: Date.now().toString(), from: 'operator', to: composeTo, subject: composeSubject,
      body: composeBody, date: new Date().toISOString(), read: true, folder: 'sent',
    };
    setEmails(prev => [newEmail, ...prev]);
    setComposing(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
  };

  const deleteEmail = (id: string) => {
    setEmails(prev => prev.filter(e => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const unreadCount = emails.filter(e => e.folder === 'inbox' && !e.read).length;

  // Compose view
  if (composing) {
    return (
      <div className="h-full bg-background flex flex-col font-mono text-xs">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button onClick={() => setComposing(false)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={14} /></button>
          <Mail size={14} className="text-primary" />
          <span className="font-display text-[10px] tracking-wider uppercase text-primary">New Message</span>
        </div>
        <div className="flex-1 flex flex-col p-3 gap-2">
          <input placeholder="To" value={composeTo} onChange={e => setComposeTo(e.target.value)}
            className="bg-card/50 border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50" />
          <input placeholder="Subject" value={composeSubject} onChange={e => setComposeSubject(e.target.value)}
            className="bg-card/50 border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50" />
          <textarea placeholder="Message body..." value={composeBody} onChange={e => setComposeBody(e.target.value)}
            className="flex-1 bg-card/50 border border-border rounded px-2 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 resize-none" />
          <button onClick={sendEmail}
            className="self-end flex items-center gap-1.5 px-3 py-1.5 rounded border border-primary/40 text-primary hover:bg-primary/10 transition-colors text-[10px] font-display tracking-wider uppercase">
            <Send size={12} /> Send
          </button>
        </div>
      </div>
    );
  }

  // Read view
  if (selected) {
    return (
      <div className="h-full bg-background flex flex-col font-mono text-xs">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={14} /></button>
          <span className="font-display text-[10px] tracking-wider uppercase text-primary flex-1 truncate">{selected.subject}</span>
          <button onClick={() => deleteEmail(selected.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex justify-between mb-2">
            <div>
              <p className="text-foreground text-xs">{selected.from}</p>
              <p className="text-muted-foreground/60 text-[10px]">to {selected.to}</p>
            </div>
            <span className="text-[9px] text-muted-foreground/50">{new Date(selected.date).toLocaleString()}</span>
          </div>
          <div className="border-t border-border pt-3 whitespace-pre-wrap text-muted-foreground leading-relaxed">{selected.body}</div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="h-full bg-background flex font-mono text-xs">
      {/* Sidebar */}
      <div className="w-28 border-r border-border flex flex-col bg-card/30">
        <div className="px-3 py-2 border-b border-border">
          <h2 className="font-display text-[10px] tracking-wider uppercase text-primary flex items-center gap-1.5">
            <Mail size={12} /> Mail
          </h2>
        </div>
        <div className="flex flex-col py-1">
          {FOLDERS.map(f => (
            <button key={f.id} onClick={() => { setFolder(f.id); setSelectedId(null); }}
              className={`flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                folder === f.id ? 'bg-primary/10 text-primary border-r-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}>
              {f.icon}
              <span className="text-[10px]">{f.label}</span>
              {f.id === 'inbox' && unreadCount > 0 && (
                <span className="ml-auto text-[8px] bg-primary/20 text-primary px-1 rounded">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="mt-auto p-2 border-t border-border">
          <button onClick={() => setComposing(true)}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors text-[10px] font-display tracking-wider uppercase">
            <Mail size={11} /> Compose
          </button>
        </div>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {folderEmails.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground/50 text-[10px]">No messages</div>
        ) : (
          folderEmails.map(e => (
            <button key={e.id} onClick={() => openEmail(e.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-border/30 hover:bg-muted/20 transition-colors ${!e.read ? 'bg-primary/5' : ''}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] truncate ${!e.read ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                  {folder === 'sent' ? `To: ${e.to}` : e.from}
                </span>
                <span className="text-[8px] text-muted-foreground/50 shrink-0 ml-2">
                  {new Date(e.date).toLocaleDateString()}
                </span>
              </div>
              <p className={`text-[10px] truncate mt-0.5 ${!e.read ? 'text-foreground' : 'text-muted-foreground/70'}`}>{e.subject}</p>
              <p className="text-[9px] text-muted-foreground/40 truncate mt-0.5">{e.body.substring(0, 80)}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

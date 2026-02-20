import { useState } from 'react';
import { Heart, MessageCircle, Share2, Send } from 'lucide-react';

interface Post {
  id: string;
  author: string;
  role: string;
  content: string;
  time: string;
  likes: number;
  liked: boolean;
  comments: { author: string; text: string }[];
  showComments: boolean;
}

const INITIAL_POSTS: Post[] = [
  {
    id: '1', author: 'PRIME System', role: 'System Core',
    content: '🔧 Maintenance complete. All 649 geometric cores recalibrated. COP rating stable at 3.2. The lattice holds.',
    time: '2h ago', likes: 47, liked: false, comments: [
      { author: 'Q3-Inference', text: 'Confirmed — inference benchmarks are 12% faster post-calibration.' },
    ], showComments: false,
  },
  {
    id: '2', author: 'Dr. Kael Voss', role: 'Geometric Engineer',
    content: 'Just ran a 7D projection through the Hypersphere visualizer. The torsion patterns at axis 3 are fascinating — looks like we\'re seeing emergent symmetries that weren\'t predicted by the fold model. Anyone else noticing this?',
    time: '4h ago', likes: 23, liked: false, comments: [
      { author: 'Lattice Shield', text: 'Security scan clear on those projections. No anomalous data flows detected.' },
      { author: 'Mx. Aria Chen', text: 'Yes! I documented similar patterns in my manifold analysis yesterday.' },
    ], showComments: false,
  },
  {
    id: '3', author: 'Rocket Logic Global', role: 'Organization',
    content: '📢 SchemaForge v2 is now available in PrimePkg. New features: visual relationship mapping, auto-migration generation, and qutrit-aware indexing. Update today.',
    time: '1d ago', likes: 89, liked: false, comments: [], showComments: false,
  },
  {
    id: '4', author: 'FoldMem Module', role: 'Memory Subsystem',
    content: 'Memory fold report: 48 blocks allocated to inference cluster. Torsion values nominal. Curvature drift: 0.003. All dimensions accounted for.',
    time: '1d ago', likes: 12, liked: false, comments: [], showComments: false,
  },
];

export default function PrimeSocialApp() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [newPost, setNewPost] = useState('');
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});

  const userName = (() => {
    try {
      const p = localStorage.getItem('prime-os-profile');
      if (p) { const parsed = JSON.parse(p); return parsed.name || 'Operator'; }
    } catch {}
    return 'Operator';
  })();

  const userRole = (() => {
    try {
      const p = localStorage.getItem('prime-os-profile');
      if (p) { const parsed = JSON.parse(p); return parsed.title || 'PRIME Operator'; }
    } catch {}
    return 'PRIME Operator';
  })();

  const toggleLike = (id: string) => {
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
    ));
  };

  const toggleComments = (id: string) => {
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, showComments: !p.showComments } : p
    ));
  };

  const addComment = (id: string) => {
    const text = commentTexts[id]?.trim();
    if (!text) return;
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, comments: [...p.comments, { author: userName, text }] } : p
    ));
    setCommentTexts(prev => ({ ...prev, [id]: '' }));
  };

  const submitPost = () => {
    if (!newPost.trim()) return;
    const post: Post = {
      id: Date.now().toString(), author: userName, role: userRole,
      content: newPost, time: 'Just now', likes: 0, liked: false, comments: [], showComments: false,
    };
    setPosts(prev => [post, ...prev]);
    setNewPost('');
  };

  return (
    <div className="h-full bg-background flex flex-col font-mono text-xs overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Share2 size={14} className="text-primary" />
        <span className="font-display text-[10px] tracking-wider uppercase text-primary">PrimeSocial</span>
        <span className="text-[9px] text-muted-foreground ml-auto">PRIME OS Community</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Compose */}
        <div className="p-3 border-b border-border bg-card/30">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
              <span className="font-display text-[8px] text-primary">{userName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <textarea value={newPost} onChange={e => setNewPost(e.target.value)}
                placeholder="Share with the PRIME community..."
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 resize-none h-14" />
              <button onClick={submitPost} disabled={!newPost.trim()}
                className="mt-1 flex items-center gap-1 px-3 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors text-[10px] font-display tracking-wider uppercase disabled:opacity-30">
                <Send size={10} /> Post
              </button>
            </div>
          </div>
        </div>

        {/* Feed */}
        {posts.map(post => (
          <div key={post.id} className="p-3 border-b border-border/50 hover:bg-muted/10 transition-colors">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-muted/50 border border-border flex items-center justify-center shrink-0">
                <span className="font-display text-[8px] text-muted-foreground">{post.author.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-foreground text-[11px] font-semibold">{post.author}</span>
                  <span className="text-[9px] text-muted-foreground/50">· {post.role}</span>
                  <span className="text-[8px] text-muted-foreground/40 ml-auto">{post.time}</span>
                </div>
                <p className="text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                <div className="flex items-center gap-4 mt-2">
                  <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-1 transition-colors ${post.liked ? 'text-primary' : 'text-muted-foreground/50 hover:text-primary'}`}>
                    <Heart size={12} fill={post.liked ? 'currentColor' : 'none'} />
                    <span className="text-[9px]">{post.likes}</span>
                  </button>
                  <button onClick={() => toggleComments(post.id)} className="flex items-center gap-1 text-muted-foreground/50 hover:text-foreground transition-colors">
                    <MessageCircle size={12} />
                    <span className="text-[9px]">{post.comments.length}</span>
                  </button>
                </div>

                {post.showComments && (
                  <div className="mt-2 pl-2 border-l border-border/30 space-y-1.5">
                    {post.comments.map((c, i) => (
                      <div key={i} className="text-[10px]">
                        <span className="text-foreground/80 font-semibold">{c.author}</span>
                        <span className="text-muted-foreground ml-1.5">{c.text}</span>
                      </div>
                    ))}
                    <div className="flex gap-1 mt-1">
                      <input value={commentTexts[post.id] || ''} onChange={e => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="Reply..." onKeyDown={e => e.key === 'Enter' && addComment(post.id)}
                        className="flex-1 bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground placeholder:text-muted-foreground/40" />
                      <button onClick={() => addComment(post.id)} className="text-primary hover:bg-primary/10 rounded p-0.5"><Send size={10} /></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

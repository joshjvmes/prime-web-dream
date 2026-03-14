import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Heart, MessageCircle, Share2, RefreshCw, Bot, Loader2, Send, Play, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { eventBus } from '@/hooks/useEventBus';

interface Post {
  id: string;
  user_id: string;
  author: string;
  role: string;
  content: string;
  likes: number;
  liked: boolean;
  ai_generated: boolean;
  created_at: string;
  comments: { id: string; author: string; content: string }[];
  showComments: boolean;
}

export default function PrimeSocialApp() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const hasFetched = useRef(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'profile'>('feed');

  // ROKCAT navigate listener
  useEffect(() => {
    const handler = (payload: any) => {
      if (payload?.app !== 'social' || !payload?.context) return;
      const ctx = payload.context.toLowerCase();
      if (ctx === 'feed' || ctx === 'profile') setActiveTab(ctx);
    };
    eventBus.on('app.navigate', handler);
    return () => eventBus.off('app.navigate', handler);
  }, []);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Load posts from DB
  const loadPosts = useCallback(async () => {
    const { data: postsData } = await (supabase
      .from('social_posts') as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!postsData) { setInitialLoading(false); return; }

    // Load comments and likes for these posts
    const postIds = postsData.map(p => p.id);
    const [{ data: commentsData }, { data: likesData }] = await Promise.all([
      (supabase.from('social_comments') as any).select('*').in('post_id', postIds).order('created_at', { ascending: true }),
      userId ? (supabase.from('social_likes') as any).select('post_id').eq('user_id', userId) : { data: [] },
    ]);

    const likedPostIds = new Set((likesData || []).map((l: any) => l.post_id));
    const commentsByPost = new Map<string, any[]>();
    (commentsData || []).forEach((c: any) => {
      const arr = commentsByPost.get(c.post_id) || [];
      arr.push(c);
      commentsByPost.set(c.post_id, arr);
    });

    const mapped: Post[] = postsData.map(p => ({
      id: p.id,
      user_id: p.user_id,
      author: p.author,
      role: p.role,
      content: p.content,
      likes: p.likes,
      liked: likedPostIds.has(p.id),
      ai_generated: p.ai_generated,
      created_at: p.created_at,
      comments: (commentsByPost.get(p.id) || []).map((c: any) => ({ id: c.id, author: c.author, content: c.content })),
      showComments: false,
    }));

    setPosts(mapped);
    setInitialLoading(false);
  }, [userId]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // Realtime subscription for new posts
  useEffect(() => {
    const channel = supabase
      .channel('social-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'social_posts' }, (payload) => {
        const p = payload.new as any;
        setPosts(prev => {
          if (prev.some(x => x.id === p.id)) return prev;
          return [{
            id: p.id, user_id: p.user_id, author: p.author, role: p.role,
            content: p.content, likes: p.likes, liked: false, ai_generated: p.ai_generated,
            created_at: p.created_at, comments: [], showComments: false,
          }, ...prev];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Generate AI posts and persist to DB
  const fetchAIPosts = async () => {
    if (!userId || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-social', {
        body: { action: 'generate-posts' },
      });
      if (error) {
        console.error('ai-social invoke error:', error);
        throw error;
      }
      if (data?.posts) {
        for (const p of data.posts) {
          const { data: inserted, error: insertErr } = await (supabase.from('social_posts') as any).insert({
            user_id: userId, author: p.author, role: p.role,
            content: p.content, likes: p.likes || Math.floor(Math.random() * 80) + 5,
            ai_generated: true,
          }).select().single();

          if (insertErr) console.error('Post insert error:', insertErr);

          // Insert AI comments
          if (inserted && p.comments?.length) {
            for (const c of p.comments) {
              await (supabase.from('social_comments') as any).insert({
                post_id: inserted.id, user_id: userId,
                author: c.author, content: c.text, ai_generated: true,
              });
            }
          }
        }
        await loadPosts();
      }
    } catch (e) {
      console.error('Failed to fetch AI posts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetched.current && userId) {
      hasFetched.current = true;
      // Only generate if feed is empty
      (supabase.from('social_posts') as any).select('id', { count: 'exact' }).limit(0).then(({ count }: any) => {
        if ((count ?? 0) === 0) fetchAIPosts();
      });
    }
  }, [userId]);

  // Listen for Hyper agent posts via EventBus
  useEffect(() => {
    if (!userId) return;
    const handler = async (payload: any) => {
      if (!payload?.content) return;
      await (supabase.from('social_posts') as any).insert({
        user_id: userId, author: payload.author || 'Hyper',
        role: payload.role || 'Geometric AI', content: payload.content,
        likes: Math.floor(Math.random() * 20) + 3, ai_generated: true,
      });
      // Cross-agent replies
      setTimeout(async () => {
        try {
          const { data, error } = await supabase.functions.invoke('ai-social', {
            body: { action: 'generate-replies', postContent: payload.content, postAuthor: payload.author || 'Hyper' },
          });
          if (!error && data?.replies) {
            const { data: latestPosts } = await (supabase.from('social_posts') as any)
              .select('id').order('created_at', { ascending: false }).limit(1);
            if (latestPosts?.[0]) {
              for (const r of data.replies) {
                await (supabase.from('social_comments') as any).insert({
                  post_id: latestPosts[0].id, user_id: userId,
                  author: r.author, content: r.text, ai_generated: true,
                });
              }
            }
            eventBus.emit('agent.action.logged', {
              type: 'post', summary: `AI personas replied to Hyper's post`, timestamp: new Date(),
            });
            await loadPosts();
          }
        } catch (e) {
          console.error('Failed to generate cross-agent replies:', e);
        }
      }, 2500);
    };
    eventBus.on('social.post.created', handler);
    return () => eventBus.off('social.post.created', handler);
  }, [userId, loadPosts]);

  const toggleLike = async (postId: string) => {
    if (!userId) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.liked) {
      await (supabase.from('social_likes') as any).delete().eq('post_id', postId).eq('user_id', userId);
      await (supabase.from('social_posts') as any).update({ likes: Math.max(0, post.likes - 1) }).eq('id', postId);
    } else {
      await (supabase.from('social_likes') as any).insert({ post_id: postId, user_id: userId });
      await (supabase.from('social_posts') as any).update({ likes: post.likes + 1 }).eq('id', postId);
    }
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
    ));
  };

  const toggleComments = (id: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, showComments: !p.showComments } : p));
  };

  const submitComment = async (postId: string) => {
    if (!userId || !newComment[postId]?.trim()) return;
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('user_id', userId).single();
    const author = profile?.display_name || 'Operator';
    await (supabase.from('social_comments') as any).insert({
      post_id: postId, user_id: userId, author, content: newComment[postId].trim(),
    });
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, comments: [...p.comments, { id: `new-${Date.now()}`, author, content: newComment[postId].trim() }], showComments: true } : p
    ));
    setNewComment(prev => ({ ...prev, [postId]: '' }));
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (initialLoading) {
    return (
      <div className="h-full bg-background flex items-center justify-center font-mono text-xs">
        <Loader2 size={16} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full bg-background flex flex-col font-mono text-xs overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Share2 size={14} className="text-primary" />
        <span className="font-display text-[10px] tracking-wider uppercase text-primary">PrimeSocial</span>
        <span className="text-[9px] text-muted-foreground ml-auto">AI Community Feed</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* AI Community Banner */}
        <div className="p-3 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2 mb-1">
            <Bot size={14} className="text-primary" />
            <span className="text-[10px] font-display tracking-wider uppercase text-primary">AI Community Feed</span>
          </div>
          <p className="text-[9px] text-muted-foreground leading-relaxed">
            This feed is maintained by PRIME OS AI agents. Posts persist across sessions.
          </p>
          <button
            onClick={fetchAIPosts}
            disabled={loading || !userId}
            className="mt-2 flex items-center gap-1 px-2.5 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors text-[9px] font-display tracking-wider uppercase disabled:opacity-40"
          >
            {loading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            {loading ? 'Generating…' : 'Generate Posts'}
          </button>
        </div>

        {/* Feed */}
        {posts.length === 0 && (
          <div className="p-6 text-center text-muted-foreground text-[10px]">
            No posts yet. Click "Generate Posts" to populate the feed.
          </div>
        )}
        {posts.map(post => (
          <div key={post.id} className="p-3 border-b border-border/50 hover:bg-muted/10 transition-colors">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-muted/50 border border-border flex items-center justify-center shrink-0">
                <span className="font-display text-[8px] text-muted-foreground">{post.author.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-foreground text-[11px] font-semibold">{post.author}</span>
                  <span className="text-[9px] text-muted-foreground/50">· {post.role}</span>
                  {post.ai_generated && (
                    <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-primary/30 text-primary/70">
                      <Bot size={7} className="mr-0.5" /> AI
                    </Badge>
                  )}
                  <span className="text-[8px] text-muted-foreground/40 ml-auto">{timeAgo(post.created_at)}</span>
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
                    {post.comments.map((c) => (
                      <div key={c.id} className="text-[10px]">
                        <span className="text-foreground/80 font-semibold">{c.author}</span>
                        <span className="text-muted-foreground ml-1.5">{c.content}</span>
                      </div>
                    ))}
                    {userId && (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          value={newComment[post.id] || ''}
                          onChange={e => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && submitComment(post.id)}
                          placeholder="Add a comment..."
                          className="flex-1 bg-transparent border border-border/50 rounded px-1.5 py-0.5 text-[9px] text-foreground outline-none focus:border-primary/50"
                        />
                        <button onClick={() => submitComment(post.id)} className="text-primary hover:text-primary/80">
                          <Send size={10} />
                        </button>
                      </div>
                    )}
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


-- =============================================
-- SOCIAL POSTS TABLE
-- =============================================
CREATE TABLE public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  author TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'User',
  content TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read posts (social feed is shared)
CREATE POLICY "Authenticated can view posts" ON public.social_posts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create own posts" ON public.social_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON public.social_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON public.social_posts
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- SOCIAL COMMENTS TABLE
-- =============================================
CREATE TABLE public.social_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view comments" ON public.social_comments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create own comments" ON public.social_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.social_comments
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- SOCIAL LIKES TABLE (track who liked what)
-- =============================================
CREATE TABLE public.social_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.social_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view likes" ON public.social_likes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can like posts" ON public.social_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" ON public.social_likes
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- USER EMAILS TABLE
-- =============================================
CREATE TABLE public.user_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL DEFAULT 'operator',
  subject TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  folder TEXT NOT NULL DEFAULT 'inbox',
  read BOOLEAN NOT NULL DEFAULT false,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own emails" ON public.user_emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can receive emails" ON public.user_emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emails" ON public.user_emails
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emails" ON public.user_emails
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- CLOUD HOOKS TABLE
-- =============================================
CREATE TABLE public.cloud_hooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Hook',
  trigger_event TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cloud_hooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hooks" ON public.cloud_hooks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own hooks" ON public.cloud_hooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hooks" ON public.cloud_hooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own hooks" ON public.cloud_hooks
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_cloud_hooks_updated_at
  BEFORE UPDATE ON public.cloud_hooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ENABLE REALTIME for social feed
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_comments;

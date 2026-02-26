
-- Remove the overly permissive policy - service role bypasses RLS anyway
DROP POLICY IF EXISTS "Service role full access" ON public.user_activity;

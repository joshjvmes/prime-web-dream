-- Add missing UPDATE policy for forge_listings so creators can update their own apps
CREATE POLICY "Creators can update own apps"
  ON public.forge_listings
  FOR UPDATE
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Also add DELETE policy so creators can delist their apps
CREATE POLICY "Creators can delete own apps"
  ON public.forge_listings
  FOR DELETE
  USING (auth.uid() = creator_id);

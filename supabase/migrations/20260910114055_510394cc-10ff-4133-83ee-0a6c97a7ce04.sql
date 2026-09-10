-- Internal-only: triggers and scheduled maintenance. Not callable via the API.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_activity() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_activity() TO service_role;

-- Booking conflict check: called by the AI assistant as the signed-in user only.
REVOKE ALL ON FUNCTION public.check_booking_conflict(text, timestamptz, timestamptz, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_booking_conflict(text, timestamptz, timestamptz, uuid) TO authenticated, service_role;

-- Intentionally left callable: has_role (used by RLS policies) and get_waitlist_count (public landing page).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO anon, authenticated, service_role;
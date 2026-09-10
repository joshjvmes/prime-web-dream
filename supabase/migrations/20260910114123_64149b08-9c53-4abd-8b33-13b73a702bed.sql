-- Postgres grants EXECUTE to PUBLIC by default; that implicit grant is what keeps these exposed.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_activity() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_booking_conflict(text, timestamptz, timestamptz, uuid) FROM PUBLIC;

-- Redundant now that anon/authenticated/service_role hold explicit grants.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_waitlist_count() FROM PUBLIC;
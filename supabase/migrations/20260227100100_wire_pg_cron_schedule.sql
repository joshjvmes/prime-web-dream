-- Schedule cron-dispatcher to run every minute via pg_cron + pg_net
-- This calls the cron-dispatcher edge function which checks all bot schedules
SELECT cron.schedule(
  'dispatch-bots-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/cron-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{"source": "pg_cron"}'::jsonb
  );
  $$
);

-- Schedule daily interest distribution at midnight UTC
SELECT cron.schedule(
  'daily-interest-distribution',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/prime-bank?action=distribute-interest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule sports odds refresh every 15 minutes
SELECT cron.schedule(
  'refresh-sports-odds',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/sports-odds?action=refresh-odds',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule sports market auto-resolution every 30 minutes
SELECT cron.schedule(
  'resolve-sports-markets',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/resolve-markets',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{"source": "pg_cron"}'::jsonb
  );
  $$
);

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { action } = await req.json();

    if (action === 'edge-function-stats') {
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Fetch activity and all table counts in parallel
      const tables = [
        'calendar_events', 'chat_messages', 'file_metadata', 'social_posts',
        'user_emails', 'bot_registry', 'agent_tasks', 'vault_holdings',
        'bookings', 'cloud_hooks', 'wallets', 'ai_conversations', 'ai_memories'
      ];

      const [activityResult, ...countResults] = await Promise.all([
        serviceClient
          .from('user_activity')
          .select('target, created_at, metadata')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(500),
        ...tables.map(table =>
          supabase.from(table).select('id', { count: 'exact' }).limit(0)
        ),
      ]);

      const activity = activityResult.data;
      const tableCounts: Record<string, number> = {};
      tables.forEach((table, i) => {
        tableCounts[table] = countResults[i].count ?? 0;
      });

      // Aggregate activity by target
      const activityByTarget: Record<string, number> = {};
      const hourBuckets: Record<string, number> = {};

      for (const row of (activity || [])) {
        activityByTarget[row.target] = (activityByTarget[row.target] || 0) + 1;
        const hour = row.created_at.slice(0, 13);
        hourBuckets[hour] = (hourBuckets[hour] || 0) + 1;
      }

      const activityTimeline: { hour: string; count: number }[] = [];
      const sortedHours = Object.keys(hourBuckets).sort().slice(-24);
      for (const h of sortedHours) {
        activityTimeline.push({ hour: h.slice(11) + ':00', count: hourBuckets[h] });
      }

      return new Response(JSON.stringify({
        tableCounts,
        activityByTarget,
        activityTimeline,
        totalActivity: activity?.length ?? 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'auth-events') {
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const securityTables = [
        'user_ai_keys', 'wallets', 'bot_registry', 'agent_tasks',
        'file_metadata', 'calendar_events', 'user_emails', 'cloud_hooks',
        'social_posts', 'profiles', 'user_data'
      ];

      // Fetch activity and all RLS table counts in parallel
      const [activityResult, ...rlsResults] = await Promise.all([
        serviceClient
          .from('user_activity')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        ...securityTables.map(table =>
          supabase.from(table).select('id', { count: 'exact' }).limit(0)
        ),
      ]);

      const activity = activityResult.data;
      const rlsStatus: { table: string; rls: boolean; rowCount: number }[] = [];
      securityTables.forEach((table, i) => {
        rlsStatus.push({ table, rls: true, rowCount: rlsResults[i].count ?? 0 });
      });

      const events = (activity || []).map((a: any) => ({
        id: a.id,
        time: new Date(a.created_at).toLocaleTimeString('en-US', { hour12: false }),
        action: a.action,
        target: a.target,
        metadata: a.metadata,
      }));

      return new Response(JSON.stringify({
        events,
        rlsStatus,
        userEmail: user.email,
        lastSignIn: user.last_sign_in_at,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

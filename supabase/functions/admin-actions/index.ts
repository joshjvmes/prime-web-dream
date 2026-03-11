import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    // Verify caller identity
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const userId = claimsData.claims.sub as string

    // Use service role client for admin operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify admin role
    const { data: roleCheck } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), { status: 403, headers: corsHeaders })
    }

    const url = new URL(req.url)
    const path = url.pathname.split('/').filter(Boolean)
    const action = path[path.length - 1] || ''

    // Route based on action param or path
    const body = req.method !== 'GET' ? await req.json().catch(() => ({})) : {}
    const actionParam = url.searchParams.get('action') || action

    switch (actionParam) {
      case 'users': {
        // List all profiles with auth user emails
        const { data: profiles } = await adminClient.from('profiles').select('*').order('created_at', { ascending: false })
        const { data: roles } = await adminClient.from('user_roles').select('*')
        
        // Get auth users for emails
        const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
        
        const enriched = (profiles || []).map(p => {
          const authUser = authUsers?.find(u => u.id === p.user_id)
          const userRoles = (roles || []).filter(r => r.user_id === p.user_id).map(r => r.role)
          return { ...p, email: authUser?.email || '', provider: authUser?.app_metadata?.provider || 'email', roles: userRoles }
        })
        
        return new Response(JSON.stringify(enriched), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'assign-role': {
        const { target_user_id, role } = body
        if (!target_user_id || !role) {
          return new Response(JSON.stringify({ error: 'target_user_id and role required' }), { status: 400, headers: corsHeaders })
        }
        const { error } = await adminClient.from('user_roles').insert({ user_id: target_user_id, role })
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'remove-role': {
        const { target_user_id, role } = body
        if (!target_user_id || !role) {
          return new Response(JSON.stringify({ error: 'target_user_id and role required' }), { status: 400, headers: corsHeaders })
        }
        const { error } = await adminClient.from('user_roles').delete().eq('user_id', target_user_id).eq('role', role)
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'waitlist': {
        if (req.method === 'DELETE') {
          const id = url.searchParams.get('id')
          if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: corsHeaders })
          await adminClient.from('waitlist').delete().eq('id', id)
          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        const { data } = await adminClient.from('waitlist').select('*').order('created_at', { ascending: false })
        return new Response(JSON.stringify(data || []), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'delete-message': {
        const { message_id } = body
        if (!message_id) return new Response(JSON.stringify({ error: 'message_id required' }), { status: 400, headers: corsHeaders })
        await adminClient.from('chat_messages').delete().eq('id', message_id)
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'messages': {
        const { data } = await adminClient.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(100)
        return new Response(JSON.stringify(data || []), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'stats': {
        const [profilesRes, waitlistRes, filesRes, messagesRes] = await Promise.all([
          adminClient.from('profiles').select('id', { count: 'exact', head: true }),
          adminClient.from('waitlist').select('id', { count: 'exact', head: true }),
          adminClient.from('file_metadata').select('file_size'),
          adminClient.from('chat_messages').select('id', { count: 'exact', head: true }),
        ])
        
        const totalFileSize = (filesRes.data || []).reduce((sum, f) => sum + (Number(f.file_size) || 0), 0)
        
        return new Response(JSON.stringify({
          users: profilesRes.count || 0,
          waitlist: waitlistRes.count || 0,
          files: (filesRes.data || []).length,
          totalFileSize,
          messages: messagesRes.count || 0,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${actionParam}` }), { status: 400, headers: corsHeaders })
    }
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders })
  }
})

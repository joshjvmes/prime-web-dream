import { useCallback, useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useCloudStorage() {
  const [userId, setUserId] = useState<string | null>(null);
  const pendingSync = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid && !pendingSync.current) {
        pendingSync.current = true;
        // Sync localStorage keys on sign-in
        syncLocalToCloud(uid).finally(() => { pendingSync.current = false; });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const save = useCallback(async (key: string, value: unknown) => {
    // Always save to localStorage
    try { localStorage.setItem(`prime-cloud-${key}`, JSON.stringify(value)); } catch {}
    if (!userId) return;
    try {
      await (supabase as any).from('user_data').upsert(
        { user_id: userId, key, value: JSON.stringify(value), updated_at: new Date().toISOString() },
        { onConflict: 'user_id,key' }
      );
    } catch {}
  }, [userId]);

  const load = useCallback(async <T = unknown>(key: string, fallback?: T): Promise<T | undefined> => {
    if (userId) {
      try {
        const { data } = await (supabase as any).from('user_data').select('value').eq('user_id', userId).eq('key', key).maybeSingle();
        if (data?.value != null) return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      } catch {}
    }
    try {
      const local = localStorage.getItem(`prime-cloud-${key}`);
      if (local) return JSON.parse(local);
    } catch {}
    return fallback;
  }, [userId]);

  return { save, load, isSignedIn: !!userId };
}

async function syncLocalToCloud(userId: string) {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('prime-cloud-')) keys.push(k.replace('prime-cloud-', ''));
  }
  for (const key of keys) {
    try {
      const val = localStorage.getItem(`prime-cloud-${key}`);
      if (!val) continue;
      await (supabase as any).from('user_data').upsert(
        { user_id: userId, key, value: JSON.parse(val), updated_at: new Date().toISOString() },
        { onConflict: 'user_id,key' }
      );
    } catch {}
  }
}

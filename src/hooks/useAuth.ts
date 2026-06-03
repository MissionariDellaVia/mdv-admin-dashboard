import { useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthProfile {
  role: 'admin' | 'collaborator';
  mustChangePassword: boolean;
  allowedSlugs: string[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) { setProfile(null); return; }
    const { data: prof } = await supabase
      .from('profiles').select('role, must_change_password').eq('id', u.id).single();
    let allowedSlugs: string[] = [];
    if (prof?.role === 'collaborator') {
      const { data: rows } = await supabase
        .from('location_editors').select('location_slug').eq('user_id', u.id);
      allowedSlugs = (rows ?? []).map((r: { location_slug: string }) => r.location_slug);
    }
    setProfile({
      role: prof?.role ?? 'collaborator',
      mustChangePassword: prof?.must_change_password ?? false,
      allowedSlugs,
    });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      await loadProfile(u);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      await loadProfile(u);
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return {
    user,
    loading,
    role: profile?.role ?? null,
    isAdmin: profile?.role === 'admin',
    allowedSlugs: profile?.allowedSlugs ?? [],
    mustChangePassword: profile?.mustChangePassword ?? false,
    signIn,
    signOut,
    refreshProfile: () => loadProfile(user),
  };
}

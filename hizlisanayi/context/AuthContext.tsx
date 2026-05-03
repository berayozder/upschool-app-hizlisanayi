import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile, ActiveRole } from '@/types/database';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  devBypassActive: boolean;
  signOut: () => Promise<void>;
  switchRole: (role: ActiveRole) => Promise<void>;
  enableDevBypass: (role: ActiveRole) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const PROFILE_FETCH_TIMEOUT_MS = 6000;
const AUTH_INIT_TIMEOUT_MS = 8000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [devBypassActive, setDevBypassActive] = useState(false);

  async function fetchProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      setProfile(data ?? null);
    } catch {
      setProfile(null);
    }
  }

  async function fetchProfileWithTimeout(userId: string) {
    await Promise.race([
      fetchProfile(userId),
      new Promise<void>((resolve) => {
        setTimeout(resolve, PROFILE_FETCH_TIMEOUT_MS);
      }),
    ]);
  }

  useEffect(() => {
    let mounted = true;
    const authInitWatchdog = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, AUTH_INIT_TIMEOUT_MS);

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(session);
        if (session) {
          await fetchProfileWithTimeout(session.user.id);
        }
      } catch (e) {
        console.warn('Auth init error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          await fetchProfileWithTimeout(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(authInitWatchdog);
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    if (session) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setProfile(null);
    setDevBypassActive(false);
  }

  async function switchRole(role: ActiveRole) {
    if (!session && devBypassActive) {
      setProfile((prev) => (prev ? { ...prev, active_role: role } : prev));
      return;
    }
    if (!session) return;
    await supabase
      .from('profiles')
      .update({ active_role: role, updated_at: new Date().toISOString() })
      .eq('id', session.user.id);
    setProfile((prev) => (prev ? { ...prev, active_role: role } : prev));
  }

  function enableDevBypass(role: ActiveRole) {
    if (!__DEV__) return;

    const now = new Date().toISOString();
    setSession(null);
    setProfile({
      id: 'dev-user',
      phone: '+905000000000',
      full_name: 'Dev User',
      active_role: role,
      created_at: now,
      updated_at: now,
    });
    setDevBypassActive(true);
    setLoading(false);
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, devBypassActive, signOut, switchRole, enableDevBypass }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

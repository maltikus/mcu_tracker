import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        if (!mounted) return;
        setSession(data.session);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        setSession(nextSession);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.href
      }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signInWithMagicLink,
      signOut
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

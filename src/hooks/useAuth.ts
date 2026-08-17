import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/** Nur Google-Konten dieser Domain kommen ins Cockpit. */
export const ALLOWED_DOMAIN = 'mind4.at';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

export interface Auth {
  status: AuthStatus;
  session: Session | null;
  email: string | null;
  /** Grund der letzten Abweisung — wird auf dem Login-Screen angezeigt. */
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

function isAllowed(email: string | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

export function useAuth(): Auth {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    /**
     * Sessions mit fremder Domain werden sofort beendet. Das ist nur die
     * Komfort-Ebene — der verbindliche Riegel sind die RLS-Policies
     * (supabase/rls.sql), denn Client-Code ist manipulierbar.
     */
    const apply = (next: Session | null) => {
      if (!alive) return;
      if (!next) {
        setSession(null);
        setStatus('signed-out');
        return;
      }
      const email = next.user.email;
      if (!isAllowed(email)) {
        setError(
          `${email ?? 'Dieses Konto'} ist keine @${ALLOWED_DOMAIN}-Adresse — Zugriff nur für mind4-Konten.`,
        );
        setSession(null);
        setStatus('signed-out');
        void supabase.auth.signOut();
        return;
      }
      setSession(next);
      setStatus('signed-in');
    };

    supabase.auth
      .getSession()
      .then(({ data }) => apply(data.session))
      .catch((err) => {
        console.warn('Session konnte nicht geladen werden', err);
        if (alive) setStatus('signed-out');
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => apply(next));

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          // Kein `hd`-Parameter: der filtert auf Workspace-gehostete Domains.
          // mind4 ist kein Workspace-Kunde, die @mind4.at-Konten sind private
          // Google-Accounts ohne hd-Claim — mit `hd` waeren sie ausgeschlossen.
          prompt: 'select_account',
        },
      },
    });
    if (err) {
      console.warn('Google-Login fehlgeschlagen', err);
      setError('Login fehlgeschlagen — bitte erneut versuchen.');
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await supabase.auth.signOut();
  }, []);

  return {
    status,
    session,
    email: session?.user.email ?? null,
    error,
    signIn,
    signOut,
  };
}

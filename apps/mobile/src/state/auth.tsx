import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  getInitialSession,
  subscribeToAuthChanges,
  signOutSafe,
} from "@tae/shared";
import { supabase } from "../lib/supabase";

interface AuthState {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInitialSession(supabase).then((s) => {
      setSession(s);
      setLoading(false);
    });

    const unsub = subscribeToAuthChanges(supabase, (_event, s) => {
      setSession(s);
    });

    return unsub;
  }, []);

  const signOut = async () => {
    await signOutSafe(supabase);
  };

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

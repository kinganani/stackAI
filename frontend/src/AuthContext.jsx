import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, refreshAccess, setAccessToken } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await refreshAccess();
        if (!cancelled && data && data.access) {
          const me = await api.me();
          if (!cancelled) setProfile(me);
        }
      } catch {
        setAccessToken(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      profile,
      ready,
      isAuth: Boolean(profile),
      isSeller: profile?.role === "seller",
      isBuyer: profile?.role === "buyer",
      setSession(payload) {
        setAccessToken(payload.access);
        setProfile(payload.profile);
      },
      async logout() {
        try {
          await api.logout();
        } catch {
          /* cookie déjà invalide */
        }
        setAccessToken(null);
        setProfile(null);
      },
    }),
    [profile, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

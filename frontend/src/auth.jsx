import { createContext, useContext, useEffect, useState } from "react";
import { api, clearSession, restoreSession, saveSession } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    restoreSession().then((next) => {
      if (!alive) return;
      setUser(next);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  function establish(session) {
    saveSession(session);
    setUser(session.user);
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      /* le cookie est déjà absent */
    }
    clearSession();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, ready, establish, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return value;
}

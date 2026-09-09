import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading, false=logged out, object=user
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    let active = true;
    async function load() {
      // Returning from Google OAuth — let AuthCallback exchange the session_id first
      if (window.location.hash?.includes("session_id=")) return;
      if (!token) { setUser(false); return; }
      try {
        const { data } = await api.get("/auth/me");
        if (active) setUser(data.user);
      } catch {
        localStorage.removeItem("token");
        if (active) { setToken(null); setUser(false); }
      }
    }
    load();
    return () => { active = false; };
  }, [token]);

  const applyAuth = (data) => {
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    applyAuth(data);
    return data.user;
  };

  const signup = async (email, password, name) => {
    const { data } = await api.post("/auth/signup", { email, password, name });
    applyAuth(data);
    return data.user;
  };

  const loginWithGoogle = async (session_id) => {
    const { data } = await api.post("/auth/google", { session_id });
    applyAuth(data);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(false);
  };

  const refreshUser = async () => {
    const { data } = await api.get("/auth/me");
    setUser(data.user);
    return data.user;
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, loginWithGoogle, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

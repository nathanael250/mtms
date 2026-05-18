import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch } from "../lib/api";

const AuthContext = createContext(null);

const TOKEN_KEY = "job_management_token";
const USER_KEY = "job_management_user";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isLoading, setIsLoading] = useState(Boolean(token));

  useEffect(() => {
    async function loadCurrentUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await apiFetch("/auth/me", { token });
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadCurrentUser();
  }, [token]);

  async function login(email, password) {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      logout,
    }),
    [token, user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}


import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";
import { mergeAuthProfile } from "@/lib/accountProfile";

type AuthUser = {
  token: string;
  role?: string;
  [key: string]: any;
} | null;

type AuthContextValue = {
  user: AuthUser;
  authLoaded: boolean;
  setUser: (user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AVATAR_URL_STORAGE_KEY = "diya_avatar_url";

function parseJwt(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to parse JWT:", e);
    return null;
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("AuthContext init - Token from storage:", token);

    if (token) {
      const payload = parseJwt(token);
      console.log("AuthContext init - Parsed JWT payload:", payload);
      const avatarUrl = localStorage.getItem(AVATAR_URL_STORAGE_KEY) || undefined;
      setUser({ token, ...payload, ...(avatarUrl ? { avatarUrl } : {}) });

      // Best-effort: load persisted profile fields from backend (e.g. avatarUrl).
      api
        .get("/users/me")
        .then((res) => {
          const data = res.data as Record<string, unknown> | undefined;
          if (!data) return;
          setUser((prev) => mergeAuthProfile(prev as Record<string, unknown> | null, data) as AuthUser);
        })
        .catch(() => {});
    } else {
      setUser(null);
    }

    setAuthLoaded(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoaded,
        setUser: (next) => {
          setUser(next);
          const url = (next as any)?.avatarUrl;
          if (typeof url === "string" && url.trim()) {
            localStorage.setItem(AVATAR_URL_STORAGE_KEY, url.trim());
          } else {
            localStorage.removeItem(AVATAR_URL_STORAGE_KEY);
          }
        },
        logout: () => {
          localStorage.removeItem("token");
          localStorage.removeItem(AVATAR_URL_STORAGE_KEY);
          setUser(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};


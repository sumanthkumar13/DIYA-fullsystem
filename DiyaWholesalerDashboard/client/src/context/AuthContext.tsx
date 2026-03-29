import React, { createContext, useContext, useEffect, useState } from "react";

type AuthUser = {
  token: string;
  role?: string;
  [key: string]: any;
} | null;

type AuthContextValue = {
  user: AuthUser;
  authLoaded: boolean;
  setUser: (user: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
      setUser({ token, ...payload });
    } else {
      setUser(null);
    }

    setAuthLoaded(true);
  }, []);

  return (
    <AuthContext.Provider value={{ user, authLoaded, setUser }}>
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


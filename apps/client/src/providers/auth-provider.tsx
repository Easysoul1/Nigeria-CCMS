"use client";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError, api } from "../lib/api";

type Role = "ADMIN" | "REGISTRAR" | "JUDGE" | "LAWYER";
export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
};

type AuthContext = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthContext | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  // True until the session probe settles. Pages may show a loading state, but
  // the sign-in button must never be blocked by it.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<AuthUser>("/auth/me", { redirectOnUnauthorized: false })
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await api.post("/auth/login", { email, password }, { redirectOnUnauthorized: false, skipRefresh: true });
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
      }
      throw error;
    }
    const me = await api.get<AuthUser>("/auth/me", { redirectOnUnauthorized: false });
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout", undefined, { redirectOnUnauthorized: false }).catch(() => undefined);
    setUser(null);
    window.location.assign("/login");
  }, []);

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

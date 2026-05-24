import { useEffect, useState } from "react";

export const ADMIN_SESSION_KEY = "ischool_admin_session";

export interface AdminSessionData {
  admin: { id: string; email: string; name: string };
  loggedIn: boolean;
}

export function readAdminSession(): AdminSessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSessionData;
    if (!parsed?.loggedIn || !parsed?.admin?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAdminSession(data: AdminSessionData) {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(data));
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function useAdminSession() {
  const [state, setState] = useState<{
    loading: boolean;
    isAdmin: boolean;
    admin: AdminSessionData["admin"] | null;
  }>({ loading: true, isAdmin: false, admin: null });

  useEffect(() => {
    const s = readAdminSession();
    setState({ loading: false, isAdmin: !!s, admin: s?.admin ?? null });
    const onStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_SESSION_KEY) {
        const s2 = readAdminSession();
        setState({ loading: false, isAdmin: !!s2, admin: s2?.admin ?? null });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return state;
}
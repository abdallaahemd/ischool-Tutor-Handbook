import { useEffect, useState } from "react";

export const TUTOR_SESSION_KEY = "ischool_tutor_session";

export interface TutorSessionData {
  tutor: { id: string; tutor_id: string; name: string };
  loggedInAt: string;
  loggedIn: boolean;
}

export function readTutorSession(): TutorSessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(TUTOR_SESSION_KEY) ??
      sessionStorage.getItem(TUTOR_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TutorSessionData;
    if (!parsed?.loggedIn || !parsed?.tutor?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeTutorSession(data: TutorSessionData, remember = false) {
  const serialized = JSON.stringify(data);
  if (remember) {
    localStorage.setItem(TUTOR_SESSION_KEY, serialized);
    sessionStorage.removeItem(TUTOR_SESSION_KEY);
  } else {
    sessionStorage.setItem(TUTOR_SESSION_KEY, serialized);
    localStorage.removeItem(TUTOR_SESSION_KEY);
  }
  window.dispatchEvent(new Event("tutor-session-change"));
}

export function clearTutorSession() {
  sessionStorage.removeItem(TUTOR_SESSION_KEY);
  localStorage.removeItem(TUTOR_SESSION_KEY);
  window.dispatchEvent(new Event("tutor-session-change"));
}

export function useTutorSession() {
  const [state, setState] = useState<{
    loading: boolean;
    isTutor: boolean;
    tutor: TutorSessionData["tutor"] | null;
    loggedInAt: string | null;
  }>({ loading: true, isTutor: false, tutor: null, loggedInAt: null });

  useEffect(() => {
    const refresh = () => {
      const s = readTutorSession();
      setState({
        loading: false,
        isTutor: !!s,
        tutor: s?.tutor ?? null,
        loggedInAt: s?.loggedInAt ?? null,
      });
    };
    refresh();
    window.addEventListener("tutor-session-change", refresh);
    return () => window.removeEventListener("tutor-session-change", refresh);
  }, []);

  return state;
}
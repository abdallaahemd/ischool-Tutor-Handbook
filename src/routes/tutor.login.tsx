import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/handbook/Logo";
import {
  readTutorSession,
  writeTutorSession,
} from "@/components/tutor/useTutorSession";
import { AnimatedBackground } from "@/components/tutor/AnimatedBackground";

export const Route = createFileRoute("/tutor/login")({
  component: TutorLoginPage,
});

function TutorLoginPage() {
  const navigate = useNavigate();
  const [tutorId, setTutorId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (readTutorSession()) navigate({ to: "/" });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!tutorId.trim() || !password) {
      setError("Tutor ID and password are required.");
      return;
    }
    setBusy(true);
    try {
      const { data, error: qErr } = await supabase.rpc(
        "verify_tutor_login" as never,
        { _tutor_id: tutorId.trim(), _password: password } as never,
      );
      if (qErr) throw qErr;
      const rows =
        (data as Array<{ id: string; tutor_id: string; name: string; must_change_password?: boolean }> | null) ?? [];
      const row = rows[0];
      if (!row) {
        setError("Invalid ID or password");
        setPassword("");
        return;
      }
      if (row.must_change_password) {
        // Stash a short-lived handoff for the change-password page
        sessionStorage.setItem(
          "ischool_tutor_pw_change",
          JSON.stringify({
            id: row.id,
            tutor_id: row.tutor_id,
            name: row.name,
            current_password: password,
          }),
        );
        navigate({ to: "/tutor/change-password" });
        return;
      }
      writeTutorSession(
        {
          tutor: { id: row.id, tutor_id: row.tutor_id, name: row.name },
          loggedInAt: new Date().toISOString(),
          loggedIn: true,
        },
        remember,
      );
      navigate({ to: "/" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatedBackground>
      <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/60 bg-white/55 p-8 shadow-[0_20px_60px_-20px_rgba(80,90,140,0.35)] backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={48} />
          <h1 className="mt-4 text-xl font-bold text-foreground">Tutor Login</h1>
          <p className="text-sm text-muted-foreground">Sign in to access the handbook</p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tutor ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. T-1004"
              value={tutorId}
              onChange={(e) => setTutorId(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Password
            </label>
            <div className="relative mt-1">
              <input
                type={showPw ? "text" : "password"}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-md border border-border bg-background px-3 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Toggle password visibility"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Remember me
          </label>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow transition hover:bg-blue-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Signing in…" : "Login"}
          </button>
        </form>
      </div>
      </div>
    </AnimatedBackground>
  );
}
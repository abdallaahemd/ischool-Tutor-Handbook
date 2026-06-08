import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/handbook/Logo";
import { AnimatedBackground } from "@/components/tutor/AnimatedBackground";
import { writeTutorSession } from "@/components/tutor/useTutorSession";

const HANDOFF_KEY = "ischool_tutor_pw_change";

interface Handoff {
  id: string;
  tutor_id: string;
  name: string;
  current_password: string;
}

export const Route = createFileRoute("/tutor/change-password")({
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const navigate = useNavigate();
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(HANDOFF_KEY);
      if (!raw) {
        navigate({ to: "/tutor/login" });
        return;
      }
      setHandoff(JSON.parse(raw) as Handoff);
    } catch {
      navigate({ to: "/tutor/login" });
    }
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!handoff) return;
    if (pw.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (pw !== pw2) {
      setError("Passwords do not match.");
      return;
    }
    if (pw === "P@ssword_1234") {
      setError("You cannot use the default password.");
      return;
    }
    if (pw === handoff.current_password) {
      setError("New password cannot match your current password.");
      return;
    }
    setBusy(true);
    try {
      const { data, error: qErr } = await supabase.rpc(
        "change_tutor_password" as never,
        {
          _tutor_id: handoff.tutor_id,
          _current_password: handoff.current_password,
          _new_password: pw,
        } as never,
      );
      if (qErr) throw qErr;
      const res = data as { ok?: boolean; error?: string } | null;
      if (!res?.ok) {
        setError(res?.error || "Could not update password.");
        return;
      }
      sessionStorage.removeItem(HANDOFF_KEY);
      writeTutorSession({
        tutor: { id: handoff.id, tutor_id: handoff.tutor_id, name: handoff.name },
        loggedInAt: new Date().toISOString(),
        loggedIn: true,
      });
      navigate({ to: "/" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
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
            <h1 className="mt-4 text-xl font-bold text-foreground">
              Welcome to iSchool Navigator
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Before continuing, you must create your own password.
            </p>
          </div>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                New Password
              </label>
              <div className="relative mt-1">
                <input
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-white/70 px-3 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted"
                  aria-label="Toggle password visibility"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Confirm New Password
              </label>
              <input
                type={show ? "text" : "password"}
                required
                minLength={8}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-border bg-white/70 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Re-enter your password"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow transition hover:bg-blue-700 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Saving…" : "Save Password"}
            </button>
          </form>
        </div>
      </div>
    </AnimatedBackground>
  );
}
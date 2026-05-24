import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/handbook/Logo";
import { useAdminSession } from "@/components/admin/useAdminSession";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const session = useAdminSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session.loading && session.isAdmin) {
      navigate({ to: "/admin/dashboard" });
    }
  }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!remember) {
          // best-effort: clear persisted token after navigation
          window.addEventListener("beforeunload", () => localStorage.clear(), { once: true });
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError("Account created. Ask an existing admin to grant you access, then sign in.");
        setMode("signin");
      }
    } catch (err: any) {
      setError(err.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={48} />
          <h1 className="mt-4 text-xl font-bold">Admin Console</h1>
          <p className="text-sm text-muted-foreground">Sign in to manage the handbook.</p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {mode === "signin" && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-border" />
              Remember me
            </label>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <div className="text-center text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>No account?{" "}
                <button type="button" onClick={() => setMode("signup")} className="text-primary underline-offset-2 hover:underline">Create one</button>
              </>
            ) : (
              <>Have an account?{" "}
                <button type="button" onClick={() => setMode("signin")} className="text-primary underline-offset-2 hover:underline">Sign in</button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
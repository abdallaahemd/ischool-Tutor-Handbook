import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { HandbookLayout } from "@/components/handbook/HandbookLayout";
import { LogoMark } from "@/components/handbook/Logo";
import { Icon } from "@/components/handbook/Icon";
import { useCategories, useAllCards } from "@/components/handbook/data";
import {
  useTutorSession,
  clearTutorSession,
} from "@/components/tutor/useTutorSession";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "iSchool Instructor Handbook" },
      { name: "description", content: "Everything tutors need — systems, sessions, policies, materials and more." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const session = useTutorSession();
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Route guard: redirect to /tutor/login if not signed in
  useEffect(() => {
    if (!session.loading && !session.isTutor) {
      navigate({ to: "/tutor/login" });
    }
  }, [session.loading, session.isTutor, navigate]);

  // Trigger sync once on startup + load last sync time
  useEffect(() => {
    if (!session.isTutor) return;
    fetch("/api/public/hooks/sync-tutors", { method: "POST" }).catch(() => {});
    supabase
      .from("sync_logs")
      .select("sync_time")
      .order("sync_time", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data[0]) setLastSync(data[0].sync_time as string);
      });
  }, [session.isTutor]);

  const handleLogout = () => {
    clearTutorSession();
    navigate({ to: "/tutor/login" });
  };

  const { data: categories = [] } = useCategories();
  const { data: cards = [] } = useAllCards();

  const countByCat = (id: string) => cards.filter((c) => c.category_id === id).length;

  if (session.loading || !session.isTutor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <HandbookLayout>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {/* Tutor session bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div className="text-sm">
            <div className="font-medium text-foreground">
              Welcome, {session.tutor?.email}
            </div>
            <div className="text-xs text-muted-foreground">
              {session.loggedInAt && (
                <>Last login: {new Date(session.loggedInAt).toLocaleString()}</>
              )}
              {lastSync && (
                <> · Last sync: {new Date(lastSync).toLocaleString()}</>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        {/* Hero */}
        <section
          className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 md:p-14"
          style={{
            backgroundImage:
              "radial-gradient(circle at top right, rgba(37,99,235,0.10), transparent 55%), radial-gradient(circle at bottom left, rgba(245,158,11,0.12), transparent 55%)",
          }}
        >
          <div className="flex flex-col items-center text-center">
            <LogoMark size={72} />
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Instructor Handbook
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
              Everything you need to run great sessions — systems, policies, materials and feedback templates, all in one place.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
              <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
              <span className="h-2 w-2 rounded-full bg-[#F97316]" />
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground md:text-2xl">Browse by category</h2>
              <p className="text-sm text-muted-foreground">Jump straight to the area you need.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/c/${cat.slug}`}
                className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_rgba(37,99,235,0.25)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-110">
                    <Icon name={cat.icon} size={22} />
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground transition group-hover:text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{cat.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>
                <div className="mt-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    {countByCat(cat.id)} resources
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </HandbookLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, Search, Sparkles } from "lucide-react";
import { HandbookLayout } from "@/components/handbook/HandbookLayout";
import { useFaqCategories, useFaqTopics, type FaqTopic } from "@/lib/faq";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — iSchool Tutor Handbook." },
      {
        name: "description",
        content:
          "Browse verified operational answers by category: attendance, sessions, technical issues, escalation and more.",
      },
      { property: "og:title", content: "Knowledge Base — iSchool Tutor Handbook." },
      {
        property: "og:description",
        content: "Every verified tutor answer, organised by category.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KnowledgePage,
});

function KnowledgePage() {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | undefined>(undefined);
  const { data: categories = [] } = useFaqCategories();
  const { data: topics = [] } = useFaqTopics(activeCat);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.main_question.toLowerCase().includes(q) ||
        t.answer.toLowerCase().includes(q),
    );
  }, [topics, query]);

  const countFor = (id: string) => topics.filter((t) => t.category_id === id).length;

  return (
    <HandbookLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <header className="rounded-3xl border border-border bg-card p-6 md:p-10">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <BookOpen className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Knowledge Base
              </h1>
              <p className="text-sm text-muted-foreground">
                Verified answers to the operational questions tutors ask most.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter topics…"
                className="h-12 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Link
              to="/ask"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground transition hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" />
              Ask a question
            </Link>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          <Chip active={!activeCat} onClick={() => setActiveCat(undefined)} label="All categories" />
          {categories.map((c) => (
            <Chip
              key={c.id}
              active={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
              label={activeCat ? c.name : `${c.name} (${countFor(c.id)})`}
            />
          ))}
        </div>

        <section className="mt-6 space-y-3">
          {filtered.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No verified topics match this filter yet.
            </p>
          )}
          {filtered.map((t) => (
            <TopicRow
              key={t.id}
              topic={t}
              categoryName={categories.find((c) => c.id === t.category_id)?.name}
            />
          ))}
        </section>
      </div>
    </HandbookLayout>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

function TopicRow({ topic, categoryName }: { topic: FaqTopic; categoryName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {categoryName && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                {categoryName}
              </span>
            )}
            {topic.priority !== "normal" && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold uppercase text-accent">
                {topic.priority}
              </span>
            )}
          </div>
          <h2 className="mt-1.5 text-sm font-semibold text-foreground">{topic.title}</h2>
          <p className="truncate text-xs text-muted-foreground">{topic.main_question}</p>
        </div>
        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-border px-4 py-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {topic.answer}
          </p>
        </div>
      )}
    </article>
  );
}

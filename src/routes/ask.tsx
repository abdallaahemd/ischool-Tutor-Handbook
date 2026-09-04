import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircleQuestion, Search, Send, Sparkles } from "lucide-react";
import { HandbookLayout } from "@/components/handbook/HandbookLayout";
import { askFaq, useFaqCategories, useFaqTopics, type FaqSearchHit, type FaqTopic } from "@/lib/faq";

export const Route = createFileRoute("/ask")({
  head: () => ({
    meta: [
      { title: "Ask About Anything — iSchool Tutor Handbook." },
      {
        name: "description",
        content:
          "Ask operational questions and get verified answers from the iSchool internal knowledge base.",
      },
      { property: "og:title", content: "Ask About Anything — iSchool Tutor Handbook." },
      {
        property: "og:description",
        content: "Verified answers to the most common tutor questions, in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AskPage,
});

interface Turn {
  question: string;
  hits: FaqSearchHit[];
  error?: string;
}

function AskPage() {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [activeCat, setActiveCat] = useState<string | undefined>(undefined);

  const { data: categories = [] } = useFaqCategories();
  const { data: topics = [] } = useFaqTopics(activeCat);

  const submit = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setInput("");
    try {
      const hits = await askFaq(q);
      setTurns((t) => [{ question: q, hits }, ...t]);
    } catch (e) {
      setTurns((t) => [
        ...t,
        { question: q, hits: [], error: e instanceof Error ? e.message : "Search failed" },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <HandbookLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <header className="rounded-3xl border border-border bg-card p-6 md:p-10">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Ask About Anything
              </h1>
              <p className="text-sm text-muted-foreground">
                Answers come only from the verified internal knowledge base.
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit(input);
            }}
            className="mt-6 flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. What do I do if a student doesn't join the session?"
                className="h-12 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{busy ? "Searching…" : "Ask"}</span>
            </button>
          </form>
        </header>

        {/* Conversation */}
        {turns.length > 0 && (
          <section className="mt-8 space-y-6">
            {turns.map((turn, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    {turn.question}
                  </div>
                </div>

                {turn.error ? (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {turn.error}
                  </div>
                ) : turn.hits.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card px-4 py-4 text-sm text-muted-foreground">
                    <MessageCircleQuestion className="mb-2 h-5 w-5 text-accent" />
                    I couldn&apos;t find a verified answer for this question in the knowledge base.
                    Please contact your Mentor or Team Leader for assistance.
                  </div>
                ) : (
                  turn.hits.map((hit, idx) => (
                    <article
                      key={hit.topic_id}
                      className={`rounded-2xl border p-4 md:p-5 ${
                        hit.match_type === "exact"
                          ? "border-primary/30 bg-primary/5 shadow-sm"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {idx === 0 && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                            Best match
                          </span>
                        )}
                        {hit.match_type && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                              hit.match_type === "exact"
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {hit.match_type} match
                          </span>
                        )}
                        {hit.category_name && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                            {hit.category_name}
                          </span>
                        )}
                        {hit.priority !== "normal" && (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold uppercase text-accent">
                            {hit.priority}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Topic
                      </p>
                      <h3 className="text-base font-semibold text-foreground">{hit.title}</h3>
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Answer
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                        {hit.answer}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground/80">
                        Verified question: “{hit.main_question}”
                        {hit.matched_variant ? ` · matched wording: “${hit.matched_variant}”` : ""}
                      </p>
                    </article>
                  ))
                )}

              </div>
            ))}
          </section>
        )}

        {/* Browse the knowledge base */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-foreground">Browse verified topics</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <FilterChip active={!activeCat} onClick={() => setActiveCat(undefined)} label="All" />
            {categories.map((c) => (
              <FilterChip
                key={c.id}
                active={activeCat === c.id}
                onClick={() => setActiveCat(c.id)}
                label={c.name}
              />
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {topics.length === 0 && (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No verified topics in this category yet.
              </p>
            )}
            {topics.map((t) => (
              <TopicItem key={t.id} topic={t} />
            ))}
          </div>
        </section>
      </div>
    </HandbookLayout>
  );
}

function FilterChip({
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

function TopicItem({ topic }: { topic: FaqTopic }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted"
      >
        <span>{topic.main_question}</span>
        <span className="text-xs text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          <p className="whitespace-pre-wrap">{topic.answer}</p>
        </div>
      )}
    </div>
  );
}

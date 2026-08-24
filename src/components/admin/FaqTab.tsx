import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  X,
  Pencil,
  AlertTriangle,
  Archive,
  BookOpen,
  History,
  Copy,
  LayoutDashboard,
  MessageSquare,
  Search,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { readAdminSession } from "@/components/admin/useAdminSession";
import {
  upsertFaqCategory,
  deleteFaqCategory,
  upsertFaqTopic,
  deleteFaqTopic,
  listFaqTopics,
  listFaqVariants,
  listAllFaqVariants,
  addFaqVariant,
  updateFaqVariant,
  deleteFaqVariant,
  checkFaqDuplicate,
  faqStats,
  faqCategoryCounts,
  listFaqAudit,
  listFaqSources,
  addFaqSource,
  deleteFaqSource,
  type FaqDuplicateHit,
  type FaqStats,
  type FaqSource,
} from "@/lib/faq-admin.functions";
import { useFaqCategories, type FaqTopic } from "@/lib/faq";

const STATUSES = ["draft", "needs_review", "verified", "archived"];
const PRIORITIES = ["normal", "important", "critical"];
const SOURCE_TYPES = ["policy", "handbook", "mentor", "team_leader", "hr", "other"];

function adminId(): string | null {
  return readAdminSession()?.admin.id ?? null;
}

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

type Sub = "overview" | "topics" | "categories" | "variants" | "duplicates" | "audit";

const SUBS: { key: Sub; label: string; icon: typeof Plus }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "topics", label: "Knowledge topics", icon: BookOpen },
  { key: "categories", label: "Categories", icon: LayoutDashboard },
  { key: "variants", label: "Question variants", icon: MessageSquare },
  { key: "duplicates", label: "Duplicate review", icon: Copy },
  { key: "audit", label: "Audit history", icon: History },
];

export function FaqTab() {
  const [sub, setSub] = useState<Sub>("overview");
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Ask About Anything</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage the verified knowledge base powering the tutor assistant.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {SUBS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSub(s.key)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              sub === s.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground border border-border hover:bg-muted"
            }`}
          >
            <s.icon className="h-4 w-4" />
            {s.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {sub === "overview" && <OverviewPanel onGo={setSub} />}
        {sub === "topics" && <TopicsPanel />}
        {sub === "categories" && <CategoriesPanel />}
        {sub === "variants" && <VariantsPanel />}
        {sub === "duplicates" && <DuplicateReviewPanel />}
        {sub === "audit" && <AuditPanel />}
      </div>
    </div>
  );
}

/* ---------------- Overview ---------------- */
function OverviewPanel({ onGo }: { onGo: (s: Sub) => void }) {
  const stats = useServerFn(faqStats);
  const q = useQuery({
    queryKey: ["faq_stats"],
    staleTime: 0,
    queryFn: async () => {
      const id = adminId();
      if (!id) return null;
      return (await stats({ data: { admin_id: id } })) as unknown as FaqStats;
    },
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const s = q.data;
  if (!s) return <p className="text-sm text-muted-foreground">No statistics available.</p>;

  const cards = [
    { label: "FAQ categories", value: s.categories },
    { label: "Knowledge topics", value: s.topics },
    { label: "Verified topics", value: s.verified },
    { label: "Draft topics", value: s.draft },
    { label: "Needs review", value: s.needs_review },
    { label: "Archived", value: s.archived },
    { label: "Question variants", value: s.variants },
    { label: "Knowledge sources", value: s.sources },
  ];

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="text-2xl font-bold text-foreground">{c.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recently updated topics</h2>
          <button
            onClick={() => onGo("topics")}
            className="text-xs font-medium text-primary hover:underline"
          >
            Manage topics
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {s.recent.length === 0 && (
            <p className="text-xs text-muted-foreground">Nothing updated yet.</p>
          )}
          {s.recent.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm text-foreground">{r.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {r.category_name ?? "—"} · {fmt(r.updated_at)}
                </div>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Categories ---------------- */
function CategoriesPanel() {
  const qc = useQueryClient();
  const { data: categories = [] } = useFaqCategories();
  const save = useServerFn(upsertFaqCategory);
  const remove = useServerFn(deleteFaqCategory);
  const counts = useServerFn(faqCategoryCounts);
  const [editing, setEditing] = useState<{ id?: string; name: string; description: string } | null>(
    null,
  );

  const countsQuery = useQuery({
    queryKey: ["faq_category_counts"],
    staleTime: 0,
    queryFn: async () => {
      const id = adminId();
      if (!id) return {} as Record<string, number>;
      const res = await counts({ data: { admin_id: id } });
      return res.counts;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["faq_categories"] });
    countsQuery.refetch();
  };

  const submit = async () => {
    const id = adminId();
    if (!id || !editing) return toast.error("Session expired. Sign in again.");
    try {
      await save({ data: { admin_id: id, ...editing } });
      toast.success("Category saved");
      setEditing(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save category");
    }
  };

  const del = async (catId: string) => {
    const id = adminId();
    if (!id) return toast.error("Session expired. Sign in again.");
    if (!confirm("Delete this category?")) return;
    try {
      await remove({ data: { admin_id: id, id: catId } });
      toast.success("Category deleted");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete category");
    }
  };

  return (
    <div>
      <button
        onClick={() => setEditing({ name: "", description: "" })}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        <Plus className="h-4 w-4" /> New category
      </button>

      <div className="mt-4 space-y-2">
        {categories.map((c) => {
          const n = countsQuery.data?.[c.id] ?? 0;
          return (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
                    {n} topic{n === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{c.description}</div>
              </div>
              <div className="flex gap-1">
                <IconBtn
                  onClick={() =>
                    setEditing({ id: c.id, name: c.name, description: c.description ?? "" })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </IconBtn>
                <IconBtn onClick={() => del(c.id)} disabled={n > 0} title={n > 0 ? "Move or delete its topics first" : "Delete"}>
                  <Trash2 className={`h-4 w-4 ${n > 0 ? "text-muted-foreground" : "text-destructive"}`} />
                </IconBtn>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <Modal title={editing.id ? "Edit category" : "New category"} onClose={() => setEditing(null)}>
          <Field label="Name">
            <input
              className="input"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </Field>
          <Field label="Description">
            <textarea
              className="input min-h-20"
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
          </Field>
          <ModalActions onCancel={() => setEditing(null)} onSave={submit} />
        </Modal>
      )}
    </div>
  );
}

/* ---------------- Topics ---------------- */
type TopicDraft = {
  id?: string;
  category_id: string;
  title: string;
  main_question: string;
  answer: string;
  status: string;
  priority: string;
  last_verified_at?: string;
};

function toDraft(t: FaqTopic): TopicDraft {
  return {
    id: t.id,
    category_id: t.category_id,
    title: t.title,
    main_question: t.main_question,
    answer: t.answer,
    status: t.status,
    priority: t.priority,
    last_verified_at: t.last_verified_at ? t.last_verified_at.slice(0, 10) : "",
  };
}

function TopicsPanel() {
  const { data: categories = [] } = useFaqCategories();
  const list = useServerFn(listFaqTopics);
  const save = useServerFn(upsertFaqTopic);
  const remove = useServerFn(deleteFaqTopic);
  const [editing, setEditing] = useState<TopicDraft | null>(null);
  const [variantsFor, setVariantsFor] = useState<FaqTopic | null>(null);
  const [sourcesFor, setSourcesFor] = useState<FaqTopic | null>(null);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const topicsQuery = useQuery({
    queryKey: ["faq_admin_topics"],
    staleTime: 0,
    queryFn: async () => {
      const id = adminId();
      if (!id) return [] as FaqTopic[];
      const res = await list({ data: { admin_id: id } });
      return (res.rows ?? []) as unknown as FaqTopic[];
    },
  });

  const topics = topicsQuery.data ?? [];
  const visible = useMemo(
    () =>
      topics.filter(
        (t) =>
          (!statusFilter || t.status === statusFilter) &&
          (!filter.trim() ||
            t.main_question.toLowerCase().includes(filter.toLowerCase()) ||
            t.title.toLowerCase().includes(filter.toLowerCase())),
      ),
    [topics, filter, statusFilter],
  );

  const submit = async () => {
    const id = adminId();
    if (!id || !editing) return toast.error("Session expired. Sign in again.");
    try {
      await save({ data: { admin_id: id, ...editing } });
      toast.success("Topic saved");
      setEditing(null);
      topicsQuery.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save topic");
    }
  };

  const archive = async (t: FaqTopic) => {
    const id = adminId();
    if (!id) return toast.error("Session expired. Sign in again.");
    try {
      await save({ data: { admin_id: id, ...toDraft(t), status: "archived" } });
      toast.success("Topic archived");
      topicsQuery.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not archive topic");
    }
  };

  const del = async (topicId: string) => {
    const id = adminId();
    if (!id) return toast.error("Session expired. Sign in again.");
    if (!confirm("Delete this topic and all its question variants?")) return;
    try {
      await remove({ data: { admin_id: id, id: topicId } });
      toast.success("Topic deleted");
      topicsQuery.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete topic");
    }
  };

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() =>
            setEditing({
              category_id: categories[0]?.id ?? "",
              title: "",
              main_question: "",
              answer: "",
              status: "draft",
              priority: "normal",
              last_verified_at: "",
            })
          }
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New topic
        </button>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter topics…"
          className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-2">
        {topicsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!topicsQuery.isLoading && visible.length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No topics yet.
          </p>
        )}
        {visible.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{t.main_question}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                    {catName(t.category_id)}
                  </span>
                  <StatusBadge status={t.status} />
                  {t.priority !== "normal" && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 font-semibold uppercase text-accent">
                      {t.priority}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Created {fmt(t.created_at)} · Updated {fmt(t.updated_at)} · Last verified{" "}
                  {t.last_verified_at ? fmt(t.last_verified_at) : "never"}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setVariantsFor(t)}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                >
                  Variants
                </button>
                <button
                  onClick={() => setSourcesFor(t)}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                >
                  Sources
                </button>
                {t.status !== "archived" && (
                  <IconBtn onClick={() => archive(t)} title="Archive topic">
                    <Archive className="h-4 w-4" />
                  </IconBtn>
                )}
                <IconBtn onClick={() => setEditing(toDraft(t))}>
                  <Pencil className="h-4 w-4" />
                </IconBtn>
                <IconBtn onClick={() => del(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </IconBtn>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <TopicModal
          draft={editing}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={submit}
          onOpenExisting={(topicId) => {
            const t = topics.find((x) => x.id === topicId);
            if (!t) return toast.error("That topic is no longer available");
            setEditing(toDraft(t));
          }}
          onAddedVariant={() => {
            setEditing(null);
            topicsQuery.refetch();
          }}
        />
      )}

      {variantsFor && <VariantsModal topic={variantsFor} onClose={() => setVariantsFor(null)} />}
      {sourcesFor && <SourcesModal topic={sourcesFor} onClose={() => setSourcesFor(null)} />}
    </div>
  );
}

function TopicModal({
  draft,
  categories,
  onChange,
  onClose,
  onSave,
  onOpenExisting,
  onAddedVariant,
}: {
  draft: TopicDraft;
  categories: { id: string; name: string }[];
  onChange: (d: TopicDraft) => void;
  onClose: () => void;
  onSave: () => void;
  onOpenExisting: (topicId: string) => void;
  onAddedVariant: () => void;
}) {
  const check = useServerFn(checkFaqDuplicate);
  const addVariant = useServerFn(addFaqVariant);
  const [hits, setHits] = useState<FaqDuplicateHit[]>([]);
  const [gate, setGate] = useState<
    | null
    | { kind: "exact"; hit: FaqDuplicateHit }
    | { kind: "similar"; hits: FaqDuplicateHit[] }
  >(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = draft.main_question.trim();
    const id = adminId();
    if (draft.id || !id || q.length < 8) {
      setHits([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await check({ data: { admin_id: id, question: q } });
        setHits(res.exact ? [res.exact, ...res.similar] : res.similar);
      } catch {
        setHits([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [draft.main_question, draft.id, check]);

  const guardedSave = async () => {
    const id = adminId();
    const q = draft.main_question.trim();
    if (draft.id || !id || !q) return onSave();
    setBusy(true);
    try {
      const res = await check({ data: { admin_id: id, question: q } });
      if (res.exact) {
        setGate({ kind: "exact", hit: res.exact });
        return;
      }
      if (res.similar.length > 0) {
        setGate({ kind: "similar", hits: res.similar });
        return;
      }
      onSave();
    } catch {
      onSave();
    } finally {
      setBusy(false);
    }
  };

  const addAsVariant = async (topicId: string) => {
    const id = adminId();
    if (!id) return toast.error("Session expired. Sign in again.");
    setBusy(true);
    try {
      await addVariant({
        data: { admin_id: id, topic_id: topicId, variant: draft.main_question.trim() },
      });
      toast.success("Added as a question variant of the existing topic");
      setGate(null);
      onAddedVariant();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add the variant");
    } finally {
      setBusy(false);
    }
  };

  if (gate?.kind === "exact") {
    return (
      <Modal title="This question already exists." onClose={() => setGate(null)}>
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Exact match found
            {gate.hit.matched_on === "variant" && " (existing question variant)"}
          </div>
          <p className="mt-2 font-medium text-foreground">{gate.hit.main_question}</p>
          {gate.hit.matched_variant && (
            <p className="mt-1 text-xs text-muted-foreground">
              Matched wording: “{gate.hit.matched_variant}”
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">Status: {gate.hit.status}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={() => setGate(null)}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={() => addAsVariant(gate.hit.topic_id)}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
          >
            Add as variant
          </button>
          <button
            onClick={() => {
              setGate(null);
              onOpenExisting(gate.hit.topic_id);
            }}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Open existing topic
          </button>
        </div>
      </Modal>
    );
  }

  if (gate?.kind === "similar") {
    return (
      <Modal title="Possible similar questions found" onClose={() => setGate(null)}>
        <p className="text-sm text-muted-foreground">
          Choose whether your question belongs to one of these topics, or is a different topic.
        </p>
        <div className="space-y-2">
          {gate.hits.map((h) => (
            <div key={h.topic_id} className="rounded-lg border border-border bg-card p-3">
              <div className="text-sm font-medium text-foreground">{h.main_question}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {h.title}
                {h.matched_variant ? ` · variant: “${h.matched_variant}”` : ""}
                {typeof h.score === "number" ? ` · ${Math.round(h.score * 100)}% similar` : ""}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  disabled={busy}
                  onClick={() => addAsVariant(h.topic_id)}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  This is the same topic
                </button>
                <button
                  onClick={() => {
                    setGate(null);
                    onOpenExisting(h.topic_id);
                  }}
                  className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  Open existing topic
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={() => setGate(null)}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setGate(null);
              onSave();
            }}
            className="rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          >
            This is a different topic
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={draft.id ? "Edit topic" : "New topic"} onClose={onClose}>
      <Field label="Category">
        <select
          className="input"
          value={draft.category_id}
          onChange={(e) => onChange({ ...draft, category_id: e.target.value })}
        >
          <option value="">Select a category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Canonical question">
        <input
          className="input"
          value={draft.main_question}
          onChange={(e) => onChange({ ...draft, main_question: e.target.value })}
        />
      </Field>

      {hits.length > 0 && (
        <div className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-xs">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <AlertTriangle className="h-4 w-4 text-accent" /> Possible duplicates
          </div>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {hits.map((h) => (
              <li key={h.topic_id}>• {h.main_question}</li>
            ))}
          </ul>
        </div>
      )}

      <Field label="Short title (optional)">
        <input
          className="input"
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
        />
      </Field>
      <Field label="Official answer">
        <textarea
          className="input min-h-40"
          value={draft.answer}
          onChange={(e) => onChange({ ...draft, answer: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Status">
          <select
            className="input"
            value={draft.status}
            onChange={(e) => onChange({ ...draft, status: e.target.value })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            className="input"
            value={draft.priority}
            onChange={(e) => onChange({ ...draft, priority: e.target.value })}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Last verified date">
          <input
            type="date"
            className="input"
            value={draft.last_verified_at ?? ""}
            onChange={(e) => onChange({ ...draft, last_verified_at: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions onCancel={onClose} onSave={draft.id ? onSave : guardedSave} busy={busy} />
    </Modal>
  );
}

/* ---------------- Sources ---------------- */
function SourcesModal({ topic, onClose }: { topic: FaqTopic; onClose: () => void }) {
  const list = useServerFn(listFaqSources);
  const add = useServerFn(addFaqSource);
  const remove = useServerFn(deleteFaqSource);
  const [form, setForm] = useState({ source_type: SOURCE_TYPES[0], source_reference: "", notes: "" });

  const q = useQuery({
    queryKey: ["faq_sources", topic.id],
    staleTime: 0,
    queryFn: async () => {
      const id = adminId();
      if (!id) return [] as FaqSource[];
      const res = await list({ data: { admin_id: id, topic_id: topic.id } });
      return res.rows;
    },
  });

  const submit = async () => {
    const id = adminId();
    if (!id) return toast.error("Session expired. Sign in again.");
    try {
      await add({ data: { admin_id: id, topic_id: topic.id, ...form } });
      setForm({ source_type: SOURCE_TYPES[0], source_reference: "", notes: "" });
      toast.success("Source added");
      q.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add source");
    }
  };

  const del = async (sourceId: string) => {
    const id = adminId();
    if (!id) return;
    try {
      await remove({ data: { admin_id: id, id: sourceId } });
      q.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete source");
    }
  };

  return (
    <Modal title="Knowledge sources" onClose={onClose}>
      <p className="text-xs text-muted-foreground">{topic.main_question}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Source type">
          <select
            className="input"
            value={form.source_type}
            onChange={(e) => setForm({ ...form, source_type: e.target.value })}
          >
            {SOURCE_TYPES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reference (link or document)">
          <input
            className="input"
            value={form.source_reference}
            onChange={(e) => setForm({ ...form, source_reference: e.target.value })}
          />
        </Field>
        <Field label="Notes">
          <input
            className="input"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <button
          onClick={submit}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Add source
        </button>
      </div>
      <div className="space-y-2">
        {(q.data ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">No sources recorded yet.</p>
        )}
        {(q.data ?? []).map((s) => (
          <div
            key={s.id}
            className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <div className="font-medium capitalize text-foreground">
                {s.source_type.replace("_", " ")}
              </div>
              {s.source_reference && (
                <div className="truncate text-xs text-muted-foreground">{s.source_reference}</div>
              )}
              {s.notes && <div className="text-xs text-muted-foreground">{s.notes}</div>}
            </div>
            <IconBtn onClick={() => del(s.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </IconBtn>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">
          Done
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- Variants (per topic) ---------------- */
function VariantsModal({ topic, onClose }: { topic: FaqTopic; onClose: () => void }) {
  const list = useServerFn(listFaqVariants);
  const add = useServerFn(addFaqVariant);
  const update = useServerFn(updateFaqVariant);
  const remove = useServerFn(deleteFaqVariant);
  const [text, setText] = useState("");

  const q = useQuery({
    queryKey: ["faq_variants", topic.id],
    staleTime: 0,
    queryFn: async () => {
      const id = adminId();
      if (!id) return [];
      const res = await list({ data: { admin_id: id, topic_id: topic.id } });
      return res.rows as { id: string; variant: string }[];
    },
  });

  const submit = async () => {
    const id = adminId();
    if (!id) return toast.error("Session expired. Sign in again.");
    try {
      await add({ data: { admin_id: id, topic_id: topic.id, variant: text } });
      setText("");
      q.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add variant");
    }
  };

  const edit = async (variantId: string, current: string) => {
    const id = adminId();
    if (!id) return;
    const next = prompt("Edit variant wording", current);
    if (next === null || !next.trim() || next === current) return;
    try {
      await update({ data: { admin_id: id, id: variantId, variant: next } });
      toast.success("Variant updated");
      q.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update variant");
    }
  };

  const del = async (variantId: string) => {
    const id = adminId();
    if (!id) return;
    try {
      await remove({ data: { admin_id: id, id: variantId } });
      q.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete variant");
    }
  };

  return (
    <Modal title="Question variants" onClose={onClose}>
      <p className="text-xs text-muted-foreground">{topic.main_question}</p>
      <div className="flex gap-2">
        <input
          className="input"
          value={text}
          placeholder="Another way tutors phrase this question…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <button
          onClick={submit}
          className="rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          Add
        </button>
      </div>
      <div className="space-y-2">
        {(q.data ?? []).map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
          >
            <span>{v.variant}</span>
            <div className="flex gap-1">
              <IconBtn onClick={() => edit(v.id, v.variant)}>
                <Pencil className="h-4 w-4" />
              </IconBtn>
              <IconBtn onClick={() => del(v.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </IconBtn>
            </div>
          </div>
        ))}
        {(q.data ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">No variants yet.</p>
        )}
      </div>
      <div className="flex justify-end">
        <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">
          Done
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- Variants (global management) ---------------- */
function VariantsPanel() {
  const list = useServerFn(listAllFaqVariants);
  const update = useServerFn(updateFaqVariant);
  const remove = useServerFn(deleteFaqVariant);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<{ id: string; variant: string } | null>(null);

  const q = useQuery({
    queryKey: ["faq_all_variants"],
    staleTime: 0,
    queryFn: async () => {
      const id = adminId();
      if (!id) return [];
      const res = await list({ data: { admin_id: id } });
      return res.rows;
    },
  });

  const rows = (q.data ?? []).filter(
    (r) =>
      !filter.trim() ||
      r.variant.toLowerCase().includes(filter.toLowerCase()) ||
      r.topic_question.toLowerCase().includes(filter.toLowerCase()),
  );

  const save = async () => {
    const id = adminId();
    if (!id || !editing) return;
    try {
      await update({ data: { admin_id: id, id: editing.id, variant: editing.variant } });
      toast.success("Variant updated");
      setEditing(null);
      q.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update variant");
    }
  };

  const del = async (variantId: string) => {
    const id = adminId();
    if (!id) return;
    if (!confirm("Delete this question variant?")) return;
    try {
      await remove({ data: { admin_id: id, id: variantId } });
      toast.success("Variant deleted");
      q.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete variant");
    }
  };

  return (
    <div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter variants or topics…"
        className="h-9 w-full max-w-sm rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
      <div className="mt-4 space-y-2">
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!q.isLoading && rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No question variants yet. Add them from a topic in the Knowledge topics tab.
          </p>
        )}
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="min-w-0">
              <div className="text-sm text-foreground">{r.variant}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span>Topic: {r.topic_question}</span>
                <StatusBadge status={r.topic_status} />
              </div>
            </div>
            <div className="flex gap-1">
              <IconBtn onClick={() => setEditing({ id: r.id, variant: r.variant })}>
                <Pencil className="h-4 w-4" />
              </IconBtn>
              <IconBtn onClick={() => del(r.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </IconBtn>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title="Edit question variant" onClose={() => setEditing(null)}>
          <Field label="Variant wording">
            <input
              className="input"
              value={editing.variant}
              onChange={(e) => setEditing({ ...editing, variant: e.target.value })}
            />
          </Field>
          <ModalActions onCancel={() => setEditing(null)} onSave={save} />
        </Modal>
      )}
    </div>
  );
}

/* ---------------- Duplicate review ---------------- */
function DuplicateReviewPanel() {
  const { data: categories = [] } = useFaqCategories();
  const check = useServerFn(checkFaqDuplicate);
  const addVariant = useServerFn(addFaqVariant);
  const saveTopic = useServerFn(upsertFaqTopic);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    exact: FaqDuplicateHit | null;
    similar: FaqDuplicateHit[];
  } | null>(null);
  const [draft, setDraft] = useState<TopicDraft | null>(null);

  const run = async () => {
    const id = adminId();
    if (!id) return toast.error("Session expired. Sign in again.");
    if (!question.trim()) return;
    setBusy(true);
    try {
      const res = await check({ data: { admin_id: id, question: question.trim() } });
      setResult({ exact: res.exact, similar: res.similar });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not run the duplicate check");
    } finally {
      setBusy(false);
    }
  };

  const asVariant = async (topicId: string) => {
    const id = adminId();
    if (!id) return;
    try {
      await addVariant({ data: { admin_id: id, topic_id: topicId, variant: question.trim() } });
      toast.success("Added as a variant of the existing topic");
      setQuestion("");
      setResult(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add the variant");
    }
  };

  const createNew = () =>
    setDraft({
      category_id: categories[0]?.id ?? "",
      title: "",
      main_question: question.trim(),
      answer: "",
      status: "draft",
      priority: "normal",
      last_verified_at: "",
    });

  const submitDraft = async () => {
    const id = adminId();
    if (!id || !draft) return;
    try {
      await saveTopic({ data: { admin_id: id, ...draft } });
      toast.success("New topic created");
      setDraft(null);
      setQuestion("");
      setResult(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the topic");
    }
  };

  const hitCard = (h: FaqDuplicateHit, label?: string) => (
    <div key={h.topic_id + (h.matched_variant ?? "")} className="rounded-xl border border-border bg-card p-4">
      {label && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-primary">
          {label}
        </span>
      )}
      <div className="mt-2 text-sm font-medium text-foreground">{h.main_question}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {h.title}
        {h.matched_variant ? ` · variant: “${h.matched_variant}”` : ""}
        {typeof h.score === "number" ? ` · ${Math.round(h.score * 100)}% similar` : ""} ·{" "}
        {h.status}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => asVariant(h.topic_id)}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Same topic — add as variant
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Review a question for duplicates</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste a question tutors are asking. We check canonical questions and existing variants
          before anything new is created.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="input flex-1"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What if my student is 10 minutes late?"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void run();
              }
            }}
          />
          <button
            onClick={run}
            disabled={busy || !question.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            <Search className="h-4 w-4" /> {busy ? "Checking…" : "Check"}
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-5 space-y-3">
          {result.exact ? (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" /> This question already exists.
              </div>
              {hitCard(result.exact, "Exact duplicate")}
            </>
          ) : result.similar.length > 0 ? (
            <div className="text-sm font-medium text-foreground">
              Possible similar questions found
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No duplicates or similar questions found — this looks like a completely new topic.
            </div>
          )}

          {result.similar.map((h) => hitCard(h))}

          <div className="flex justify-end">
            <button
              onClick={createNew}
              className="rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
            >
              Different topic — create new topic
            </button>
          </div>
        </div>
      )}

      {draft && (
        <TopicModal
          draft={draft}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={submitDraft}
          onOpenExisting={() => setDraft(null)}
          onAddedVariant={() => {
            setDraft(null);
            setQuestion("");
            setResult(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Audit history ---------------- */
function AuditPanel() {
  const list = useServerFn(listFaqAudit);
  const q = useQuery({
    queryKey: ["faq_audit"],
    staleTime: 0,
    queryFn: async () => {
      const id = adminId();
      if (!id) return [];
      const res = await list({ data: { admin_id: id } });
      return res.rows as {
        id: string;
        action: string;
        table_name: string | null;
        record_id: string | null;
        created_at: string;
        new_data: Record<string, unknown> | null;
      }[];
    },
  });

  const label = (r: { new_data: Record<string, unknown> | null }) => {
    const d = r.new_data;
    if (!d) return "";
    return (d["main_question"] as string) ?? (d["variant"] as string) ?? (d["name"] as string) ?? "";
  };

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">Recent FAQ system changes</h2>
      <div className="mt-3 space-y-2">
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!q.isLoading && (q.data ?? []).length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No changes recorded yet.
          </p>
        )}
        {(q.data ?? []).map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="min-w-0">
              <div className="text-sm text-foreground">
                <span className="font-medium capitalize">{r.action}</span> ·{" "}
                {(r.table_name ?? "").replace("faq_", "").replace(/_/g, " ")}
              </div>
              <div className="truncate text-xs text-muted-foreground">{label(r)}</div>
            </div>
            <span className="text-[11px] text-muted-foreground">{fmt(r.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Shared bits ---------------- */
function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "verified"
      ? "bg-primary/10 text-primary"
      : status === "needs_review"
        ? "bg-accent/15 text-accent"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 font-medium capitalize ${tone}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded-md p-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ModalActions({
  onCancel,
  onSave,
  busy,
}: {
  onCancel: () => void;
  onSave: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm">
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={busy}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        Save
      </button>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4">
      <div className="mt-10 w-full max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

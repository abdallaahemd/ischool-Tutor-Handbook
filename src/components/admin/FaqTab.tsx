import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, X, Pencil, AlertTriangle } from "lucide-react";
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
  addFaqVariant,
  deleteFaqVariant,
  checkFaqDuplicate,
  type FaqDuplicateHit,
} from "@/lib/faq-admin.functions";
import { useFaqCategories, type FaqTopic } from "@/lib/faq";

const STATUSES = ["draft", "needs_review", "verified", "archived"];
const PRIORITIES = ["normal", "important", "critical"];

function adminId(): string | null {
  return readAdminSession()?.admin.id ?? null;
}

export function FaqTab() {
  const [sub, setSub] = useState<"topics" | "categories">("topics");
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Ask About Anything</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage the verified knowledge base powering the tutor assistant.
      </p>
      <div className="mt-5 flex gap-2">
        {(["topics", "categories"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
              sub === s
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground border border-border hover:bg-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="mt-6">{sub === "topics" ? <TopicsPanel /> : <CategoriesPanel />}</div>
    </div>
  );
}

/* ---------------- Categories ---------------- */
function CategoriesPanel() {
  const qc = useQueryClient();
  const { data: categories = [] } = useFaqCategories();
  const save = useServerFn(upsertFaqCategory);
  const remove = useServerFn(deleteFaqCategory);
  const [editing, setEditing] = useState<{ id?: string; name: string; description: string } | null>(
    null,
  );

  const refresh = () => qc.invalidateQueries({ queryKey: ["faq_categories"] });

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
    if (!confirm("Delete this category and everything inside it?")) return;
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
        {categories.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <div>
              <div className="text-sm font-medium text-foreground">{c.name}</div>
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
              <IconBtn onClick={() => del(c.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </IconBtn>
            </div>
          </div>
        ))}
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
};

function TopicsPanel() {
  const { data: categories = [] } = useFaqCategories();
  const list = useServerFn(listFaqTopics);
  const save = useServerFn(upsertFaqTopic);
  const remove = useServerFn(deleteFaqTopic);
  const [editing, setEditing] = useState<TopicDraft | null>(null);
  const [variantsFor, setVariantsFor] = useState<FaqTopic | null>(null);
  const [filter, setFilter] = useState("");

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
          !filter.trim() ||
          t.main_question.toLowerCase().includes(filter.toLowerCase()) ||
          t.title.toLowerCase().includes(filter.toLowerCase()),
      ),
    [topics, filter],
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
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setVariantsFor(t)}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                >
                  Variants
                </button>
                <IconBtn
                  onClick={() =>
                    setEditing({
                      id: t.id,
                      category_id: t.category_id,
                      title: t.title,
                      main_question: t.main_question,
                      answer: t.answer,
                      status: t.status,
                      priority: t.priority,
                    })
                  }
                >
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
            setEditing({
              id: t.id,
              category_id: t.category_id,
              title: t.title,
              main_question: t.main_question,
              answer: t.answer,
              status: t.status,
              priority: t.priority,
            });
          }}
          onAddedVariant={() => {
            setEditing(null);
            topicsQuery.refetch();
          }}
        />
      )}

      {variantsFor && (
        <VariantsModal topic={variantsFor} onClose={() => setVariantsFor(null)} />
      )}
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
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
      <ModalActions onCancel={onClose} onSave={onSave} />
    </Modal>
  );
}

function VariantsModal({ topic, onClose }: { topic: FaqTopic; onClose: () => void }) {
  const list = useServerFn(listFaqVariants);
  const add = useServerFn(addFaqVariant);
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
            <IconBtn onClick={() => del(v.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </IconBtn>
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

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-md p-2 hover:bg-muted">
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

function ModalActions({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm">
        Cancel
      </button>
      <button
        onClick={onSave}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
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

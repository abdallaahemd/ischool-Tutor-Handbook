import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Folder,
  FileText,
  Upload,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  X,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  useAdminSession,
  clearAdminSession,
  readAdminSession,
} from "@/components/admin/useAdminSession";
import { LogoMark } from "@/components/handbook/Logo";
import {
  useCategories,
  useAllCards,
  type Category,
  type Card,
} from "@/components/handbook/data";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { importTutors, listImportLogs } from "@/lib/tutors.functions";
import {
  upsertCategory,
  deleteCategory as deleteCategoryFn,
  upsertCard,
  deleteCard as deleteCardFn,
} from "@/lib/admin-crud.functions";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

function requireAdmin(navigate: ReturnType<typeof useNavigate>): boolean {
  const session = readAdminSession();
  if (!session) {
    toast.error("Session expired. Please sign in again.");
    navigate({ to: "/login" });
    return false;
  }
  return true;
}

type Tab = "dashboard" | "categories" | "cards" | "tutors" | "faq";

function AdminDashboard() {
  const navigate = useNavigate();
  const session = useAdminSession();
  const [tab, setTab] = useState<Tab>("dashboard");

  useEffect(() => {
    if (!session.loading && !session.isAdmin) {
      navigate({ to: "/login" });
    }
  }, [session, navigate]);

  const logout = () => {
    clearAdminSession();
    navigate({ to: "/login" });
  };

  if (session.loading || !session.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 w-60 border-r border-border bg-card">
        <div className="flex h-20 items-center gap-3 border-b border-border px-5">
          <LogoMark size={32} />
          <div className="text-sm font-semibold text-foreground">Admin</div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          <AdminNav active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
          <AdminNav active={tab === "categories"} onClick={() => setTab("categories")} icon={<Folder className="h-4 w-4" />} label="Categories" />
          <AdminNav active={tab === "cards"} onClick={() => setTab("cards")} icon={<FileText className="h-4 w-4" />} label="Cards" />
          <AdminNav active={tab === "tutors"} onClick={() => setTab("tutors")} icon={<Upload className="h-4 w-4" />} label="Tutors" />
          <AdminNav active={tab === "faq"} onClick={() => setTab("faq")} icon={<Sparkles className="h-4 w-4" />} label="Ask About Anything" />
          <button onClick={logout} className="mt-6 inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </nav>
      </aside>

      <main className="ml-60 p-6 md:p-10">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "categories" && <CategoriesTab />}
        {tab === "cards" && <CardsTab />}
        {tab === "tutors" && <TutorsTab />}
        {tab === "faq" && <FaqTab />}
      </main>
    </div>
  );
}

function AdminNav({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
        active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
      }`}
    >
      {icon} {label}
    </button>
  );
}

/* ---------- Dashboard ---------- */
function DashboardTab() {
  const { data: categories = [] } = useCategories();
  const { data: cards = [] } = useAllCards();
  const pdfCount = cards.filter((c) => c.icon_style === "pdf").length;
  const linkCount = cards.length - pdfCount;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Overview</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Categories" value={categories.length} />
        <Stat label="Cards" value={cards.length} />
        <Stat label="PDFs" value={pdfCount} />
        <Stat label="Links" value={linkCount} />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-foreground">Cards by category</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-medium text-foreground">{c.name}</div>
            <div className="mt-1 text-2xl font-bold text-primary">
              {cards.filter((x) => x.category_id === c.id).length}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value}</div>
    </div>
  );
}

/* ---------- Categories ---------- */
function CategoriesTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const session = useAdminSession();
  const { data: categories = [] } = useCategories();
  const { data: cards = [] } = useAllCards();
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const upsertCategoryFn = useServerFn(upsertCategory);
  const removeCategoryFn = useServerFn(deleteCategoryFn);

  const save = async () => {
    if (!editing) return;
    if (!requireAdmin(navigate)) return;
    try {
      await upsertCategoryFn({
        data: {
          admin_id: session.admin?.id ?? "",
          id: editing.id,
          name: editing.name ?? "",
          slug: editing.slug ?? "",
          icon: editing.icon ?? "Folder",
          description: editing.description ?? "",
          order: editing.order ?? 0,
        } as never,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      return;
    }
    toast.success(editing.id ? "Category updated" : "Category created");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const remove = async (id: string) => {
    if (!requireAdmin(navigate)) return;
    if (!confirm("Delete this category?")) return;
    try {
      await removeCategoryFn({
        data: { admin_id: session.admin?.id ?? "", id } as never,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      return;
    }
    toast.success("Category deleted");
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Categories</h1>
        <button onClick={() => setEditing({})} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 h-9 text-sm font-medium text-primary-foreground hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New
        </button>
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Slug</th>
              <th className="px-4 py-2 text-left">Icon</th>
              <th className="px-4 py-2 text-left">Order</th>
              <th className="px-4 py-2 text-left">Cards</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium text-foreground">{c.name}</td>
                <td className="px-4 py-2 text-muted-foreground">{c.slug}</td>
                <td className="px-4 py-2 text-muted-foreground">{c.icon}</td>
                <td className="px-4 py-2 text-muted-foreground">{c.order}</td>
                <td className="px-4 py-2 text-muted-foreground">{cards.filter((x) => x.category_id === c.id).length}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setEditing(c)} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(c.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? "Edit category" : "New category"} onClose={() => setEditing(null)} onSave={save}>
          <Field label="Name" value={editing.name ?? ""} onChange={(v) => setEditing({ ...editing, name: v })} />
          <Field label="Slug" value={editing.slug ?? ""} onChange={(v) => setEditing({ ...editing, slug: v })} />
          <Field label="Icon (Lucide name)" value={editing.icon ?? ""} onChange={(v) => setEditing({ ...editing, icon: v })} />
          <Field label="Description" value={editing.description ?? ""} onChange={(v) => setEditing({ ...editing, description: v })} />
          <Field label="Order" type="number" value={String(editing.order ?? 0)} onChange={(v) => setEditing({ ...editing, order: Number(v) })} />
        </Modal>
      )}
    </div>
  );
}

/* ---------- Cards ---------- */
function CardsTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const session = useAdminSession();
  const { data: categories = [] } = useCategories();
  const { data: cards = [] } = useAllCards();
  const [filter, setFilter] = useState<string>("");
  const [editing, setEditing] = useState<Partial<Card> | null>(null);
  const upsertCardFn = useServerFn(upsertCard);
  const removeCardFn = useServerFn(deleteCardFn);

  const filtered = filter ? cards.filter((c) => c.category_id === filter) : cards;

  const save = async () => {
    if (!editing) return;
    if (!requireAdmin(navigate)) return;
    try {
      await upsertCardFn({
        data: {
          admin_id: session.admin?.id ?? "",
          id: editing.id,
          category_id: editing.category_id!,
          header: editing.header ?? "",
          body: editing.body ?? "",
          icon_style: editing.icon_style ?? "link",
          icon: editing.icon ?? "Link2",
          view_link: editing.view_link || null,
          open_link: editing.open_link ?? "",
          order: editing.order ?? 0,
          sheet_filters: editing.sheet_filters ?? [],
        } as never,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      return;
    }
    toast.success(editing.id ? "Card updated" : "Card created");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["cards"] });
  };

  const remove = async (id: string) => {
    if (!requireAdmin(navigate)) return;
    if (!confirm("Delete this card?")) return;
    try {
      await removeCardFn({
        data: { admin_id: session.admin?.id ?? "", id } as never,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      return;
    }
    toast.success("Card deleted");
    qc.invalidateQueries({ queryKey: ["cards"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Cards</h1>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded-md border border-border bg-background px-3 text-sm">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => setEditing({ category_id: categories[0]?.id, icon_style: "link", icon: "Link2" })} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 h-9 text-sm font-medium text-primary-foreground hover:bg-blue-700">
            <Plus className="h-4 w-4" /> New
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Header</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Order</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium text-foreground">{c.header}</td>
                <td className="px-4 py-2 text-muted-foreground">{categories.find((x) => x.id === c.category_id)?.name}</td>
                <td className="px-4 py-2 uppercase text-muted-foreground">{c.icon_style}</td>
                <td className="px-4 py-2 text-muted-foreground">{c.order}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setEditing(c)} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(c.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? "Edit card" : "New card"} onClose={() => setEditing(null)} onSave={save}>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</label>
            <select value={editing.category_id ?? ""} onChange={(e) => setEditing({ ...editing, category_id: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Field label="Header" value={editing.header ?? ""} onChange={(v) => setEditing({ ...editing, header: v })} />
          <Field label="Body" value={editing.body ?? ""} onChange={(v) => setEditing({ ...editing, body: v })} />
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Icon Style</label>
            <select value={editing.icon_style ?? "link"} onChange={(e) => setEditing({ ...editing, icon_style: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
              <option value="pdf">PDF</option>
              <option value="video">VIDEO</option>
              <option value="link">LINK</option>
            </select>
          </div>
          <Field label="Icon (Lucide name)" value={editing.icon ?? ""} onChange={(v) => setEditing({ ...editing, icon: v })} />
          <Field label="View link (optional)" value={editing.view_link ?? ""} onChange={(v) => setEditing({ ...editing, view_link: v })} />
          <Field label="Open link" value={editing.open_link ?? ""} onChange={(v) => setEditing({ ...editing, open_link: v })} />
          <Field label="Order" type="number" value={String(editing.order ?? 0)} onChange={(v) => setEditing({ ...editing, order: Number(v) })} />
          {/docs\.google\.com\/spreadsheets\//.test(editing.open_link ?? "") && (
            <Field
              label="Sheet filters (comma-separated header names)"
              value={(editing.sheet_filters ?? []).join(", ")}
              onChange={(v) =>
                setEditing({
                  ...editing,
                  sheet_filters: v
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          )}
        </Modal>
      )}
    </div>
  );
}

/* ---------- Tutors CSV Import ---------- */
interface ParsedRow { tutor_id: string; password: string; name: string }
interface ImportLog {
  id: string; imported_at: string; filename: string | null;
  total_records: number; added_count: number; updated_count: number;
  deleted_count: number; failed_count: number; status: string;
}

function parseCsvText(text: string): string[][] {
  const rows: string[][] = []; let cur: string[] = []; let field = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { cur.push(field); field = ""; }
    else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.some((v) => v && v.length));
}

function TutorsTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const session = useAdminSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string>("");
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [parseError, setParseError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const importTutorsFn = useServerFn(importTutors);
  const listLogsFn = useServerFn(listImportLogs);

  const { data: logsData } = useQuery({
    queryKey: ["tutor_import_logs"],
    queryFn: () => listLogsFn(),
  });
  const logs: ImportLog[] = (logsData?.logs ?? []) as ImportLog[];

  const handleFile = async (file: File) => {
    setParseError(""); setRows(null); setFilename(file.name);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseError("Only .csv files are allowed.");
      return;
    }
    try {
      const text = await file.text();
      const grid = parseCsvText(text);
      if (grid.length < 2) throw new Error("CSV must have a header row and at least one data row.");
      const header = grid[0].map((h) => h.trim().toLowerCase());
      const idIdx = header.findIndex((h) => h === "id" || h === "tutor_id" || h === "tutor id");
      const passIdx = header.findIndex((h) => h === "password");
      const nameIdx = header.findIndex((h) => h === "name");
      if (idIdx === -1) throw new Error("CSV must contain an 'ID' column.");
      if (nameIdx === -1) throw new Error("CSV must contain a 'Name' column.");
      const seen = new Set<string>();
      const parsed: ParsedRow[] = [];
      for (const r of grid.slice(1)) {
        const tutor_id = (r[idIdx] ?? "").trim().toUpperCase();
        if (!tutor_id) continue;
        if (seen.has(tutor_id)) throw new Error(`Duplicate tutor ID in CSV: ${tutor_id}`);
        seen.add(tutor_id);
        const password = passIdx >= 0 ? (r[passIdx] ?? "").trim() : "";
        parsed.push({
          tutor_id,
          password: password || "P@ssword_1234",
          name: (r[nameIdx] ?? "").trim(),
        });
      }
      if (parsed.length === 0) throw new Error("No valid rows found in CSV.");
      setRows(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse CSV");
    }
  };

  const reset = () => {
    setRows(null); setFilename(""); setParseError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const runImport = async () => {
    if (!rows) return;
    if (!requireAdmin(navigate)) return;
    setBusy(true);
    try {
      const result = await importTutorsFn({
        data: { rows, filename, imported_by: session.admin?.email ?? null } as never,
      });
      toast.success(
        `Import complete · Added ${result.added} · Updated ${result.updated} · Deleted ${result.deleted}`,
      );
      reset();
      qc.invalidateQueries({ queryKey: ["tutor_import_logs"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Tutors</h1>
        <button
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 h-9 text-sm font-medium text-primary-foreground hover:bg-blue-700"
        >
          <Upload className="h-4 w-4" /> Upload CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {parseError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {parseError}
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold text-foreground">Import History</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">File Name</th>
              <th className="px-4 py-2 text-left">Import Date</th>
              <th className="px-4 py-2 text-left">Added</th>
              <th className="px-4 py-2 text-left">Updated</th>
              <th className="px-4 py-2 text-left">Deleted</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No imports yet.</td></tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium text-foreground">{l.filename ?? "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">{new Date(l.imported_at).toLocaleString()}</td>
                <td className="px-4 py-2 text-muted-foreground">{l.added_count}</td>
                <td className="px-4 py-2 text-muted-foreground">{l.updated_count}</td>
                <td className="px-4 py-2 text-muted-foreground">{l.deleted_count}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${l.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {l.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Preview tutor import</h2>
              <button onClick={reset} className="rounded p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              File: <span className="font-medium text-foreground">{filename}</span>
              {" · "}Rows detected: <span className="font-medium text-foreground">{rows.length}</span>
            </p>
            <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/70 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">ID</th>
                    <th className="px-3 py-2 text-left">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((r) => (
                    <tr key={r.tutor_id} className="border-t border-border">
                      <td className="px-3 py-1.5 font-medium text-foreground">{r.tutor_id}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 10 && (
                <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                  …and {rows.length - 10} more rows
                </div>
              )}
            </div>
            <div className="mt-4 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              Importing will replace the tutors table. Tutors missing from this CSV will be deleted.
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={reset} className="rounded-md border border-border bg-background px-3 h-9 text-sm hover:bg-muted">Cancel</button>
              <button onClick={runImport} disabled={busy} className="rounded-md bg-primary px-3 h-9 text-sm font-medium text-primary-foreground hover:bg-blue-700 disabled:opacity-60">
                {busy ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Modal & Field ---------- */
function Modal({ title, children, onClose, onSave, busy }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void; busy?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="rounded p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border bg-background px-3 h-9 text-sm hover:bg-muted">Cancel</button>
          <button onClick={onSave} disabled={busy} className="rounded-md bg-primary px-3 h-9 text-sm font-medium text-primary-foreground hover:bg-blue-700 disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
    </div>
  );
}
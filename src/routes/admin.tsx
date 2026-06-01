import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

type Tab = "dashboard" | "categories" | "cards" | "materials";

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
          <AdminNav active={tab === "materials"} onClick={() => setTab("materials")} icon={<Upload className="h-4 w-4" />} label="Materials" />
          <button onClick={logout} className="mt-6 inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </nav>
      </aside>

      <main className="ml-60 p-6 md:p-10">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "categories" && <CategoriesTab />}
        {tab === "cards" && <CardsTab />}
        {tab === "materials" && <MaterialsTab />}
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
  const { data: categories = [] } = useCategories();
  const { data: cards = [] } = useAllCards();
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  const save = async () => {
    if (!editing) return;
    if (!requireAdmin(navigate)) return;
    const payload = {
      name: editing.name ?? "",
      slug: editing.slug ?? "",
      icon: editing.icon ?? "Folder",
      description: editing.description ?? "",
      order: editing.order ?? 0,
    };
    const { error } = editing.id
      ? await supabase.from("categories").update(payload).eq("id", editing.id)
      : await supabase.from("categories").insert(payload);
    if (error) {
      console.error("Supabase error:", error.message);
      toast.error(error.message);
      return;
    }
    toast.success(editing.id ? "Category updated" : "Category created");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const remove = async (id: string) => {
    if (!requireAdmin(navigate)) return;
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      console.error("Supabase error:", error.message);
      toast.error(error.message);
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
  const { data: categories = [] } = useCategories();
  const { data: cards = [] } = useAllCards();
  const [filter, setFilter] = useState<string>("");
  const [editing, setEditing] = useState<Partial<Card> | null>(null);

  const filtered = filter ? cards.filter((c) => c.category_id === filter) : cards;

  const save = async () => {
    if (!editing) return;
    if (!requireAdmin(navigate)) return;
    const payload = {
      category_id: editing.category_id!,
      header: editing.header ?? "",
      body: editing.body ?? "",
      icon_style: editing.icon_style ?? "link",
      icon: editing.icon ?? "Link2",
      view_link: editing.view_link || null,
      open_link: editing.open_link ?? "",
      order: editing.order ?? 0,
    };
    const { error } = editing.id
      ? await supabase.from("cards").update(payload).eq("id", editing.id)
      : await supabase.from("cards").insert(payload);
    if (error) {
      console.error("Supabase error:", error.message);
      toast.error(error.message);
      return;
    }
    toast.success(editing.id ? "Card updated" : "Card created");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["cards"] });
  };

  const remove = async (id: string) => {
    if (!requireAdmin(navigate)) return;
    if (!confirm("Delete this card?")) return;
    const { error } = await supabase.from("cards").delete().eq("id", id);
    if (error) {
      console.error("Supabase error:", error.message);
      toast.error(error.message);
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
        </Modal>
      )}
    </div>
  );
}

/* ---------- Materials ---------- */
interface Material {
  id: string;
  title: string;
  description: string;
  category_id: string | null;
  type: string;
  url: string | null;
  storage_path: string | null;
  created_at: string;
}

function useMaterials() {
  return useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Material[];
    },
  });
}

function MaterialsTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: materials = [] } = useMaterials();
  const { data: categories = [] } = useCategories();
  const [editing, setEditing] = useState<(Partial<Material> & { file?: File | null }) | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!editing) return;
    if (!requireAdmin(navigate)) return;
    setBusy(true);
    try {
      let storage_path = editing.storage_path ?? null;
      if (editing.file && (editing.type === "pdf" || editing.type === "video")) {
        const path = `${Date.now()}-${editing.file.name}`;
        const { error } = await supabase.storage.from("materials").upload(path, editing.file);
        if (error) throw error;
        storage_path = path;
      }
      const payload = {
        title: editing.title ?? "",
        description: editing.description ?? "",
        category_id: editing.category_id || null,
        type: editing.type ?? "link",
        url: editing.type === "link" ? (editing.url ?? null) : null,
        storage_path,
      };
      const { error } = editing.id
        ? await supabase.from("materials").update(payload).eq("id", editing.id)
        : await supabase.from("materials").insert(payload);
      if (error) throw error;
      toast.success(editing.id ? "Material updated" : "Material uploaded");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["materials"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      console.error("Supabase error:", msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m: Material) => {
    if (!requireAdmin(navigate)) return;
    if (!confirm("Delete this material?")) return;
    if (m.storage_path) await supabase.storage.from("materials").remove([m.storage_path]);
    const { error } = await supabase.from("materials").delete().eq("id", m.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Material deleted");
    qc.invalidateQueries({ queryKey: ["materials"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Materials</h1>
        <button onClick={() => setEditing({ type: "link" })} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 h-9 text-sm font-medium text-primary-foreground hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Upload
        </button>
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Title</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {materials.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No materials uploaded yet.</td></tr>
            )}
            {materials.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium text-foreground">{m.title}</td>
                <td className="px-4 py-2 text-muted-foreground">{categories.find((c) => c.id === m.category_id)?.name ?? "—"}</td>
                <td className="px-4 py-2 uppercase text-muted-foreground">{m.type}</td>
                <td className="px-4 py-2 text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setEditing(m)} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(m)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? "Edit material" : "Upload material"} onClose={() => setEditing(null)} onSave={save} busy={busy}>
          <Field label="Title" value={editing.title ?? ""} onChange={(v) => setEditing({ ...editing, title: v })} />
          <Field label="Description" value={editing.description ?? ""} onChange={(v) => setEditing({ ...editing, description: v })} />
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</label>
            <select value={editing.category_id ?? ""} onChange={(e) => setEditing({ ...editing, category_id: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
              <option value="">— None —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</label>
            <select value={editing.type ?? "link"} onChange={(e) => setEditing({ ...editing, type: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
              <option value="link">Link</option>
              <option value="pdf">PDF</option>
              <option value="video">Video</option>
            </select>
          </div>
          {editing.type === "link" ? (
            <Field label="URL" value={editing.url ?? ""} onChange={(v) => setEditing({ ...editing, url: v })} />
          ) : (
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">File</label>
              <input type="file" onChange={(e) => setEditing({ ...editing, file: e.target.files?.[0] ?? null })} className="mt-1 block w-full text-sm" />
            </div>
          )}
        </Modal>
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
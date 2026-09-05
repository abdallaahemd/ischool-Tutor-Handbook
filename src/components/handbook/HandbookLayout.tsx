import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { LogoFull, LogoMark } from "./Logo";
import { Icon } from "./Icon";
import { useCategories, useAllCards } from "./data";
import { useTutorSession } from "@/components/tutor/useTutorSession";

export function HandbookLayout({
  children,
  onSearchSelect,
}: {
  children: ReactNode;
  onSearchSelect?: (cardId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: categories = [] } = useCategories();
  const { data: allCards = [] } = useAllCards();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const session = useTutorSession();

  // Global guard for all protected tutor pages.
  useEffect(() => {
    if (session.loading) return;
    if (!session.isTutor) {
      // If a password-change handoff is pending, send them there; otherwise login.
      const pending =
        typeof window !== "undefined" &&
        !!sessionStorage.getItem("ischool_tutor_pw_change");
      navigate({ to: pending ? "/tutor/change-password" : "/tutor/login" });
    }
  }, [session.loading, session.isTutor, navigate]);

  if (session.loading || !session.isTutor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const filtered = query.trim()
    ? allCards
        .filter(
          (c) =>
            c.header.toLowerCase().includes(query.toLowerCase()) ||
            c.body.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 8)
    : [];

  const sidebarWidth = collapsed ? "w-12" : "w-64";

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-card transition-all md:block ${sidebarWidth}`}
      >
        <div className="flex h-20 items-center justify-center border-b border-border">
          {collapsed ? <LogoMark size={32} /> : <LogoMark size={36} />}
        </div>
        <nav className="flex flex-col gap-1 p-2">
          <NavLink
            to="/"
            icon="Home"
            label="Home"
            collapsed={collapsed}
            active={path === "/"}
          />
          <NavLink
            to="/ask"
            icon="Sparkles"
            label="Ask About Anything"
            collapsed={collapsed}
            active={path === "/ask"}
          />
          <NavLink
            to="/knowledge"
            icon="BookOpen"
            label="Knowledge Base"
            collapsed={collapsed}
            active={path === "/knowledge"}
          />

          {!collapsed && (
            <div className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Categories
            </div>
          )}
          {categories.map((c) => (
            <NavLink
              key={c.id}
              to={`/c/${c.slug}`}
              icon={c.icon}
              label={c.name}
              collapsed={collapsed}
              active={path === `/c/${c.slug}`}
              count={allCards.filter((x) => x.category_id === c.id).length}
            />
          ))}
        </nav>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-card shadow-xl">
            <div className="flex h-20 items-center justify-between border-b border-border px-4">
              <LogoMark size={36} />
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-2">
              <NavLink to="/" icon="Home" label="Home" collapsed={false} active={path === "/"} onClick={() => setMobileOpen(false)} />
              <NavLink to="/ask" icon="Sparkles" label="Ask About Anything" collapsed={false} active={path === "/ask"} onClick={() => setMobileOpen(false)} />
              <NavLink to="/knowledge" icon="BookOpen" label="Knowledge Base" collapsed={false} active={path === "/knowledge"} onClick={() => setMobileOpen(false)} />

              <div className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Categories
              </div>
              {categories.map((c) => (
                <NavLink
                  key={c.id}
                  to={`/c/${c.slug}`}
                  icon={c.icon}
                  label={c.name}
                  collapsed={false}
                  active={path === `/c/${c.slug}`}
                  onClick={() => setMobileOpen(false)}
                  count={allCards.filter((x) => x.category_id === c.id).length}
                />
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className={`flex min-h-screen flex-col transition-all ${collapsed ? "md:pl-12" : "md:pl-64"}`}>
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-20 items-center gap-3 border-b-2 border-accent bg-card px-4 md:px-6">
          <button
            onClick={() => {
              setCollapsed((c) => !c);
              setMobileOpen((o) => !o);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden md:block">
            <LogoFull />
          </div>
          <div className="md:hidden">
            <LogoMark size={36} />
          </div>
          <div className="ml-auto relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search resources…"
              className="h-10 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {filtered.length > 0 && (
              <div className="absolute left-0 right-0 top-12 z-30 max-h-80 overflow-auto rounded-xl border border-border bg-popover shadow-lg">
                {filtered.map((c) => {
                  const cat = categories.find((x) => x.id === c.category_id);
                  return (
                    <Link
                      key={c.id}
                      to={cat ? "/c/$slug" : "/"}
                      params={cat ? { slug: cat.slug } : undefined}
                      onClick={() => {
                        setQuery("");
                        onSearchSelect?.(c.id);
                      }}
                      className="flex items-start gap-3 border-b border-border px-3 py-2 last:border-b-0 hover:bg-muted"
                    >
                      <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-md ${c.icon_style === "pdf" ? "bg-[color-mix(in_oklab,var(--pdf)_12%,transparent)] text-[var(--pdf)]" : "bg-[color-mix(in_oklab,var(--link)_12%,transparent)] text-[var(--link)]"}`}>
                        <Icon name={c.icon} size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{c.header}</div>
                        <div className="truncate text-xs text-muted-foreground">{cat?.name}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  to,
  icon,
  label,
  collapsed,
  active,
  onClick,
  count,
}: {
  to: string;
  icon: string;
  label: string;
  collapsed: boolean;
  active: boolean;
  onClick?: () => void;
  count?: number;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-muted"
      }`}
      title={label}
    >
      {icon === "Home" ? <Home className="h-4 w-4 shrink-0" /> : <Icon name={icon} size={16} className="shrink-0" />}
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && typeof count === "number" && (
        <span
          className={`ml-auto text-[10px] rounded-full px-1.5 py-0.5 font-medium ${
            active
              ? "bg-white/20 text-white"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { HandbookLayout } from "@/components/handbook/HandbookLayout";
import { LogoMark } from "@/components/handbook/Logo";
import { Icon } from "@/components/handbook/Icon";
import { useCategories, useAllCards } from "@/components/handbook/data";

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
  const { data: categories = [] } = useCategories();
  const { data: cards = [] } = useAllCards();

  const countByCat = (id: string) => cards.filter((c) => c.category_id === id).length;

  return (
    <HandbookLayout>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {/* Hero */}
        <section
          className="relative overflow-hidden rounded-3xl border border-border p-8 md:p-14"
          style={{
            background:
              "linear-gradient(135deg, var(--hero-from), var(--hero-via), var(--hero-to))",
          }}
        >
          <div className="absolute right-8 top-8 hidden gap-2 md:flex">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="h-2 w-2 rounded-full bg-[var(--pdf)]" />
          </div>
          <div className="flex flex-col items-center text-center">
            <LogoMark size={72} />
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Instructor Handbook
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
              Everything you need to run great sessions — systems, policies, materials and feedback templates, all in one place.
            </p>
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
                className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_oklch(0.55_0.18_250/0.25)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
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

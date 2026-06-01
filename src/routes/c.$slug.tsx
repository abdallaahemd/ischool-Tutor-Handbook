import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { HandbookLayout } from "@/components/handbook/HandbookLayout";
import { ResourceCard } from "@/components/handbook/ResourceCard";
import { InlineViewer } from "@/components/handbook/InlineViewer";
import {
  useCategories,
  useCardsByCategory,
  type Card,
} from "@/components/handbook/data";

export const Route = createFileRoute("/c/$slug")({
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data: categories = [] } = useCategories();
  const category = categories.find((c) => c.slug === slug);
  const { data: cards = [], isLoading } = useCardsByCategory(category?.id);
  const [openedCard, setOpenedCard] = useState<Card | null>(null);

  if (categories.length > 0 && !category) throw notFound();

  return (
    <HandbookLayout>
      {openedCard ? (
        <InlineViewer card={openedCard} onBack={() => setOpenedCard(null)} />
      ) : (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          iSchool Handbook
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {category?.name ?? "…"}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground md:text-base">
          {category?.description ?? ""}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading && (
            <div className="col-span-full text-sm text-muted-foreground">Loading…</div>
          )}
          {!isLoading && cards.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">No resources here yet. Check back soon.</p>
            </div>
          )}
          {cards.map((c) => (
            <ResourceCard key={c.id} card={c} onOpen={setOpenedCard} />
          ))}
        </div>
      </div>
      )}
    </HandbookLayout>
  );
}
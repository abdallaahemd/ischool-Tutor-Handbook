import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { HandbookLayout } from "@/components/handbook/HandbookLayout";
import { ResourceCard } from "@/components/handbook/ResourceCard";
import { PdfModal } from "@/components/handbook/PdfModal";
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
  const [openCard, setOpenCard] = useState<Card | null>(null);

  if (categories.length > 0 && !category) throw notFound();

  return (
    <HandbookLayout>
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
            <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No resources yet.
            </div>
          )}
          {cards.map((c) => (
            <ResourceCard key={c.id} card={c} onOpenPdf={setOpenCard} />
          ))}
        </div>
      </div>

      {openCard && (
        <PdfModal
          url={openCard.open_link}
          title={openCard.header}
          onClose={() => setOpenCard(null)}
        />
      )}
    </HandbookLayout>
  );
}
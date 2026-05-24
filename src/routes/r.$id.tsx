import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PdfModal } from "@/components/handbook/PdfModal";

export const Route = createFileRoute("/r/$id")({
  component: ResourceViewer,
});

function ResourceViewer() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState<{ open_link: string; header: string } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("cards")
        .select("open_link, header, view_link")
        .eq("view_link", `/r/${id}`)
        .maybeSingle();
      if (cancelled) return;
      if (!data) setNotFound(true);
      else setCard(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">Resource not found</h1>
          <button onClick={() => navigate({ to: "/" })} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            Back home
          </button>
        </div>
      </div>
    );
  }

  if (!card) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;

  return <PdfModal url={card.open_link} title={card.header} onClose={() => navigate({ to: "/" })} />;
}
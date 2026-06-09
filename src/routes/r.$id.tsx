import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PdfModal } from "@/components/handbook/PdfModal";
import { useTutorSession } from "@/components/tutor/useTutorSession";

export const Route = createFileRoute("/r/$id")({
  component: ResourceViewer,
});

function ResourceViewer() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const session = useTutorSession();
  const [card, setCard] = useState<{ open_link: string; header: string } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (session.loading) return;
    if (!session.isTutor) {
      const pending =
        typeof window !== "undefined" &&
        !!sessionStorage.getItem("ischool_tutor_pw_change");
      navigate({ to: pending ? "/tutor/change-password" : "/tutor/login" });
    }
  }, [session.loading, session.isTutor, navigate]);

  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

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

  return <PdfModal url={card.open_link} title={card.header} onClose={() => navigate({ to: "/" })} secure />;
}
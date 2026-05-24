import { ArrowUpRight } from "lucide-react";
import { Icon } from "./Icon";
import type { Card } from "./data";

function isDrivePreview(url: string) {
  return /https:\/\/drive\.google\.com\/file\/d\/[^/]+\/preview/.test(url);
}

export function ResourceCard({
  card,
  onOpenPdf,
}: {
  card: Card;
  onOpenPdf: (card: Card) => void;
}) {
  const isPdf = card.icon_style === "pdf";

  const handleClick = () => {
    if (card.view_link) {
      // Will be handled via wrapping Link in parent; fall back to PDF modal here
      onOpenPdf(card);
      return;
    }
    if (isDrivePreview(card.open_link)) {
      onOpenPdf(card);
      return;
    }
    window.open(card.open_link, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={handleClick}
      className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_oklch(0.55_0.18_250/0.25)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110 ${
            isPdf
              ? "bg-[color-mix(in_oklab,var(--pdf)_12%,transparent)] text-[var(--pdf)]"
              : "bg-[color-mix(in_oklab,var(--link)_12%,transparent)] text-[var(--link)]"
          }`}
        >
          <Icon name={card.icon} size={20} />
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
            isPdf
              ? "bg-[color-mix(in_oklab,var(--pdf)_12%,transparent)] text-[var(--pdf)]"
              : "bg-[color-mix(in_oklab,var(--link)_12%,transparent)] text-[var(--link)]"
          }`}
        >
          {isPdf ? "PDF" : "LINK"}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">
        {card.header}
      </h3>
      <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
        {card.body}
      </p>
      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Tap to open</span>
        <span className="inline-flex items-center gap-1 rounded-md bg-primary px-3 h-8 text-xs font-medium text-primary-foreground shadow transition hover:bg-primary/90">
          Open <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}
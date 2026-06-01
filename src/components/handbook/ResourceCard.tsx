import { ArrowUpRight } from "lucide-react";
import { Icon } from "./Icon";
import type { Card } from "./data";

export function ResourceCard({
  card,
  onOpen,
}: {
  card: Card;
  onOpen: (card: Card) => void;
}) {
  const isPdf = card.icon_style === "pdf";
  const isVideo = card.icon_style === "video";
  const isLink = card.icon_style === "link";

  const handleClick = () => {
    if (isPdf || isVideo) {
      onOpen(card);
      return;
    }
    window.location.href = card.open_link;
  };

  const commonClass =
    "group relative flex flex-col rounded-2xl border border-border bg-card p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_rgba(37,99,235,0.25)]";

  const badgeLabel = isPdf ? "PDF" : isVideo ? "VIDEO" : "LINK";
  const accentClass = isPdf
    ? "bg-orange-100 text-orange-600"
    : isVideo
    ? "bg-purple-100 text-purple-600"
    : "bg-blue-100 text-blue-600";
  const iconAccent = isPdf
    ? "bg-orange-100 text-orange-500"
    : isVideo
    ? "bg-purple-100 text-purple-600"
    : "bg-blue-100 text-blue-600";

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${iconAccent}`}
        >
          <Icon name={card.icon} size={20} />
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${accentClass}`}
        >
          {badgeLabel}
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
        <span className="inline-flex items-center gap-1 rounded-md bg-primary px-3 h-8 text-xs font-medium text-primary-foreground shadow transition hover:bg-blue-700">
          Open <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </>
  );

  if (isLink) {
    return (
      <a href={card.open_link} target="_self" className={commonClass}>
        {inner}
      </a>
    );
  }

  return (
    <button onClick={handleClick} className={commonClass}>
      {inner}
    </button>
  );
}
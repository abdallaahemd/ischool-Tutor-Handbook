import { ArrowLeft, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { Card } from "./data";
import { PdfViewer } from "./PdfViewer";
import { SheetTable } from "./SheetTable";

function toDirectUrl(driveUrl: string): string {
  const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return driveUrl;
  return `https://drive.google.com/uc?export=download&id=${match[1]}`;
}

export function InlineViewer({ card, onBack }: { card: Card; onBack: () => void }) {
  const [videoLoading, setVideoLoading] = useState(true);
  const isPdf = card.icon_style === "pdf";
  const isVideo = card.icon_style === "video";
  const isSheet = /docs\.google\.com\/spreadsheets\//.test(card.open_link);
  const isEmbeddableLink = !isPdf && !isVideo && !isSheet;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back
        </button>
        {isEmbeddableLink && (
          <a
            href={card.open_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 h-9 text-xs font-medium text-primary-foreground shadow transition hover:bg-blue-700"
          >
            Open website <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      <h1 className="mb-4 text-xl font-semibold text-foreground md:text-2xl">
        {card.header}
      </h1>
      {isPdf && <PdfViewer driveUrl={card.open_link} />}
      {isSheet && <SheetTable openLink={card.open_link} />}
      {isVideo && (
        <div style={{ position: "relative", width: "100%", height: "calc(100vh - 120px)" }}>
          {videoLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black rounded-xl">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
            </div>
          )}
          <video
            src={toDirectUrl(card.open_link)}
            controls
            controlsList="nodownload"
            disablePictureInPicture
            onCanPlay={() => setVideoLoading(false)}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 12,
              backgroundColor: "#000",
              outline: "none",
            }}
          />
        </div>
      )}
      {isEmbeddableLink && (
        <div style={{ width: "100%", height: "calc(100vh - 160px)", overflow: "hidden", borderRadius: 12 }}>
          <iframe
            src={card.open_link}
            title={card.header}
            className="h-full w-full border border-border bg-background"
            style={{ borderRadius: 12 }}
            sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
          />
        </div>
      )}
    </div>
  );
}
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import type { Card } from "./data";
import { PdfViewer } from "./PdfViewer";

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
  const sheetPreview = (() => {
    const m = card.open_link.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) return card.open_link;
    const gidMatch = card.open_link.match(/[?#&]gid=(\d+)/);
    const gid = gidMatch ? `?gid=${gidMatch[1]}` : "";
    return `https://docs.google.com/spreadsheets/d/${m[1]}/preview${gid}`;
  })();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <button
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Go back
      </button>
      <h1 className="mb-4 text-xl font-semibold text-foreground md:text-2xl">
        {card.header}
      </h1>
      {isPdf && <PdfViewer driveUrl={card.open_link} />}
      {isSheet && (
        <div style={{ position: "relative", width: "100%", height: "calc(100vh - 120px)", overflow: "hidden", borderRadius: 12 }}>
          <iframe
            src={sheetPreview}
            title={card.header}
            style={{ width: "100%", height: "100%", border: "none", borderRadius: 12, backgroundColor: "#fff" }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 80,
              height: 60,
              backgroundColor: "hsl(var(--background))",
              zIndex: 9999,
              pointerEvents: "all",
            }}
          />
        </div>
      )}
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
      {!isPdf && !isVideo && !isSheet && (
        <div className="text-sm text-muted-foreground">Unsupported resource type.</div>
      )}
    </div>
  );
}
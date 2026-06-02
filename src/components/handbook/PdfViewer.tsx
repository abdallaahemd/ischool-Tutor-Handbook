import { useState } from "react";
import { FileX } from "lucide-react";

function toEmbedUrl(driveUrl: string): string {
  const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return driveUrl;
  const fileId = match[1];
  const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(directUrl)}`;
}

export function PdfViewer({ driveUrl }: { driveUrl: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        style={{ width: "100%", height: "calc(100vh - 120px)" }}
        className="flex flex-col items-center justify-center gap-4 text-muted-foreground"
      >
        <FileX className="h-12 w-12" />
        <p className="text-sm">Unable to load PDF preview.</p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "calc(100vh - 120px)" }}>
      <iframe
        src={toEmbedUrl(driveUrl)}
        title="PDF viewer"
        onError={() => setFailed(true)}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          borderRadius: "12px",
        }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
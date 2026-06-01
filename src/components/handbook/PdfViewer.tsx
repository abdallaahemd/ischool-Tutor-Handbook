import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

function toDirectUrl(driveUrl: string): string {
  const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return driveUrl;
  return `https://drive.google.com/uc?export=download&id=${match[1]}`;
}

const btnStyle: React.CSSProperties = {
  background: "#2d2d2d",
  color: "white",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 6,
  padding: "4px 10px",
  fontSize: 12,
  cursor: "pointer",
};

export function PdfViewer({ driveUrl }: { driveUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<ReturnType<pdfjsLib.PDFPageProxy["render"]> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const url = toDirectUrl(driveUrl);
    const task = pdfjsLib.getDocument({ url });
    task.promise
      .then((doc) => {
        if (cancelled) return;
        docRef.current = doc;
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load PDF");
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
      try { task.destroy(); } catch { /* noop */ }
    };
  }, [driveUrl]);

  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || totalPages === 0) return;
    let cancelled = false;
    (async () => {
      try {
        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel(); } catch { /* noop */ }
        }
        const page = await doc.getPage(currentPage);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const task = page.render({ canvasContext: ctx, viewport, canvas });
        renderTaskRef.current = task;
        await task.promise;
        if (!cancelled) setIsLoading(false);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { name?: string; message?: string };
        if (err?.name === "RenderingCancelledException") return;
        setError(err?.message ?? "Failed to render PDF");
        setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentPage, scale, totalPages]);

  const goToPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goToNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", userSelect: "none" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          backgroundColor: "#1e1e1e",
          borderRadius: "12px 12px 0 0",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={{ ...btnStyle, opacity: currentPage <= 1 ? 0.4 : 1, cursor: currentPage <= 1 ? "not-allowed" : "pointer" }} onClick={goToPrev} disabled={currentPage <= 1}>← Prev</button>
          <span style={{ color: "white", fontSize: 13 }}>{currentPage} / {totalPages || "–"}</span>
          <button style={{ ...btnStyle, opacity: currentPage >= totalPages ? 0.4 : 1, cursor: currentPage >= totalPages ? "not-allowed" : "pointer" }} onClick={goToNext} disabled={currentPage >= totalPages}>Next →</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={btnStyle} onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}>− Zoom Out</button>
          <span style={{ color: "white", fontSize: 13 }}>{Math.round(scale * 100)}%</span>
          <button style={btnStyle} onClick={() => setScale((s) => Math.min(3, s + 0.2))}>+ Zoom In</button>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflow: "auto",
          backgroundColor: "#525659",
          display: "flex",
          justifyContent: "center",
          padding: 16,
          borderRadius: "0 0 12px 12px",
        }}
      >
        {isLoading && !error && (
          <span style={{ color: "white", alignSelf: "center" }}>Loading PDF…</span>
        )}
        {error && <span style={{ color: "#fca5a5", alignSelf: "center" }}>{error}</span>}
        <canvas
          ref={canvasRef}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            borderRadius: 4,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            display: isLoading || error ? "none" : "block",
            height: "fit-content",
          }}
        />
      </div>
    </div>
  );
}
import { X } from "lucide-react";
import { useEffect } from "react";

function toEmbedUrl(url: string) {
  const match = url.match(/https:\/\/drive\.google\.com\/file\/d\/([^/]+)\/preview/);
  if (match) {
    return `https://drive.google.com/file/d/${match[1]}/preview?embedded=true&rm=minimal`;
  }
  return url;
}

export function PdfModal({
  url,
  title,
  onClose,
  secure = false,
}: {
  url: string;
  title: string;
  onClose: () => void;
  secure?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const iframeUrl = secure ? toEmbedUrl(url) : url;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3">
        <div className="truncate pr-4 text-sm font-medium text-white">
          {title}
        </div>
        <button
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative flex-1">
        <iframe
          src={iframeUrl}
          title={title}
          className="h-full w-full border-0 bg-white"
          allow="autoplay"
          style={{ pointerEvents: "auto" }}
        />
        {secure && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "80px",
              height: "80px",
              backgroundColor: "#000",
              zIndex: 9999,
              cursor: "default",
              pointerEvents: "all",
            }}
          />
        )}
      </div>
    </div>
  );
}
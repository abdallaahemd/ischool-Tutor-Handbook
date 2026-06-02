function toPreviewUrl(driveUrl: string): string {
  const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return driveUrl;
  return `https://drive.google.com/file/d/${match[1]}/preview`;
}

export function PdfViewer({ driveUrl }: { driveUrl: string }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "calc(100vh - 120px)", overflow: "hidden", borderRadius: 12 }}>
      <iframe
        src={toPreviewUrl(driveUrl)}
        title="PDF viewer"
        allow="autoplay"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          borderRadius: 12,
        }}
      />
      {/* Cover Drive's top-right pop-out / tools button */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          backgroundColor: "hsl(var(--background))",
          zIndex: 9999,
          pointerEvents: "all",
        }}
      />
    </div>
  );
}
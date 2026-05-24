import logoUrl from "@/assets/ischool-logo.png";

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <img
      src={logoUrl}
      alt="iSchool"
      style={{ height: size, width: "auto" }}
      className="object-contain"
    />
  );
}

export function LogoFull() {
  return (
    <div className="flex items-center gap-3">
      <img src={logoUrl} alt="iSchool" className="h-9 w-auto object-contain" />
      <div className="leading-tight">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Tutor Handbook
        </div>
      </div>
    </div>
  );
}
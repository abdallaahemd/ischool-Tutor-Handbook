import { GraduationCap } from "lucide-react";

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
      style={{ width: size, height: size }}
    >
      <GraduationCap size={Math.round(size * 0.6)} />
    </div>
  );
}

export function LogoFull() {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={40} />
      <div className="leading-tight">
        <div className="text-base font-bold text-foreground">iSchool</div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Instructor Handbook
        </div>
      </div>
    </div>
  );
}
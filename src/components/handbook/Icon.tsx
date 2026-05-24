import * as Icons from "lucide-react";
import { HelpCircle, type LucideIcon } from "lucide-react";

export function Icon({
  name,
  className,
  size,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const Cmp = ((Icons as unknown as Record<string, LucideIcon>)[name] ??
    HelpCircle) as LucideIcon;
  return <Cmp className={className} size={size} />;
}
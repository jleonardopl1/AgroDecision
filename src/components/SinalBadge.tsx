import { cn } from "@/lib/utils";
import { SINAL_LABEL, type Sinal } from "@/lib/commodities";

const SINAL_CLASSES: Record<Sinal, string> = {
  VENDER: "bg-sinal-vender text-white",
  AGUARDAR: "bg-sinal-aguardar text-accent-foreground",
  ATENCAO: "bg-sinal-atencao text-white",
};

interface SinalBadgeProps {
  sinal: string;
  size?: "sm" | "lg";
  className?: string;
}

export function SinalBadge({ sinal, size = "sm", className }: SinalBadgeProps) {
  const key = (sinal in SINAL_CLASSES ? sinal : "AGUARDAR") as Sinal;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-bold tracking-wide",
        SINAL_CLASSES[key],
        size === "lg" ? "px-4 py-1.5 text-base" : "px-2.5 py-0.5 text-xs",
        className,
      )}
    >
      {SINAL_LABEL[key]}
    </span>
  );
}

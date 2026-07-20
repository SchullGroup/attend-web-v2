import { cn } from "@/lib/utils";

const config: Record<string, { label: string; bg: string; color: string }> = {
  // backend enum values
  AGM_EGM: { label: "AGM", bg: "#eff6ff", color: "#1e40af" },
  AGM: { label: "AGM", bg: "#eff6ff", color: "#1e40af" },
  PRODUCT_LAUNCH: { label: "Launch", bg: "#fff4eb", color: "#ea6c00" },
  HACKATHON: { label: "Innovation Challenge", bg: "#f8f0ff", color: "#7c22c9" },
  INNOVATION_CHALLENGE: { label: "Innovation Challenge", bg: "#f8f0ff", color: "#7c22c9" },
  GENERAL_EVENT: { label: "General", bg: "#ecfeff", color: "#0891b2" },
  // legacy mock values
  LAUNCH: { label: "Launch", bg: "#fff4eb", color: "#ea6c00" },
  GENERAL: { label: "General", bg: "#ecfeff", color: "#0891b2" },
};

interface Props {
  module: string;
  className?: string;
  solid?: boolean;
}

export function ModuleBadge({ module, className, solid }: Props) {
  const c = config[module] ?? { label: module, bg: "#f1f5f9", color: "#475569" };
  const style = solid
    ? { background: "rgba(255,255,255,0.92)", color: c.color }
    : { background: c.bg, color: c.color };
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        className,
      )}
    >
      {c.label}
    </span>
  );
}

export { config as moduleBadgeConfig };

type Props = {
  verified: boolean;
  source?: "ares" | "manual" | null;
  size?: "sm" | "md";
  showLabel?: boolean;
};

/**
 * Ikon odznak pro ověřený subjekt.
 * - `source="ares"` — ověřeno proti ARES (MF ČR)
 * - `source="manual"` — ověřeno admininem
 */
export default function VerifiedBadge({
  verified,
  source = null,
  size = "md",
  showLabel = true,
}: Props) {
  if (!verified) return null;

  const isAres = source === "ares";
  const dot = size === "sm" ? "w-4 h-4 text-[10px]" : "w-5 h-5 text-xs";
  const label = isAres ? "Ověřeno (ARES)" : "Ověřeno";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${
        isAres
          ? "bg-blue-100 text-blue-700"
          : "bg-emerald-100 text-emerald-700"
      } ${size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"}`}
      title={label}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full ${
          isAres ? "bg-blue-500 text-white" : "bg-emerald-500 text-white"
        } ${dot}`}
      >
        ✓
      </span>
      {showLabel && <span>{label}</span>}
    </span>
  );
}

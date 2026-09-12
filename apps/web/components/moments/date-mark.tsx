import { cn } from "@/lib/utils";

/**
 * A moment is a DATE first and a person second, so the numeral leads.
 * Large tabular figures make a column of upcoming dates scannable in one pass.
 */
export function DateMark({
  iso, className, size = "md",
}: {
  iso: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const weekday = days[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]!;

  const numeral = { sm: "text-xl", md: "text-3xl", lg: "text-5xl" }[size];

  return (
    <time dateTime={iso} className={cn("flex flex-col items-center leading-none", className)}>
      <span className={cn("date-mark font-semibold text-ink", numeral)}>{d}</span>
      <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
        {months[m - 1]}
      </span>
      <span className="text-[11px] text-ink-faint">{weekday}</span>
    </time>
  );
}

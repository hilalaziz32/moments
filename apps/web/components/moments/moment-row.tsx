import Link from "next/link";
import { formatPKR } from "@moments/core/money";
import { DateMark } from "./date-mark";
import { Pipeline, stepsForStatus } from "./pipeline";

export interface MomentRowData {
  id: string;
  occursOn: string;
  employeeName: string;
  department: string | null;
  momentLabel: string;
  milestoneYears: number | null;
  budgetPaisa: number;
  status: string;
}

/**
 * One upcoming celebration. The date anchors the left rail; the pipeline spine
 * sits under the name so a whole column of them reads as one picture of
 * "is anything stuck?".
 */
export function MomentRow({ moment }: { moment: MomentRowData }) {
  const title = moment.milestoneYears
    ? `${moment.milestoneYears} year anniversary`
    : moment.momentLabel;

  return (
    <Link
      href={`/moments/${moment.id}`}
      className="group flex items-center gap-5 border-b border-rule px-5 py-4 transition-colors last:border-b-0 hover:bg-surface-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <DateMark iso={moment.occursOn} size="md" className="w-11 shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-medium text-ink">{moment.employeeName}</span>
          <span className="truncate text-sm text-ink-muted">{title}</span>
        </div>
        <div className="mt-2 max-w-56">
          <Pipeline steps={stepsForStatus(moment.status)} />
        </div>
      </div>

      <div className="shrink-0 text-right">
        <span data-numeric className="text-sm font-medium text-ink">
          {formatPKR(moment.budgetPaisa)}
        </span>
        {moment.department && (
          <span className="mt-1 block text-xs text-ink-faint">{moment.department}</span>
        )}
      </div>
    </Link>
  );
}

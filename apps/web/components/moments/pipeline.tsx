import { cn } from "@/lib/utils";

/**
 * The pipeline spine -- the signature device of the product.
 *
 * Four dots for verify -> select -> approve -> deliver. Stepped markers are
 * usually decoration, but here the content genuinely IS a sequence: it is the
 * T-7 / T-4 / T-2 / T-0 pipeline, and where a moment has got to is the single
 * thing an HR admin most wants to know at a glance.
 *
 * Colour appears here and almost nowhere else, because this is the state.
 */

export type StepState = "done" | "active" | "waiting" | "failed" | "idle";

export interface PipelineStep {
  key: string;
  label: string;
  state: StepState;
  /** e.g. "21 Sep" — shown in the detail view, omitted in dense lists. */
  when?: string;
}

const DOT: Record<StepState, string> = {
  done:    "bg-state-done border-state-done",
  active:  "bg-state-active border-state-active",
  waiting: "bg-surface border-state-waiting ring-2 ring-state-waiting/25",
  failed:  "bg-state-failed border-state-failed",
  idle:    "bg-surface border-state-idle",
};

const LINE: Record<StepState, string> = {
  done: "bg-state-done", active: "bg-state-active", waiting: "bg-state-idle",
  failed: "bg-state-failed", idle: "bg-state-idle",
};

export function Pipeline({
  steps, showLabels = false, className,
}: {
  steps: PipelineStep[];
  showLabels?: boolean;
  className?: string;
}) {
  return (
    <ol className={cn("flex items-center", className)} aria-label="Progress">
      {steps.map((step, i) => (
        <li key={step.key} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
          <div className="flex flex-col items-center gap-1.5">
            <span
              className={cn("size-2.5 rounded-full border-2 transition-colors", DOT[step.state])}
              aria-hidden
            />
            {showLabels && (
              <span className="flex flex-col items-center">
                <span className="text-[11px] font-medium text-ink">{step.label}</span>
                {/* Always reserve the date line, or an undated step sits lower than its neighbours. */}
                {step.when
                  ? <time className="text-[11px] text-ink-faint">{step.when}</time>
                  : <span aria-hidden className="text-[11px] text-ink-faint">&nbsp;</span>}
              </span>
            )}
          </div>
          {i < steps.length - 1 && (
            <span
              className={cn("mx-1 h-px flex-1 min-w-3", LINE[steps[i]!.state])}
              aria-hidden
            />
          )}
          <span className="sr-only">
            {step.label}: {step.state === "done" ? "done"
              : step.state === "waiting" ? "waiting on someone"
              : step.state === "failed" ? "failed" : step.state}
            {step.when ? `, ${step.when}` : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Maps a moment_events.status onto the four-step spine. */
export function stepsForStatus(status: string, dates?: Partial<Record<string, string>>): PipelineStep[] {
  const order = ["verify", "select", "approve", "deliver"] as const;
  const reached: Record<string, number> = {
    detected: 0, scheduled: 0, needs_info: 0,
    awaiting_approval: 2, approved: 3, rejected: 2,
    fulfilling: 3, delivered: 4, announced: 4, completed: 4,
    skipped: 0, cancelled: 0, failed: 1,
  };
  const at = reached[status] ?? 0;
  const labels = { verify: "Details", select: "Gift", approve: "Approval", deliver: "Delivered" };

  return order.map((key, i) => {
    let state: StepState = "idle";
    if (status === "failed" && i === at) state = "failed";
    else if (i < at) state = "done";
    else if (i === at && (status === "needs_info" || status === "awaiting_approval")) state = "waiting";
    else if (i === at && status !== "skipped" && status !== "cancelled") state = "active";
    return { key, label: labels[key], state, when: dates?.[key] };
  });
}

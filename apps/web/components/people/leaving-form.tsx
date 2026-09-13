"use client";

import { useActionState } from "react";
import { setLeaving } from "@/app/actions/people";
import type { ActionResult } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const REASONS = [
  { key: "resigned", label: "Resigned" },
  { key: "retired", label: "Retiring" },
  { key: "end_of_contract", label: "End of contract" },
  { key: "redundancy", label: "Role made redundant" },
  { key: "terminated_for_cause", label: "Let go (no farewell)" },
] as const;

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive";

export function LeavingForm({
  employeeId, lastDay, reason,
}: {
  employeeId: string;
  lastDay: string | null;
  reason: string | null;
}) {
  const [state, action, pending] = useActionState(setLeaving, null as ActionResult<{ note: string }> | null);
  const errors = state && "fieldErrors" in state ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="employeeId" value={employeeId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Last working day" htmlFor="lastDay" error={errors.lastDay}>
          <Input name="lastDay" type="date" defaultValue={lastDay ?? undefined} required />
        </Field>
        <Field label="Why they're leaving" htmlFor="reason" error={errors.reason}>
          <select name="reason" defaultValue={reason ?? "resigned"} className={selectClass}>
            {REASONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Saving…" : lastDay ? "Update last day" : "Mark as leaving"}
        </Button>
        {state && "success" in state && <p role="status" className="text-sm text-ink-muted">{state.note}</p>}
        {state && "error" in state && !state.fieldErrors && (
          <p role="alert" className="text-sm text-destructive">{state.error}</p>
        )}
      </div>
    </form>
  );
}

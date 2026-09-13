"use client";

import { useActionState, useState } from "react";
import { shareNews } from "@/app/actions/people";
import type { ActionResult } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const KINDS = [
  { key: "promotion", label: "Promotion" },
  { key: "marriage", label: "Wedding" },
  { key: "new_baby", label: "New baby" },
] as const;

export function NewsForm({ employeeId, firstName, today }: { employeeId: string; firstName: string; today: string }) {
  const [state, action, pending] = useActionState(shareNews, null as ActionResult<{ note: string }> | null);
  const [kind, setKind] = useState<(typeof KINDS)[number]["key"]>("promotion");
  const errors = state && "fieldErrors" in state ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="employeeId" value={employeeId} />

      <fieldset>
        <legend className="text-sm font-medium text-ink">What happened?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <label
              key={k.key}
              className={cn(
                "cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors",
                kind === k.key ? "border-ink bg-surface-sunk font-medium text-ink" : "border-input text-ink-muted hover:text-ink",
              )}
            >
              <input
                type="radio" name="kind" value={k.key} className="sr-only"
                checked={kind === k.key} onChange={() => setKind(k.key)}
              />
              {k.label}
            </label>
          ))}
        </div>
        {errors.kind && <p role="alert" className="mt-1 text-xs text-destructive">{errors.kind}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={kind === "promotion" ? "Effective from" : kind === "marriage" ? "Wedding date" : "Born on"}
          htmlFor="eventDate"
          error={errors.eventDate}
        >
          <Input name="eventDate" type="date" defaultValue={today} required />
        </Field>
        {kind === "promotion" && (
          <Field label="New title (optional)" htmlFor="newTitle" error={errors.newTitle}>
            <Input name="newTitle" maxLength={120} placeholder="e.g. Senior Engineer" />
          </Field>
        )}
      </div>

      {kind === "new_baby" && (
        <p className="text-xs text-ink-muted">
          We won&rsquo;t announce a new baby to the company unless {firstName} tells us they&rsquo;d like that.
        </p>
      )}

      <Field label="Anything we should know? (optional)" htmlFor="note" error={errors.note}>
        <Input name="note" maxLength={500} placeholder="e.g. wedding is in Lahore" />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Share news"}</Button>
        {state && "success" in state && <p role="status" className="text-sm text-ink-muted">{state.note}</p>}
        {state && "error" in state && !state.fieldErrors && (
          <p role="alert" className="text-sm text-destructive">{state.error}</p>
        )}
      </div>
    </form>
  );
}

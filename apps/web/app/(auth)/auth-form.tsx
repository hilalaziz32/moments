"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import type { ActionResult } from "@/app/actions/auth";

interface FieldSpec {
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
  hint?: string;
}

export function AuthForm({
  action, fields, submitLabel, successMessage, hidden, defaults,
}: {
  action: (prev: unknown, formData: FormData) => Promise<ActionResult>;
  fields: FieldSpec[];
  submitLabel: string;
  /** Shown instead of the form once the action succeeds without redirecting. */
  successMessage?: string;
  /** Carried through the submit, e.g. where to go afterwards. */
  hidden?: Record<string, string>;
  /** Pre-filled values, e.g. the email an invitation was sent to. */
  defaults?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, null as ActionResult | null);
  const fieldErrors = state && "fieldErrors" in state ? state.fieldErrors : undefined;
  const formError = state && "error" in state ? state.error : null;

  if (successMessage && state && "success" in state) {
    return (
      <p role="status" className="mt-8 rounded-lg border border-rule bg-surface-sunk px-4 py-3 text-sm text-ink">
        {successMessage}
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {fields.map((f) => (
        <Field
          key={f.name}
          htmlFor={f.name}
          label={f.label}
          hint={f.hint}
          error={fieldErrors?.[f.name]}
        >
          <Input name={f.name} type={f.type} autoComplete={f.autoComplete} defaultValue={defaults?.[f.name]} required />
        </Field>
      ))}

      {formError && !fieldErrors && (
        <p role="alert" className="text-sm text-destructive">{formError}</p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Working…" : submitLabel}
      </Button>
    </form>
  );
}

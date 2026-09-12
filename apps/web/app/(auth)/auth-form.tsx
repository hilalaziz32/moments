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
  action, fields, submitLabel,
}: {
  action: (prev: unknown, formData: FormData) => Promise<ActionResult>;
  fields: FieldSpec[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null as ActionResult | null);
  const fieldErrors = state && "fieldErrors" in state ? state.fieldErrors : undefined;
  const formError = state && "error" in state ? state.error : null;

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {fields.map((f) => (
        <Field
          key={f.name}
          htmlFor={f.name}
          label={f.label}
          hint={f.hint}
          error={fieldErrors?.[f.name]}
        >
          <Input name={f.name} type={f.type} autoComplete={f.autoComplete} required />
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

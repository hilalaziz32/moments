"use client";

import { useActionState } from "react";
import { createOrganization, type ActionResult } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

const TIMEZONES = [
  { value: "Asia/Karachi", label: "Pakistan (PKT)" },
  { value: "Asia/Dubai", label: "United Arab Emirates (GST)" },
  { value: "Asia/Riyadh", label: "Saudi Arabia (AST)" },
  { value: "Europe/London", label: "United Kingdom" },
];

export function CreateOrgForm() {
  const [state, action, pending] = useActionState(
    createOrganization,
    null as ActionResult | null,
  );
  const fieldErrors = state && "fieldErrors" in state ? state.fieldErrors : undefined;

  return (
    <form action={action} className="mt-8 max-w-md space-y-5">
      <Field
        htmlFor="name"
        label="Company name"
        error={fieldErrors?.name}
        hint="This appears on announcements and invoices."
      >
        <Input name="name" required autoFocus placeholder="Acme Pakistan (Pvt) Ltd" />
      </Field>

      <Field
        htmlFor="timezone"
        label="Where your team works"
        hint="Announcements go out at 9 AM in this timezone."
      >
        <select
          name="timezone"
          defaultValue="Asia/Karachi"
          className="flex h-9 w-full rounded-md border border-input bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </Field>

      <Field htmlFor="employeeCountHint" label="Roughly how many people?">
        <Input name="employeeCountHint" type="number" min={1} placeholder="40" />
      </Field>

      {state && "error" in state && !fieldErrors && (
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Continue"}
      </Button>
    </form>
  );
}

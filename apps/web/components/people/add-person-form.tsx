"use client";

import { useActionState } from "react";
import { addPerson } from "@/app/actions/people";
import type { ActionResult } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AddPersonForm({ managers }: { managers: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(addPerson, null as ActionResult | null);
  const errors = state && "fieldErrors" in state ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="space-y-5">
      <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
        <Input name="fullName" required maxLength={200} autoComplete="off" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mobile number" htmlFor="phone" hint="We text them to confirm their delivery address." error={errors.phone}>
          <Input name="phone" inputMode="tel" placeholder="0300 1234567" />
        </Field>
        <Field label="Work email" htmlFor="workEmail" error={errors.workEmail}>
          <Input name="workEmail" type="email" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Joining date"
          htmlFor="hireDate"
          hint="If they join today or in the next few weeks, we'll plan a welcome."
          error={errors.hireDate}
        >
          <Input name="hireDate" type="date" />
        </Field>
        <Field label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth}>
          <Input name="dateOfBirth" type="date" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Job title" htmlFor="jobTitle">
          <Input name="jobTitle" maxLength={120} />
        </Field>
        <Field label="Department" htmlFor="department">
          <Input name="department" maxLength={120} />
        </Field>
      </div>

      <Field label="Manager" htmlFor="managerId" hint="They get a suggested note on the day.">
        <select name="managerId" defaultValue="" className={selectClass}>
          <option value="">No manager</option>
          {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add to team"}</Button>
        {state && "error" in state && !state.fieldErrors && (
          <p role="alert" className="text-sm text-destructive">{state.error}</p>
        )}
      </div>
    </form>
  );
}

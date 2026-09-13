"use client";

import { useActionState } from "react";
import { updatePerson } from "@/app/actions/people";
import type { ActionResult } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface EditablePerson {
  id: string;
  fullName: string;
  preferredName: string | null;
  workEmail: string | null;
  personalEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  dateOfBirth: string | null;
  hireDate: string | null;
  jobTitle: string | null;
  department: string | null;
  managerId: string | null;
  halalOnly: boolean;
  isVegetarian: boolean;
  needsEggless: boolean;
  allergies: string[];
  shirtSize: string | null;
  celebrationOptOut: boolean;
  hideBirthYear: boolean;
}

function Check({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-4 rounded border-input accent-[var(--state-active)]" />
      <span>
        <span className="block text-sm text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function EditPersonForm({ person, managers }: { person: EditablePerson; managers: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(updatePerson, null as ActionResult<{ note: string }> | null);
  const e = state && "fieldErrors" in state ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="employeeId" value={person.id} />

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Who they are</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="fullName" error={e.fullName}>
            <Input name="fullName" defaultValue={person.fullName} required maxLength={200} />
          </Field>
          <Field label="Goes by (optional)" htmlFor="preferredName" hint="Used in messages: “Happy birthday, Bilal”.">
            <Input name="preferredName" defaultValue={person.preferredName ?? ""} maxLength={80} />
          </Field>
          <Field label="Job title" htmlFor="jobTitle">
            <Input name="jobTitle" defaultValue={person.jobTitle ?? ""} maxLength={120} />
          </Field>
          <Field label="Department" htmlFor="department">
            <Input name="department" defaultValue={person.department ?? ""} maxLength={120} />
          </Field>
          <Field label="Manager" htmlFor="managerId" hint="They get a suggested note on the day.">
            <select name="managerId" defaultValue={person.managerId ?? ""} className={selectClass}>
              <option value="">No manager</option>
              {managers.filter((m) => m.id !== person.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Dates</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of birth" htmlFor="dateOfBirth" error={e.dateOfBirth}>
            <Input name="dateOfBirth" type="date" defaultValue={person.dateOfBirth ?? ""} />
          </Field>
          <Field label="Joining date" htmlFor="hireDate" error={e.hireDate}>
            <Input name="hireDate" type="date" defaultValue={person.hireDate ?? ""} />
          </Field>
        </div>
        <Check name="hideBirthYear" label="Never mention their age" defaultChecked={person.hideBirthYear} />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">How to reach them</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mobile number" htmlFor="phone" hint="Texts about their delivery go here." error={e.phone}>
            <Input name="phone" inputMode="tel" defaultValue={person.phone ?? ""} placeholder="0300 1234567" />
          </Field>
          <Field label="WhatsApp number (if different)" htmlFor="whatsapp" error={e.whatsapp}>
            <Input name="whatsapp" inputMode="tel" defaultValue={person.whatsapp ?? ""} />
          </Field>
          <Field label="Work email" htmlFor="workEmail" error={e.workEmail}>
            <Input name="workEmail" type="email" defaultValue={person.workEmail ?? ""} />
          </Field>
          <Field label="Personal email" htmlFor="personalEmail" error={e.personalEmail}>
            <Input name="personalEmail" type="email" defaultValue={person.personalEmail ?? ""} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Gifts</legend>
        <p className="text-xs text-ink-muted">We pick food gifts around these.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Check name="halalOnly" label="Halal only" defaultChecked={person.halalOnly} />
          <Check name="isVegetarian" label="Vegetarian" defaultChecked={person.isVegetarian} />
          <Check name="needsEggless" label="Eggless" defaultChecked={person.needsEggless} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Allergies" htmlFor="allergies" hint="Separate with commas, e.g. nuts, dairy.">
            <Input name="allergies" defaultValue={person.allergies.join(", ")} />
          </Field>
          <Field label="Shirt size" htmlFor="shirtSize" error={e.shirtSize}>
            <select name="shirtSize" defaultValue={person.shirtSize ?? ""} className={selectClass}>
              <option value="">Not known</option>
              {["XS", "S", "M", "L", "XL", "XXL", "XXXL"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-ink">Privacy</legend>
        <Check
          name="celebrationOptOut"
          label="Don't celebrate them"
          hint="No gifts, no announcements, no messages. Anything already planned is cancelled."
          defaultChecked={person.celebrationOptOut}
        />
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-5">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
        {state && "success" in state && <p role="status" className="text-sm text-ink-muted">{state.note}</p>}
        {state && "error" in state && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      </div>
    </form>
  );
}

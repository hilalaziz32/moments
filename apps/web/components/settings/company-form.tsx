"use client";

import { useActionState } from "react";
import { updateCompany } from "@/app/actions/settings";
import type { ActionResult } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

const TIMEZONES = [
  ["Asia/Karachi", "Pakistan (Karachi)"],
  ["Asia/Dubai", "UAE (Dubai)"],
  ["Asia/Riyadh", "Saudi Arabia (Riyadh)"],
  ["Asia/Qatar", "Qatar"],
  ["Asia/Kolkata", "India"],
  ["Europe/London", "UK (London)"],
  ["America/New_York", "US Eastern"],
] as const;

export interface CompanyValues {
  name: string;
  legalName: string | null;
  timezone: string;
  billingEmail: string | null;
  ntn: string | null;
  strn: string | null;
  taxJurisdiction: string | null;
  feb29: string;
  latePolicy: string;
  celebrateOnTerminatedExit: boolean;
  announceAt: string;
}

export function CompanyForm({ values, readOnly }: { values: CompanyValues; readOnly: boolean }) {
  const [state, action, pending] = useActionState(updateCompany, null as ActionResult | null);
  const e = state && "fieldErrors" in state ? state.fieldErrors ?? {} : {};
  const zones = TIMEZONES.some(([z]) => z === values.timezone) ? TIMEZONES : [[values.timezone, values.timezone] as const, ...TIMEZONES];

  return (
    <form action={action} className="space-y-8">
      <fieldset disabled={readOnly} className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Company</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" hint="What your team calls it. Used in texts." error={e.name}>
            <Input name="name" defaultValue={values.name} required maxLength={200} />
          </Field>
          <Field label="Legal name" htmlFor="legalName" hint="As it should appear on invoices." error={e.legalName}>
            <Input name="legalName" defaultValue={values.legalName ?? ""} maxLength={200} />
          </Field>
          <Field label="Timezone" htmlFor="timezone" error={e.timezone}>
            <select name="timezone" defaultValue={values.timezone} className={selectClass}>
              {zones.map(([z, label]) => <option key={z} value={z}>{label}</option>)}
            </select>
          </Field>
          <Field label="Announcement time" htmlFor="announceAt" hint="When celebrations go out on the day. Farewells stay at the end of the day." error={e.announceAt}>
            <Input name="announceAt" type="time" defaultValue={values.announceAt} step={900} />
          </Field>
        </div>
      </fieldset>

      <fieldset disabled={readOnly} className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Invoices and tax</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Billing email" htmlFor="billingEmail" error={e.billingEmail}>
            <Input name="billingEmail" type="email" defaultValue={values.billingEmail ?? ""} />
          </Field>
          <Field label="Sales tax authority" htmlFor="taxJurisdiction" error={e.taxJurisdiction}>
            <select name="taxJurisdiction" defaultValue={values.taxJurisdiction ?? ""} className={selectClass}>
              <option value="">Not registered</option>
              <option value="SRB">Sindh (SRB)</option>
              <option value="PRA">Punjab (PRA)</option>
              <option value="KPRA">Khyber Pakhtunkhwa (KPRA)</option>
              <option value="BRA">Balochistan (BRA)</option>
              <option value="ICT">Islamabad (ICT)</option>
              <option value="FBR">Federal (FBR)</option>
            </select>
          </Field>
          <Field label="NTN" htmlFor="ntn" error={e.ntn}>
            <Input name="ntn" defaultValue={values.ntn ?? ""} placeholder="1234567-8" inputMode="numeric" />
          </Field>
          <Field label="STRN" htmlFor="strn" error={e.strn}>
            <Input name="strn" defaultValue={values.strn ?? ""} placeholder="13 digits" inputMode="numeric" />
          </Field>
        </div>
      </fieldset>

      <fieldset disabled={readOnly} className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Rules</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Birthdays on 29 February" htmlFor="feb29" hint="In years without a 29th." error={e.feb29}>
            <select name="feb29" defaultValue={values.feb29} className={selectClass}>
              <option value="feb_28">Celebrate on 28 February</option>
              <option value="mar_01">Celebrate on 1 March</option>
            </select>
          </Field>
          <Field label="If an announcement is running late" htmlFor="latePolicy" error={e.latePolicy}>
            <select name="latePolicy" defaultValue={values.latePolicy} className={selectClass}>
              <option value="fire_immediately_if_before_15">Send it anyway, if it&rsquo;s before 3 pm</option>
              <option value="next_day">Send it the next morning</option>
              <option value="skip">Don&rsquo;t send it</option>
            </select>
          </Field>
        </div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox" name="celebrateOnTerminatedExit" defaultChecked={values.celebrateOnTerminatedExit}
            className="mt-0.5 size-4 rounded border-input accent-[var(--state-active)]"
          />
          <span>
            <span className="block text-sm text-ink">Plan a farewell even when someone is let go</span>
            <span className="block text-xs text-ink-muted">Off by default. Most companies don&rsquo;t want this.</span>
          </span>
        </label>
      </fieldset>

      {readOnly ? (
        <p className="text-xs text-ink-muted">Only an owner or admin can change these.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-5">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
          {state && "success" in state && <p role="status" className="text-sm text-ink-muted">Saved.</p>}
          {state && "error" in state && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
        </div>
      )}
    </form>
  );
}

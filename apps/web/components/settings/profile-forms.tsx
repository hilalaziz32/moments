"use client";

import { useActionState } from "react";
import { changePassword, updateProfile } from "@/app/actions/settings";
import type { ActionResult } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string | null }) {
  const [state, action, pending] = useActionState(updateProfile, null as ActionResult | null);
  const e = state && "fieldErrors" in state ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="fullName" error={e.fullName}>
          <Input name="fullName" defaultValue={fullName} required maxLength={200} />
        </Field>
        <Field label="Mobile number" htmlFor="phone" hint="Approval requests are texted here." error={e.phone}>
          <Input name="phone" inputMode="tel" defaultValue={phone ?? ""} placeholder="0300 1234567" />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        {state && "success" in state && <p role="status" className="text-sm text-ink-muted">Saved.</p>}
        {state && "error" in state && !state.fieldErrors && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null as ActionResult | null);
  const e = state && "fieldErrors" in state ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="space-y-4" key={state && "success" in state ? "done" : "form"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="password" hint="At least 8 characters." error={e.password}>
          <Input name="password" type="password" autoComplete="new-password" required />
        </Field>
        <Field label="Type it again" htmlFor="confirm" error={e.confirm}>
          <Input name="confirm" type="password" autoComplete="new-password" required />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending}>{pending ? "Saving…" : "Change password"}</Button>
        {state && "success" in state && <p role="status" className="text-sm text-ink-muted">Password changed.</p>}
        {state && "error" in state && !state.fieldErrors && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      </div>
    </form>
  );
}

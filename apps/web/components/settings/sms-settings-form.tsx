"use client";

import { useActionState } from "react";
import { saveSmsSettings, sendTestText } from "@/app/actions/messaging";
import type { ActionResult } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SmsSettingsForm({
  enabled, testPhone, readOnly,
}: {
  enabled: boolean;
  testPhone: string | null;
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState(saveSmsSettings, null as ActionResult | null);
  const errors = state && "fieldErrors" in state ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="space-y-4">
      <label className="flex items-start gap-3">
        <input
          type="checkbox" name="enabled" defaultChecked={enabled} disabled={readOnly}
          className="mt-0.5 size-4 rounded border-input accent-[var(--state-active)]"
        />
        <span>
          <span className="block text-sm font-medium text-ink">Text people</span>
          <span className="block text-xs text-ink-muted">
            Address requests and reminders to employees, suggested notes to managers, and approval
            requests to you. Never company-wide announcements.
          </span>
        </span>
      </label>

      <Field
        label="Test phone"
        htmlFor="testPhone"
        hint="While you're in dry run, every text goes here instead, marked [PREVIEW]."
        error={errors.testPhone}
      >
        <Input name="testPhone" inputMode="tel" placeholder="0300 1234567" defaultValue={testPhone ?? ""} disabled={readOnly} />
      </Field>

      {readOnly ? (
        <p className="text-xs text-ink-muted">Only an owner or admin can change these.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          {state && "success" in state && <p role="status" className="text-sm text-ink-muted">Saved.</p>}
          {state && "error" in state && !state.fieldErrors && (
            <p role="alert" className="text-sm text-destructive">{state.error}</p>
          )}
        </div>
      )}
    </form>
  );
}

export function TestTextForm({ defaultPhone }: { defaultPhone: string | null }) {
  const [state, action, pending] = useActionState(sendTestText, null as ActionResult<{ note: string }> | null);
  const errors = state && "fieldErrors" in state ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <Field label="Send a test text to" htmlFor="phone" error={errors.phone} className="min-w-48 flex-1">
        <Input name="phone" inputMode="tel" placeholder="0300 1234567" defaultValue={defaultPhone ?? ""} />
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>{pending ? "Sending…" : "Send test"}</Button>
      {state && "success" in state && <p role="status" className="w-full text-sm text-ink-muted">{state.note}</p>}
      {state && "error" in state && !state.fieldErrors && (
        <p role="alert" className="w-full text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}

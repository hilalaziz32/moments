"use client";

import { useActionState } from "react";
import { sendAdminTestText, setOrgLifecycle, setOrgSender, setOrgSms } from "@/app/actions/admin";
import type { ActionResult } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Outcome({ state, saved = "Saved." }: { state: ActionResult<{ note?: string }> | null; saved?: string }) {
  if (!state) return null;
  if ("success" in state) return <p role="status" className="text-sm text-ink-muted">{state.note ?? saved}</p>;
  if (state.fieldErrors) return null;
  return <p role="alert" className="text-sm text-destructive">{state.error}</p>;
}

export function AdminSenderForm({
  orgId, current, defaultFrom, numbers,
}: {
  orgId: string;
  current: string | null;
  defaultFrom: string | null;
  numbers: { phoneNumber: string; friendlyName: string; sms: boolean }[];
}) {
  const [state, action, pending] = useActionState(setOrgSender, null as ActionResult | null);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="orgId" value={orgId} />
      <Field label="Texts come from" htmlFor={`from-${orgId}`} className="min-w-64 flex-1">
        <select name="fromNumber" defaultValue={current ?? ""} className={selectClass}>
          <option value="">{defaultFrom ? `Platform default (${defaultFrom})` : "Not set"}</option>
          {numbers.map((n) => (
            <option key={n.phoneNumber} value={n.phoneNumber} disabled={!n.sms}>
              {n.phoneNumber} · {n.friendlyName}{n.sms ? "" : " (no SMS)"}
            </option>
          ))}
        </select>
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save number"}</Button>
      <div className="w-full"><Outcome state={state} /></div>
      {numbers.length === 0 && (
        <p className="w-full text-xs text-ink-muted">No numbers on the Twilio account yet. Buy one in the Twilio console, then reload.</p>
      )}
    </form>
  );
}

export function AdminSmsForm({ orgId, enabled, testPhone }: { orgId: string; enabled: boolean; testPhone: string | null }) {
  const [state, action, pending] = useActionState(setOrgSms, null as ActionResult | null);
  const errors = state && "fieldErrors" in state ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="orgId" value={orgId} />
      <label className="flex items-center gap-3 text-sm text-ink">
        <input type="checkbox" name="enabled" defaultChecked={enabled} className="size-4 rounded border-input accent-[var(--state-active)]" />
        SMS on for this account
      </label>
      <Field label="Test phone (dry-run texts go here)" htmlFor={`test-${orgId}`} error={errors.testPhone}>
        <Input name="testPhone" inputMode="tel" placeholder="0300 1234567" defaultValue={testPhone ?? ""} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending}>{pending ? "Saving…" : "Save SMS settings"}</Button>
        <Outcome state={state} />
      </div>
    </form>
  );
}

export function AdminTestTextForm({ orgId, defaultPhone }: { orgId: string; defaultPhone: string | null }) {
  const [state, action, pending] = useActionState(sendAdminTestText, null as ActionResult<{ note: string }> | null);
  const errors = state && "fieldErrors" in state ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="orgId" value={orgId} />
      <Field label="Send a test text to" htmlFor={`phone-${orgId}`} error={errors.phone} className="min-w-48 flex-1">
        <Input name="phone" inputMode="tel" placeholder="0300 1234567" defaultValue={defaultPhone ?? ""} />
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>{pending ? "Sending…" : "Send test"}</Button>
      <div className="w-full"><Outcome state={state} /></div>
    </form>
  );
}

export function AdminLifecycleForm({ orgId, status, inDryRun }: { orgId: string; status: string; inDryRun: boolean }) {
  const [state, action, pending] = useActionState(setOrgLifecycle, null as ActionResult | null);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <input type="hidden" name="orgId" value={orgId} />
      <Field label="Status" htmlFor={`status-${orgId}`}>
        <select name="status" defaultValue={status} className={selectClass}>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="past_due">Past due</option>
          <option value="suspended">Suspended</option>
          <option value="churned">Churned</option>
        </select>
      </Field>
      <Field label="Dry run" htmlFor={`dry-${orgId}`}>
        <select name="dryRun" defaultValue="keep" className={selectClass}>
          <option value="keep">{inDryRun ? "Keep as is (on)" : "Keep as is (off)"}</option>
          <option value="end">Turn off: send for real</option>
          <option value="extend">On for 7 more days</option>
        </select>
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      <div className="sm:col-span-3"><Outcome state={state} /></div>
    </form>
  );
}

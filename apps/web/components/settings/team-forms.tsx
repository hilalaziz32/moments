"use client";

import { useActionState, useState } from "react";
import { changeRole, inviteMember } from "@/app/actions/team";
import type { ActionResult } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const INVITE_ROLES = [
  { key: "hr_manager", label: "HR manager", hint: "People, moments, approvals and news." },
  { key: "admin", label: "Admin", hint: "Everything, including budgets, billing and the team." },
  { key: "finance", label: "Finance", hint: "Billing and invoices." },
  { key: "manager", label: "Manager", hint: "Sees upcoming moments." },
  { key: "viewer", label: "Viewer", hint: "Can look, can't change anything." },
];

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard blocked: the link is visible to select by hand.
        }
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteMember, null as ActionResult<{ link: string; email: string }> | null);
  const [role, setRole] = useState("hr_manager");
  const errors = state && "fieldErrors" in state ? state.fieldErrors ?? {} : {};
  const hint = INVITE_ROLES.find((r) => r.key === role)?.hint;

  return (
    <div className="space-y-4">
      <form action={action} className="grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-start">
        <Field label="Their work email" htmlFor="invite-email" error={errors.email}>
          <Input name="email" type="email" placeholder="ayesha@company.pk" required />
        </Field>
        <Field label="Role" htmlFor="invite-role" hint={hint} error={errors.role}>
          <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
            {INVITE_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </Field>
        <Button type="submit" className="sm:mt-6" disabled={pending}>{pending ? "Creating…" : "Create invite link"}</Button>
      </form>

      {state && "error" in state && !state.fieldErrors && (
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
      )}

      {state && "success" in state && (
        <div className="rounded-lg border border-state-done/40 bg-state-done/5 p-4">
          <p className="text-sm font-medium text-ink">Invite link for {state.email}</p>
          <p className="mt-1 text-xs text-ink-muted">
            Send it on WhatsApp or Slack. It works for 7 days, only for that email, and stops working once used.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-rule bg-surface px-3 py-2 text-xs text-ink">
              {state.link}
            </code>
            <CopyButton text={state.link} label="Copy link" />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`You're invited to join our team on Moments: ${state.link}`)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-input px-3 py-1.5 text-sm text-ink hover:bg-surface-sunk"
            >
              Share on WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export function RoleSelect({ memberId, role, allowOwner }: { memberId: string; role: string; allowOwner: boolean }) {
  const [state, action, pending] = useActionState(changeRole, null as ActionResult | null);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="memberId" value={memberId} />
      <select
        name="role"
        defaultValue={role}
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-8 rounded-md border border-input bg-surface px-2 text-sm"
        aria-label="Role"
      >
        {allowOwner && <option value="owner">Owner</option>}
        {!allowOwner && role === "owner" && <option value="owner">Owner</option>}
        {INVITE_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
      </select>
      {state && "error" in state && <span role="alert" className="text-xs text-destructive">{state.error}</span>}
    </form>
  );
}

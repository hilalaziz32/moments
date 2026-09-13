"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { decideFromLink } from "@/app/actions/public-approvals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

export function ApproveForm({
  token, approvalId, requiresOtp, employeeName,
}: {
  token: string;
  approvalId: string;
  requiresOtp: boolean;
  employeeName: string;
}) {
  const [note, setNote] = useState("");
  const [otp, setOtp] = useState("");
  const [needsCode, setNeedsCode] = useState(requiresOtp);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    const declined = done === "rejected";
    return (
      <div className="mt-6 rounded-lg border border-rule bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto size-6 text-state-done" aria-hidden />
        <h2 className="mt-3 text-base font-semibold text-ink">{declined ? "Declined" : "Approved"}</h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          {declined
            ? `No gift will be sent for ${employeeName}. The announcement can still go out.`
            : `We'll order it and get it to ${employeeName} on the day.`}
        </p>
      </div>
    );
  }

  const blocked = pending || (needsCode && otp.length !== 6);

  function decide(decision: "approved" | "rejected") {
    setError(null);
    start(async () => {
      const r = await decideFromLink(token, approvalId, { decision, note, otp });
      if (r.ok) {
        setDone(r.decision === "auto_approved" ? "approved" : r.decision);
        return;
      }
      if (r.needsCode) setNeedsCode(true);
      setError(r.error);
    });
  }

  return (
    <div className="mt-6 space-y-4">
      {needsCode && (
        <Field htmlFor="otp" label="Six-digit code" hint="We emailed it separately, because this is a larger amount.">
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          />
        </Field>
      )}

      <Field htmlFor="note" label="Note" hint="Optional. HR will see it.">
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button size="lg" className="flex-1" disabled={blocked} onClick={() => decide("approved")}>
          {pending ? "Saving…" : "Approve"}
        </Button>
        <Button size="lg" variant="outline" className="flex-1" disabled={blocked} onClick={() => decide("rejected")}>
          Decline
        </Button>
      </div>
    </div>
  );
}

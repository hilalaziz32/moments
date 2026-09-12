"use client";

import { useActionState, useState } from "react";
import { goLive, type ActionResult } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";

export function GoLiveForm() {
  const [state, action, pending] = useActionState(goLive, null as ActionResult | null);
  const [dryRun, setDryRun] = useState(true);

  return (
    <form action={action} className="mt-10 rounded-lg border border-rule bg-card p-5">
      {/*
        Dry run defaults ON. Handing employee data to a new vendor and letting it
        message your whole company automatically is a big ask; a week of
        previews-to-HR-only is what makes it a survivable decision.
      */}
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="dryRun"
          checked={dryRun}
          onChange={(e) => setDryRun(e.target.checked)}
          className="mt-0.5 size-4 rounded border-input accent-[var(--state-active)]"
        />
        <span>
          <span className="block text-sm font-medium text-ink">
            Send everything to me first, for a week
          </span>
          <span className="mt-0.5 block text-sm text-ink-muted">
            Every message gets written and every gift gets picked, but for the first
            seven days they come to you marked <span className="font-medium text-ink">[PREVIEW]</span>{" "}
            instead of going to your team. Turn it off whenever you&rsquo;re happy.
          </span>
        </span>
      </label>

      {state && "error" in state && (
        <p role="alert" className="mt-4 text-sm text-destructive">{state.error}</p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Starting…" : "Go live"}
        </Button>
        <span className="text-xs text-ink-muted">
          {dryRun ? "Previews only until you say otherwise." : "Your team will start hearing from Moments."}
        </span>
      </div>
    </form>
  );
}

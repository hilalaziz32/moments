"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeMomentStatus } from "@/app/actions/moments";

export function MomentActions({ momentId, status }: { momentId: string; status: string }) {
  const [mode, setMode] = useState<null | "skipped" | "cancelled">(null);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  // Mirrors the database guard: skip only before it starts, cancel any time
  // until it's finished.
  const canSkip = status === "scheduled";
  const canCancel = !["cancelled", "skipped", "completed", "delivered", "announced", "rejected"].includes(status);
  if (!canSkip && !canCancel) return null;

  if (!mode) {
    return (
      <div className="flex gap-2">
        {canSkip && (
          <Button variant="outline" size="sm" onClick={() => setMode("skipped")}>Skip this one</Button>
        )}
        {canCancel && (
          <Button variant="ghost" size="sm" onClick={() => setMode("cancelled")}>Cancel moment</Button>
        )}
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await changeMomentStatus(momentId, mode, reason);
          if ("error" in r) {
            toast.error(r.error);
          } else {
            toast.success(mode === "cancelled"
              ? "Cancelled. Nothing further will happen for this moment."
              : "Skipped.");
            setMode(null);
            setReason("");
          }
        });
      }}
    >
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={mode === "cancelled" ? "Why? Only your team sees this." : "Why skip it?"}
        aria-label="Reason"
        className="h-8 w-72"
        autoFocus
      />
      <Button type="submit" size="sm" variant={mode === "cancelled" ? "destructive" : "default"} disabled={pending}>
        {pending ? "Saving…" : mode === "cancelled" ? "Cancel moment" : "Skip moment"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setMode(null)}>Keep it</Button>
    </form>
  );
}

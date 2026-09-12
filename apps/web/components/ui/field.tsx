import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

/**
 * A labelled form field with room for a hint and an error.
 *
 * Errors are written in the interface's voice and say what to do -- they never
 * apologise and they are never vague.
 */
export function Field({
  label, htmlFor, hint, error, children, className,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {hint && <p id={hintId} className="text-xs text-ink-muted">{hint}</p>}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id: htmlFor,
            "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
            "aria-invalid": error ? true : undefined,
          })
        : children}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

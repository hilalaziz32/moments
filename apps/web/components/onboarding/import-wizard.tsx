"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  detectDateFormat, formatPreview, DATE_FORMATS, type DateFormat,
} from "@moments/core/csv";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { IMPORT_FIELDS, FIELD_BY_KEY } from "@/lib/import/fields";
import { suggestMapping } from "@/lib/import/sniff";
import { normalizeRow, findDuplicates } from "@/lib/import/normalize";
import { parseRosterFile, parsePasted, MAX_ROWS, type ParsedFile } from "@/lib/import/parse-file";
import { stageImport, commitImport } from "@/app/actions/onboarding";

type Stage = "upload" | "map" | "validate";

export function ImportWizard() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<{ name: string; parsed: ParsedFile } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [dateFormats, setDateFormats] = useState<Record<string, DateFormat>>({});
  const [pending, startTransition] = useTransition();

  async function handleFile(f: File) {
    try {
      const parsed = await parseRosterFile(f);
      if (parsed.headers.length === 0) {
        toast.error("That file has no column headers in the first row.");
        return;
      }
      applyParsed(f.name, parsed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't read that file.");
    }
  }

  function applyParsed(name: string, parsed: ParsedFile) {
    const suggestions = suggestMapping(parsed.headers, parsed.rows);
    const nextMapping: Record<string, string | null> = {};
    const nextFormats: Record<string, DateFormat> = {};

    for (const s of suggestions) {
      nextMapping[s.header] = s.fieldKey;
      if (s.fieldKey && FIELD_BY_KEY.get(s.fieldKey)?.kind === "date") {
        const detection = detectDateFormat(parsed.rows.map((r) => r[s.header]));
        // Only pre-fill when it is unambiguous. An ambiguous column stays empty
        // so the human has to choose -- guessing shifts birthdays by months.
        if (detection.best && !detection.ambiguous) nextFormats[s.header] = detection.best.format;
      }
    }

    setFile({ name, parsed });
    setMapping(nextMapping);
    setDateFormats(nextFormats);
    setStage("map");
    if (parsed.truncated) {
      toast.warning(`We loaded the first ${MAX_ROWS.toLocaleString()} rows. Split the file to add the rest.`);
    }
  }

  const dateColumns = useMemo(
    () =>
      Object.entries(mapping)
        .filter(([, key]) => key && FIELD_BY_KEY.get(key)?.kind === "date")
        .map(([header]) => header),
    [mapping],
  );

  const mappedFields = useMemo(
    () => new Set(Object.values(mapping).filter(Boolean) as string[]),
    [mapping],
  );

  const rows = useMemo(() => {
    if (!file || stage !== "validate") return [];
    return file.parsed.rows.map((raw, i) => normalizeRow(raw, i + 2, mapping, dateFormats));
  }, [file, stage, mapping, dateFormats]);

  const duplicates = useMemo(() => findDuplicates(rows, "work_email"), [rows]);

  const summary = useMemo(() => {
    const blocking = rows.filter((r) => r.errors.length > 0 || duplicates.has(r.rowNumber));
    const missingDob = rows.filter((r) => !r.normalized.dateOfBirth).length;
    const missingHire = rows.filter((r) => !r.normalized.hireDate).length;
    return { total: rows.length, ready: rows.length - blocking.length, blocking, missingDob, missingHire };
  }, [rows, duplicates]);

  /* ---------------------------------------------------------------- upload */
  if (stage === "upload") {
    return (
      <div>
        <h1 className="text-xl font-semibold text-ink">Upload your team</h1>
        <p className="mt-1 max-w-lg text-sm text-ink-muted">
          A spreadsheet with one row per person. We need names and dates; everything
          else is optional and can wait.
        </p>

        <label
          className="mt-8 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-rule-strong bg-surface px-6 py-14 text-center transition-colors hover:bg-surface-sunk focus-within:ring-2 focus-within:ring-ring"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) void handleFile(f);
          }}
        >
          <Upload className="size-5 text-ink-faint" aria-hidden />
          <span className="text-sm font-medium text-ink">
            Drop a file here, or choose one
          </span>
          <span className="text-xs text-ink-muted">
            Excel (.xlsx) or CSV, up to {MAX_ROWS.toLocaleString()} people
          </span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </label>

        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-ink-muted hover:text-ink">
            Or paste from Google Sheets
          </summary>
          <textarea
            rows={6}
            placeholder="Paste your rows here, including the header row"
            className="mt-3 w-full rounded-md border border-input bg-surface p-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (!text.trim()) return;
              e.preventDefault();
              const parsed = parsePasted(text);
              if (parsed.headers.length === 0) {
                toast.error("We couldn't find a header row in that.");
                return;
              }
              applyParsed("pasted-rows", parsed);
            }}
          />
        </details>
      </div>
    );
  }

  /* ------------------------------------------------------------------- map */
  if (stage === "map" && file) {
    const suggestions = suggestMapping(file.parsed.headers, file.parsed.rows);
    const missingRequired = IMPORT_FIELDS.filter((f) => f.required && !mappedFields.has(f.key));
    const unsetDateFormats = dateColumns.filter((h) => !dateFormats[h]);
    const canContinue = missingRequired.length === 0 && unsetDateFormats.length === 0;

    return (
      <div>
        <h1 className="text-xl font-semibold text-ink">Match your columns</h1>
        <p className="mt-1 max-w-lg text-sm text-ink-muted">
          We&rsquo;ve guessed where things go. Check the dates especially &mdash; that&rsquo;s
          the one we can&rsquo;t afford to get wrong.
        </p>

        <div className="mt-8 divide-y divide-rule rounded-lg border border-rule bg-card">
          {file.parsed.headers.map((header) => {
            const sample = file.parsed.rows
              .map((r) => String(r[header] ?? "").trim())
              .filter(Boolean)
              .slice(0, 3);
            const suggestion = suggestions.find((s) => s.header === header);
            const fieldKey = mapping[header] ?? null;
            const isDate = fieldKey ? FIELD_BY_KEY.get(fieldKey)?.kind === "date" : false;

            return (
              <div key={header} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{header}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-faint">
                    {sample.length ? sample.join(" · ") : "empty column"}
                  </p>
                </div>

                <span aria-hidden className="hidden self-center text-ink-faint sm:block">&rarr;</span>

                <div>
                  <select
                    aria-label={`What is "${header}"?`}
                    value={fieldKey ?? ""}
                    onChange={(e) => {
                      const next = e.target.value || null;
                      setMapping((m) => ({ ...m, [header]: next }));
                      if (next && FIELD_BY_KEY.get(next)?.kind === "date" && !dateFormats[header]) {
                        const d = detectDateFormat(file.parsed.rows.map((r) => r[header]));
                        if (d.best && !d.ambiguous) {
                          setDateFormats((f) => ({ ...f, [header]: d.best!.format }));
                        }
                      }
                    }}
                    className="h-9 w-full rounded-md border border-input bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Don&rsquo;t import — keep as a note</option>
                    {IMPORT_FIELDS.map((f) => (
                      <option
                        key={f.key}
                        value={f.key}
                        disabled={mappedFields.has(f.key) && fieldKey !== f.key}
                      >
                        {f.label}{f.required ? " (required)" : ""}
                      </option>
                    ))}
                  </select>

                  {suggestion?.because && fieldKey === suggestion.fieldKey && (
                    <p className="mt-1 text-xs text-ink-faint">{suggestion.because}</p>
                  )}

                  {isDate && (
                    <DateFormatPicker
                      header={header}
                      values={file.parsed.rows.map((r) => r[header])}
                      value={dateFormats[header]}
                      onChange={(fmt) => setDateFormats((f) => ({ ...f, [header]: fmt }))}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {missingRequired.length > 0 && (
          <p className="mt-4 flex items-start gap-2 text-sm text-state-waiting">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            Map a column to {missingRequired.map((f) => f.label.toLowerCase()).join(" and ")} to continue.
          </p>
        )}
        {unsetDateFormats.length > 0 && (
          <p className="mt-4 flex items-start gap-2 text-sm text-state-waiting">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            Choose a date format for {unsetDateFormats.join(" and ")}.
          </p>
        )}

        <div className="mt-8 flex gap-2">
          <Button variant="outline" onClick={() => setStage("upload")}>Back</Button>
          <Button disabled={!canContinue} onClick={() => setStage("validate")}>
            Check {file.parsed.rows.length.toLocaleString()} rows
          </Button>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- validate */
  if (stage === "validate" && file) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-ink">Check before importing</h1>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {summary.blocking.length === 0 ? (
                <CheckCircle2 className="size-4 text-state-done" aria-hidden />
              ) : (
                <AlertCircle className="size-4 text-state-waiting" aria-hidden />
              )}
              {summary.ready.toLocaleString()} of {summary.total.toLocaleString()} people are ready
            </CardTitle>
            <CardDescription>
              {summary.missingDob > 0 && (
                <>{summary.missingDob} without a birthday — we&rsquo;ll ask them to fill it in. </>
              )}
              {summary.missingHire > 0 && (
                <>{summary.missingHire} without a joining date. </>
              )}
              {/*
                THE GUARD. Importing a roster of people hired years ago must not
                fire hundreds of "new hire" celebrations and hundreds of gift
                orders. Stated here, where HR can see it, before they commit.
              */}
              <strong className="font-medium text-ink">
                No new-hire celebrations will be created from past joining dates.
              </strong>
            </CardDescription>
          </CardHeader>

          {summary.blocking.length > 0 && (
            <CardContent>
              <p className="mb-3 text-sm text-ink">
                {summary.blocking.length} {summary.blocking.length === 1 ? "row needs" : "rows need"} a fix.
                You can import the rest now and add these later.
              </p>
              <div className="max-h-72 overflow-y-auto rounded-md border border-rule">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Rows that could not be imported</caption>
                  <thead className="sticky top-0 bg-surface-sunk">
                    <tr className="border-b border-rule">
                      <th scope="col" className="px-3 py-2 font-medium text-ink-muted">Row</th>
                      <th scope="col" className="px-3 py-2 font-medium text-ink-muted">Person</th>
                      <th scope="col" className="px-3 py-2 font-medium text-ink-muted">What to fix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.blocking.slice(0, 100).map((r) => (
                      <tr key={r.rowNumber} className="border-b border-rule last:border-0">
                        <td data-numeric className="px-3 py-2 text-ink-faint">{r.rowNumber}</td>
                        <td className="px-3 py-2 text-ink">
                          {String(r.normalized.fullName ?? "—")}
                        </td>
                        <td className="px-3 py-2 text-ink-muted">
                          {duplicates.get(r.rowNumber) ??
                            r.errors.map((e) => e.message).join(" ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="mt-8 flex gap-2">
          <Button variant="outline" onClick={() => setStage("map")}>Back to columns</Button>
          <Button
            disabled={pending || summary.ready === 0}
            onClick={() => {
              startTransition(async () => {
                const staged = await stageImport({
                  filename: file.name,
                  columnMapping: mapping,
                  dateFormats,
                  matchOn: "work_email",
                  rows,
                });
                if ("error" in staged) { toast.error(staged.error); return; }

                const committed = await commitImport(staged.batchId);
                if ("error" in committed) { toast.error(committed.error); return; }

                toast.success(
                  `Imported ${committed.imported} ${committed.imported === 1 ? "person" : "people"}` +
                  (committed.updated ? `, updated ${committed.updated}.` : "."),
                );
                router.push("/setup/budgets");
              });
            }}
          >
            {pending ? "Importing…" : `Import ${summary.ready.toLocaleString()} people`}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * The single most important control in the wizard.
 *
 * "28/09/1994" is ambiguous. If both DD/MM and MM/DD parse the column and
 * disagree about any value, we say so and refuse to pre-select -- because
 * guessing wrong shifts every birthday by months and nobody finds out for a year.
 */
function DateFormatPicker({
  header, values, value, onChange,
}: {
  header: string;
  values: unknown[];
  value: DateFormat | undefined;
  onChange: (f: DateFormat) => void;
}) {
  const detection = useMemo(() => detectDateFormat(values), [values]);
  const total = values.filter((v) => String(v ?? "").trim() !== "").length;
  const chosen = detection.candidates.find((c) => c.format === value);
  const preview = useMemo(() => {
    if (!value) return null;
    for (const v of values) {
      const s = String(v ?? "").trim();
      if (!s) continue;
      const c = detection.candidates.find((x) => x.format === value);
      if (!c) return null;
      return c.preview[0] ?? null;
    }
    return null;
  }, [value, values, detection]);

  return (
    <div className={cn("mt-2 rounded-md border p-2.5",
      detection.ambiguous && !value ? "border-state-waiting/50 bg-state-waiting/5" : "border-rule bg-surface-sunk")}>
      <label className="text-xs font-medium text-ink" htmlFor={`fmt-${header}`}>
        How are these dates written?
      </label>
      <select
        id={`fmt-${header}`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value as DateFormat)}
        className="mt-1.5 h-8 w-full rounded border border-input bg-surface px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Choose a format…</option>
        {DATE_FORMATS.map((f) => {
          const c = detection.candidates.find((x) => x.format === f);
          return (
            <option key={f} value={f} disabled={!c}>
              {f === "EXCEL_SERIAL" ? "Excel date numbers" : f}
              {c ? ` — reads ${c.parsed} of ${total}` : " — doesn't fit"}
            </option>
          );
        })}
      </select>

      {detection.ambiguous && !value && detection.ambiguityExample && (
        <p className="mt-2 text-xs text-state-waiting">
          &ldquo;{detection.ambiguityExample.value}&rdquo; could be{" "}
          {detection.ambiguityExample.readings
            .map((r) => formatPreview(r.iso))
            .join(" or ")}
          . Pick the right one.
        </p>
      )}

      {value && chosen && (
        <p className="mt-2 text-xs text-ink-muted">
          Reads {chosen.parsed} of {total} rows.{" "}
          {preview && <span className="text-ink">{preview}</span>}
        </p>
      )}
    </div>
  );
}

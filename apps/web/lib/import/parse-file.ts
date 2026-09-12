import Papa from "papaparse";

/**
 * Reads a roster file in the browser.
 *
 * XLSX is supported deliberately: HR people send .xlsx far more often than .csv,
 * and rejecting it costs roughly a third of sign-ups at the first real step.
 */
export interface ParsedFile {
  headers: string[];
  rows: Record<string, unknown>[];
  truncated: boolean;
}

export const MAX_ROWS = 5000;

export async function parseRosterFile(file: File): Promise<ParsedFile> {
  const isExcel = /\.(xlsx|xls)$/i.test(file.name);
  return isExcel ? parseExcel(file) : parseCsv(file);
}

function parseCsv(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const headers = (result.meta.fields ?? []).filter((h) => h && h.trim() !== "");
        const rows = result.data.slice(0, MAX_ROWS);
        resolve({ headers, rows, truncated: result.data.length > MAX_ROWS });
      },
      error: (err: Error) => reject(new Error(`We couldn't read that file: ${err.message}`)),
    });
  });
}

async function parseExcel(file: File): Promise<ParsedFile> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false, raw: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("That workbook has no sheets in it.");
  const sheet = wb.Sheets[sheetName]!;

  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "", raw: true,
  });
  const headers = Object.keys(json[0] ?? {}).map((h) => h.trim()).filter(Boolean);
  return { headers, rows: json.slice(0, MAX_ROWS), truncated: json.length > MAX_ROWS };
}

/** Pasted from Google Sheets: tab-separated, header row first. */
export function parsePasted(text: string): ParsedFile {
  const result = Papa.parse<Record<string, unknown>>(text.trim(), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const headers = (result.meta.fields ?? []).filter((h) => h && h.trim() !== "");
  return { headers, rows: result.data.slice(0, MAX_ROWS), truncated: result.data.length > MAX_ROWS };
}

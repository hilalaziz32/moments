import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseDateStrict, detectDateFormat } from "./normalize-date.js";

describe("parseDateStrict", () => {
  test("parses DD/MM/YYYY -- Bilal's birthday", () => {
    assert.deepEqual(parseDateStrict("28/09/1994", "DD/MM/YYYY"), { ok: true, iso: "1994-09-28" });
  });

  test("the SAME string under MM/DD/YYYY is a different month", () => {
    // This is the entire reason we never guess: 09/08 is Sep 8 or Aug 9.
    assert.deepEqual(parseDateStrict("09/08/1994", "DD/MM/YYYY"), { ok: true, iso: "1994-08-09" });
    assert.deepEqual(parseDateStrict("09/08/1994", "MM/DD/YYYY"), { ok: true, iso: "1994-09-08" });
  });

  test("REJECTS impossible dates instead of rolling them over", () => {
    // JavaScript's Date would silently make this 3 March.
    const r = parseDateStrict("31/02/1994", "DD/MM/YYYY");
    assert.equal(r.ok, false);
    assert.match((r as { reason: string }).reason, /does not exist/);
  });

  test("rejects 29 Feb in a non-leap year but accepts it in a leap year", () => {
    assert.equal(parseDateStrict("29/02/1995", "DD/MM/YYYY").ok, false);
    assert.deepEqual(parseDateStrict("29/02/1996", "DD/MM/YYYY"), { ok: true, iso: "1996-02-29" });
  });

  test("parses Excel serial numbers", () => {
    // 34605 is 1994-09-28 in Excel's 1900 date system.
    assert.deepEqual(parseDateStrict("34605", "EXCEL_SERIAL"), { ok: true, iso: "1994-09-28" });
  });

  test("parses textual months, which HR exports love", () => {
    assert.deepEqual(parseDateStrict("28-Sep-1994", "DD-MMM-YYYY"), { ok: true, iso: "1994-09-28" });
    assert.deepEqual(parseDateStrict("Sep 28 1994", "MMM-DD-YYYY"), { ok: true, iso: "1994-09-28" });
  });

  test("expands two-digit years sensibly for birth and hire dates", () => {
    assert.deepEqual(parseDateStrict("28/09/94", "DD/MM/YYYY"), { ok: true, iso: "1994-09-28" });
    assert.deepEqual(parseDateStrict("28/09/05", "DD/MM/YYYY"), { ok: true, iso: "2005-09-28" });
  });
});

describe("detectDateFormat", () => {
  test("flags ambiguity when both DD/MM and MM/DD parse but disagree", () => {
    const d = detectDateFormat(["01/02/1994", "03/04/1995", "05/06/1996"]);
    assert.equal(d.ambiguous, true, "must refuse to silently pick a format");
    assert.ok(d.ambiguityExample);
  });

  test("is NOT ambiguous when a day > 12 rules out MM/DD", () => {
    const d = detectDateFormat(["28/09/1994", "15/03/1990", "22/11/1988"]);
    assert.equal(d.ambiguous, false);
    assert.equal(d.best?.format, "DD/MM/YYYY");
  });

  test("produces a human preview for the confirmation step", () => {
    const d = detectDateFormat(["28/09/1994"]);
    assert.ok(d.best!.preview[0]!.includes("28 Sep 1994"));
  });

  test("counts failures so the UI can say '338 of 340 rows parse'", () => {
    const d = detectDateFormat(["28/09/1994", "15/03/1990", "not a date"]);
    assert.equal(d.best?.parsed, 2);
    assert.equal(d.best?.failed, 1);
  });
});

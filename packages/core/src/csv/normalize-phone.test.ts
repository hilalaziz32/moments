import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, formatPhoneDisplay } from "./normalize-phone.js";

describe("normalizePhone -- Pakistani numbers", () => {
  const expected = "+923001234567";

  test("accepts the forms an HR export actually contains", () => {
    for (const input of [
      "03001234567",        // canonical local
      "0300-1234567",       // hyphenated
      "0300 1234567",       // spaced
      "+92 300 1234567",    // international, spaced
      "+923001234567",      // E.164
      "00923001234567",     // 00 prefix
      "923001234567",       // country code, no plus
      "3001234567",         // leading zero eaten by a spreadsheet
    ]) {
      const r = normalizePhone(input);
      assert.equal(r.ok, true, `failed on ${input}`);
      assert.equal((r as { e164: string }).e164, expected, `wrong result for ${input}`);
    }
  });

  test("classifies mobile vs landline", () => {
    assert.equal((normalizePhone("03001234567") as { kind: string }).kind, "mobile");
    assert.equal((normalizePhone("02134567890") as { kind: string }).kind, "landline");
  });

  test("rejects Excel scientific notation with an actionable message", () => {
    const r = normalizePhone("3.00123E+09");
    assert.equal(r.ok, false);
    assert.match((r as { reason: string }).reason, /scientific notation/);
  });

  test("rejects a too-short number rather than padding it", () => {
    assert.equal(normalizePhone("0300123").ok, false);
  });

  test("passes through non-PK international numbers", () => {
    const r = normalizePhone("+971501234567");
    assert.equal(r.ok, true);
    assert.equal((r as { kind: string }).kind, "international");
  });

  test("formats for display", () => {
    assert.equal(formatPhoneDisplay("+923001234567"), "+92 300 1234567");
  });
});

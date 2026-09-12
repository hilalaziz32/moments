import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  formatPKR, parseRupeesToPaisa, rupeesToPaisa, isWithinDbMoneyBounds, marginBps,
} from "./pkr.js";

describe("PKR money", () => {
  test("the seven default budgets convert correctly", () => {
    assert.equal(rupeesToPaisa(2500), 250_000);   // birthday
    assert.equal(rupeesToPaisa(3500), 350_000);   // work anniversary
    assert.equal(rupeesToPaisa(4000), 400_000);   // new hire
    assert.equal(rupeesToPaisa(5000), 500_000);   // promotion
    assert.equal(rupeesToPaisa(7500), 750_000);   // marriage
  });

  test("formats the way the UI shows it", () => {
    assert.equal(formatPKR(250_000), "PKR 2,500");
    assert.equal(formatPKR(11_850_000), "PKR 118,500");
  });

  test("parses messy user input", () => {
    assert.equal(parseRupeesToPaisa("2,500"), 250_000);
    assert.equal(parseRupeesToPaisa("Rs 2500"), 250_000);
    assert.equal(parseRupeesToPaisa("PKR 2,500.50"), 250_050);
  });

  test("throws rather than silently returning 0, which would ship nothing", () => {
    assert.throws(() => parseRupeesToPaisa("abc"));
    assert.throws(() => parseRupeesToPaisa(""));
  });

  test("the DB floor catches the rupees-vs-paisa bug", () => {
    assert.equal(isWithinDbMoneyBounds(2_500), false, "PKR 25 must be rejected");
    assert.equal(isWithinDbMoneyBounds(250_000), true);
    assert.equal(isWithinDbMoneyBounds(0), true, "zero means 'no gift', which is allowed");
  });

  test("margin in basis points matches the generated column", () => {
    assert.equal(marginBps(250_000, 200_000), 2000); // 20%
  });
});

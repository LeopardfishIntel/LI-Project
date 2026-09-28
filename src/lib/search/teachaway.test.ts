import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractCards, parseJobDetail, parseAbsoluteDate } from "./teachaway";

const FIXTURES_DIR = join(__dirname, "__fixtures__", "teachaway");

console.log("🧪 Running Teach Away Parser & Snapshot Unit Tests...");

// 1. Hub Card Extraction Snapshot
const hubHtml = readFileSync(join(FIXTURES_DIR, "hub-page.html"), "utf-8");
const { cards, oversized } = extractCards(hubHtml);

assert.strictEqual(oversized, 0, "Expected 0 oversized cards");
assert.strictEqual(cards.length, 3, "Expected 3 distinct job cards from fixture");

const [card1, card2, card3] = cards;
assert.strictEqual(card1.title, "Al Majd Charter School - ICT Teacher");
assert.strictEqual(card1.href, "https://www.teachaway.com/teaching-jobs-abroad/al-majd-charter-school-ict-teacher-0");
assert.strictEqual(card1.curriculum, "IB Continuum");
assert.strictEqual(card1.startDate, "August 2026");

assert.strictEqual(card2.title, "Al Majd Charter School - Science Teacher");
assert.strictEqual(card2.href, "https://www.teachaway.com/teaching-jobs-abroad/al-majd-charter-school-science-teacher");
assert.strictEqual(card2.curriculum, "British / Cambridge");

console.log("  ✅ PASS: Hub card extraction (slugs, titles, curriculum, and start dates match)");

// 2. Detail Page JSON-LD & Date Parsing Snapshot
const detailHtml = readFileSync(join(FIXTURES_DIR, "job-detail.html"), "utf-8");
const detail = parseJobDetail(detailHtml);

assert.strictEqual(detail.closesAt, "2026-12-15", "Expected validThrough ISO date 2026-12-15");
assert.strictEqual(detail.posted, "2026-09-16", "Expected datePosted 2026-09-16");
assert.strictEqual(detail.employerName, "Taaleem & Dubai Schools");
assert.strictEqual(detail.country, "United Arab Emirates");
assert.strictEqual(detail.locality, "Abu Dhabi");

console.log("  ✅ PASS: Detail page JSON-LD closing date, employer, and geo attributes match");

// 3. Absolute Date Edge Cases
assert.strictEqual(parseAbsoluteDate("15 December 2026"), "2026-12-15");
assert.strictEqual(parseAbsoluteDate("Dec 15, 2026"), "2026-12-15");
assert.strictEqual(parseAbsoluteDate("2026-12-15T00:00:03.580Z"), "2026-12-15");
assert.strictEqual(parseAbsoluteDate("invalid"), null);

console.log("  ✅ PASS: Absolute date parsing utility handles RFC3339 & natural language dates");

console.log("📊 Teach Away Test Summary: All snapshot and date parsing assertions passed.\n");

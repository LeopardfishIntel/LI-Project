import { assessEngineHealth, HealthLog, healthyLine, APPROVED_ENGINES, WATCHED_ENGINES, pillTone, EngineHealth } from "./engineHealth";

let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log("  PASS: " + name); } else { failed++; console.error("  FAIL: " + name); } }
console.log("Engine health (admin warnings)");

const DAY = 86400000;
const now = Date.parse("2026-10-07T20:00:00Z");
const log = (engine: string, daysAgo: number, found: number, added = 0): HealthLog => ({ engine, totalFound: found, addedCount: added, createdAtMillis: now - daysAgo * DAY });
const always = () => true;
const never = () => false;

check("no records -> red", assessEngineHealth("GEMS", [], now, always).level === "red");
check("healthy engine -> ok", assessEngineHealth("GRC", [log("GRC", 0, 150, 2), log("GRC", 1, 150), log("GRC", 2, 148)], now, always).level === "ok");
check("latest day 0 after good days -> red", assessEngineHealth("GEMS", [log("GEMS", 0, 0), log("GEMS", 1, 80)], now, always).level === "red");
check("did not run on a due day -> red", assessEngineHealth("GRC", [log("GRC", 3, 150)], now, always).level === "red");
check("not due -> no 'did not run' warning", assessEngineHealth("SEARCH_ASSOCIATES", [log("SEARCH_ASSOCIATES", 3, 60, 1), log("SEARCH_ASSOCIATES", 4, 60, 1)], now, never).level !== "red");
check("one day of 0, never any jobs -> amber (e.g. TES today)", assessEngineHealth("TES", [log("TES", 0, 0)], now, always).level === "amber");
check("3 days of 0, never any jobs -> amber", assessEngineHealth("TES", [log("TES", 0, 0), log("TES", 1, 0), log("TES", 2, 0)], now, always).level === "amber");
check("chunks in one night are added up (TES)", assessEngineHealth("TES", [log("TES", 0, 0), { ...log("TES", 0, 12, 1), createdAtMillis: now - 3600000 }, log("TES", 1, 20, 1)], now, always).level === "ok");
check("finds jobs but nothing new for 14 days -> yellow", assessEngineHealth("GRC", Array.from({ length: 16 }, (_, i) => log("GRC", i, 150, 0)), now, always).level === "yellow");
check("new jobs in the last 14 days -> not yellow", assessEngineHealth("GRC", Array.from({ length: 16 }, (_, i) => log("GRC", i, 150, i === 5 ? 3 : 0)), now, always).level === "ok");
check("other engines' records are ignored", assessEngineHealth("GEMS", [log("GRC", 0, 150), log("GEMS", 0, 80)], now, always).level === "ok");
check("green line is not shown while a watched engine is unapproved", WATCHED_ENGINES.every((e) => APPROVED_ENGINES.includes(e)) === healthyLine().green);
check("waiting text names the unapproved engines", WATCHED_ENGINES.filter((e) => !APPROVED_ENGINES.includes(e)).every((e) => healthyLine().text.includes(e.replace(/_/g, " "))) || healthyLine().green);
const eh = (engine: string, level: EngineHealth["level"]): EngineHealth => ({ engine, level, reason: "", lastGoodDay: null });
check("pill: red stays red", pillTone("TES", [eh("TES", "red")]) === "red");
check("pill: approved + ok -> green", pillTone("GRC", [eh("GRC", "ok")]) === "green");
check("pill: unapproved + ok -> waiting, never green", pillTone("GEMS", [eh("GEMS", "ok")]) === "waiting");
check("pill: key with a space matches (SEARCH ASSOCIATES)", pillTone("SEARCH ASSOCIATES", [eh("SEARCH_ASSOCIATES", "amber")]) === "amber");
check("pill: unwatched engine -> none", pillTone("ISP", [eh("TES", "red")]) === "none");
check("pill: no health data -> none", pillTone("TES", null) === "none");
console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);

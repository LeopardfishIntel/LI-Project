/**
 * ROLE DECISION (3-way): accept | review | reject, always with reasons.
 *
 * Sits on top of roleClassifier.ts (which stays as-is except for the two small
 * fixes listed in the review notes). Two things this adds:
 *  1. Teach Away's own position-type label (Certified Teacher, ESL Instructor, ...)
 *     is now a first-class signal instead of being ignored.
 *  2. Ambiguous cases go to REVIEW instead of being silently dropped or
 *     silently accepted.
 */
import {
  isSupportOrNonTeachingRole,
  isStrictAcademicTeachingRole,
} from "@/lib/crawler/roleClassifier";

export type RoleDecision = "accept" | "review" | "reject";

export interface RoleResult {
  decision: RoleDecision;
  reasons: string[];
}

interface PositionPolicy {
  label: string;
  policy: RoleDecision;
}

/**
 * Labels are the position-type categories shown on teachaway.com's job board.
 * Policy is a business decision - edit to taste:
 *  - University Graduate: entry-level teaching roles (e.g. BASIS). Title check still applies.
 *  - ESL Instructor: allowed only via human review (could be an EAL post at an international school).
 *  - School Health and Welfare Staff: counselors etc. Review rather than reject.
 */
export const POSITION_TYPES: PositionPolicy[] = [
  { label: "University Graduate", policy: "accept" },
  { label: "Certified Teacher", policy: "accept" },
  { label: "Director/Principal", policy: "accept" },
  { label: "Librarian", policy: "accept" },
  { label: "ESL Instructor", policy: "review" },
  { label: "School Health and Welfare Staff", policy: "review" },
  { label: "Office/Administration Staff", policy: "reject" },
  { label: "College/University Faculty", policy: "reject" },
  { label: "Ministry/Regional Level Administrator", policy: "reject" },
  { label: "Vocational/Technical Instructor", policy: "reject" },
];

/**
 * Finds the position-type label near the START of the card text (job cards put the
 * badge first; searching the whole card would match phrases in the description).
 * CONFIRM against a saved real hub page that the badge is really at the start.
 */
export function detectPositionType(cardText: string): string | null {
  const head = (cardText || "").slice(0, 100).toLowerCase();
  let best: { label: string; idx: number } | null = null;
  for (const p of POSITION_TYPES) {
    const idx = head.indexOf(p.label.toLowerCase());
    if (idx >= 0 && (!best || idx < best.idx)) best = { label: p.label, idx };
  }
  return best ? best.label : null;
}

// Never wanted on this site: tutoring and TEFL-style roles.
const HARD_REJECT_TITLE = /\b(tutor(?:s|ing)?|tefl|tesol|celta|efl)\b/i;

// Might be legitimate at an international school, so a human decides.
const REVIEW_TITLE =
  /\b(esl|eal|ell|english\s+(?:as\s+an?\s+)?(?:additional|second|foreign)\s+language|english\s+language\s+learners?|online|remote|virtual)\b/i;

const RANK: Record<RoleDecision, number> = { accept: 0, review: 1, reject: 2 };

export function classifyTeachingRole(
  rawTitle: string | null | undefined,
  positionType: string | null = null
): RoleResult {
  const title = (rawTitle || "").trim();
  const out: RoleResult = { decision: "accept", reasons: [] };
  const flag = (d: RoleDecision, reason: string) => {
    if (RANK[d] > RANK[out.decision]) out.decision = d;
    out.reasons.push(reason);
  };

  if (!title) {
    flag("reject", "empty_title");
    return out;
  }

  if (HARD_REJECT_TITLE.test(title)) flag("reject", "tutoring_or_tefl_title");

  if (positionType) {
    const pt = POSITION_TYPES.find((p) => p.label === positionType);
    if (pt && pt.policy !== "accept") flag(pt.policy, `position_type:${pt.label}`);
  }

  // roleClassifier.isSupportOrNonTeachingRole() silently rejects titles over 80 chars.
  // On Teach Away that usually means the card parser glued the location onto the title,
  // so surface it as a parsing problem instead of a "support role".
  if (title.length > 80) {
    flag("review", "title_over_80_chars_check_extraction");
  } else if (title.length < 5) {
    flag("reject", "title_too_short");
  } else if (isSupportOrNonTeachingRole(title)) {
    flag("reject", "support_or_non_k12_pattern");
  } else if (!isStrictAcademicTeachingRole(title)) {
    flag("review", "no_academic_role_noun");
  }

  if (REVIEW_TITLE.test(title)) flag("review", "esl_eal_or_online_title");

  return out;
}

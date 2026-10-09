/**
 * 🛡️ LEOPARDFISH ADMIN IDENTIFIER
 * Unifies admin verification across client context, page components, and security guards.
 *
 * (Roger, 2026-10-09) There is ONE admin account. Admin means exactly this sign-in email and nothing else:
 * not a name inside an email, not a company address, not a plan or tier, not an ID saved on a profile.
 * To add another admin later, add their exact email to ADMIN_EMAILS.
 */
export const ADMIN_EMAILS: readonly string[] = ["roger@leopardfishintel.com"];

export function isAdminEmail(email?: string | null): boolean {
  const e = (email || "").toLowerCase().trim();
  return e !== "" && ADMIN_EMAILS.includes(e);
}

// The extra parameters are kept so existing callers still compile; only the email (or an already-verified context flag) counts.
export function checkIsAdmin(
  user?: { email?: string | null; uid?: string } | null,
  _profile?: unknown,
  _customId?: string | null,
  contextIsAdmin?: boolean
): boolean {
  if (contextIsAdmin === true) return true;
  return isAdminEmail(user?.email);
}

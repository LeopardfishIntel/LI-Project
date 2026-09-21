/**
 * 🛡️ LEOPARDFISH ADMIN IDENTIFIER
 * Unifies admin verification across client context, page components, and security guards.
 */

export function checkIsAdmin(
  user?: { email?: string | null; uid?: string } | null,
  profile?: { role?: string; tier?: string; teacherId?: string; id?: string; customId?: string; isAdmin?: boolean } | null,
  customId?: string | null,
  contextIsAdmin?: boolean
): boolean {
  if (contextIsAdmin === true) return true;
  if (!user && !profile && !customId) return false;

  const email = (user?.email || '').toLowerCase().trim();
  if (
    email === 'fred@leopardfish.intel' ||
    email === 'fred@leopardfishintel.com' ||
    email.includes('fred') ||
    email.includes('roger') ||
    email.includes('admin') ||
    email.endsWith('@leopardfishintel.com') ||
    email.endsWith('@leopardfish.intel')
  ) {
    return true;
  }

  if (profile?.isAdmin === true) return true;

  const role = (profile?.role || '').toLowerCase().trim();
  if (role === 'admin') return true;

  const tier = (profile?.tier || '').toLowerCase().trim();
  if (tier === 'admin' || tier === 'pro') return true;

  const teacherId = (profile?.teacherId || profile?.id || profile?.customId || customId || '').toUpperCase().trim();
  if (teacherId === 'FLI007') return true;

  return false;
}

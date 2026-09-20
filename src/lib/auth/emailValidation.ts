/**
 * 🛡️ DISPOSABLE / TEMPORARY EMAIL DOMAIN BLACKLIST
 * Prevents burner accounts from cycling through free evaluation quotas.
 */
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'sharklasers.com',
  'grr.la',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'mailinator.com',
  'mailinater.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'dispostable.com',
  'fakemailgenerator.com',
  'generator.email',
  'getairmail.com',
  'maildrop.cc',
  'inboxkitten.com',
  'getnada.com',
  'abcvg.com',
  'dropmail.me',
  'mohmal.com',
  'crazymailing.com',
  'mytemp.email',
  'burnermail.io',
  'mintemail.com',
  'mailnesia.com',
  'fakeinbox.com',
  'disposablemail.com',
  'emailondeck.com',
  'tempail.com',
  'tempm.com',
  'temporarymail.com',
  'tempinbox.com'
]);

/**
 * Validates whether an email uses a disposable / temporary domain.
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

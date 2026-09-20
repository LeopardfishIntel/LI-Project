/**
 * 🛰️ SEO SAFETY: Search Bot & Crawler Detection
 * Identifies search engine bots (Googlebot, Bingbot, etc.) and AI indexers
 * to exempt them from client-side guest meters, view quotas, and paywall gates.
 */
export function isSearchCrawler(userAgent?: string): boolean {
  const ua = userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  if (!ua) return false;

  const botPatterns = [
    'Googlebot',
    'Google-InspectionTool',
    'Google-Extended',
    'Mediapartners-Google',
    'AdsBot-Google',
    'Storebot-Google',
    'GoogleOther',
    'bingbot',
    'msnbot',
    'Baiduspider',
    'YandexBot',
    'DuckDuckBot',
    'Applebot',
    'ClaudeBot',
    'Anthropic-ai',
    'PerplexityBot',
    'GPTBot',
    'ChatGPT-User',
    'CCBot',
    'facebookexternalhit',
    'Twitterbot',
    'LinkedInBot',
    'Slackbot',
    'TelegramBot',
    'WhatsApp',
    'Pinterestbot',
    'rogerbot',
    'embedly',
    'quora link preview',
    'showyoubot',
    'outbrain',
    'vkShare',
    'W3C_Validator',
  ];

  const regex = new RegExp(botPatterns.join('|'), 'i');
  return regex.test(ua);
}

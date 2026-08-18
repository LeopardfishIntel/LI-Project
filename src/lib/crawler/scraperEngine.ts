/**
 * 🛰️ STEALTH SCRAPER ENGINE (PLAYWRIGHT HEADLESS WITH ANTI-BOT BYPASS)
 * Renders modern SPAs (React, Next.js, Vue, Angular) and bypasses Cloudflare/Imperva bot challenges.
 * Masks automation footprints, intercepts heavy third-party assets, and provides resilient retry backoff.
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { sanitizeUrl } from './urlResolver';

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
];

const BLOCKED_DOMAINS = [
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'facebook.net',
  'facebook.com/tr',
  'connect.facebook.net',
  'hotjar.com',
  'sentry.io',
  'datadoghq.com',
  'clarity.ms',
  'criteo.net',
  'adnxs.com',
  'quantserve.com',
  'scorecardresearch.com',
  'segment.io',
  'optimizely.com'
];

const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font', 'imageset']);

const CLOUDFLARE_SIGNATURES = [
  'just a moment...',
  'checking your browser',
  'cloudflare ray id',
  'cf-browser-verification',
  'attention required! | cloudflare',
  'access denied | imperva',
  'incapsula incident id',
  'ddos-guard'
];

export interface ScrapeOptions {
  timeoutMs?: number;
  waitForSelector?: string;
  proxyUrl?: string;
  maxRetries?: number;
  blockResources?: boolean;
}

export interface ExtractedLink {
  href: string;
  text: string;
}

export interface ScrapeResult {
  success: boolean;
  url: string;
  finalUrl: string;
  status: number;
  html: string;
  textContent: string;
  title: string;
  links: ExtractedLink[];
  isSpaRendered: boolean;
  isBlocked: boolean;
  error?: string;
  durationMs: number;
}

let browserInstance: Browser | null = null;

/**
 * Returns a shared browser instance or launches a new one.
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-zygote',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list'
    ];

    try {
      browserInstance = await chromium.launch({
        headless: true,
        channel: 'chrome',
        args: launchArgs
      });
    } catch {
      browserInstance = await chromium.launch({
        headless: true,
        args: launchArgs
      });
    }
  }
  return browserInstance;
}

/**
 * Checks if rendered HTML matches anti-bot challenge signatures.
 */
export function checkIsBlocked(status: number, html: string): boolean {
  if (status === 403 || status === 429) return true;
  const lowerHtml = (html || '').toLowerCase();
  return CLOUDFLARE_SIGNATURES.some(sig => lowerHtml.includes(sig));
}

/**
 * Stealth-enabled page scrape with SPA client-side hydration and anti-bot evasion.
 */
export async function scrapePage(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs || 25000;
  const maxRetries = options.maxRetries ?? 2;
  const blockResources = options.blockResources ?? true;
  const proxyUrl = options.proxyUrl || process.env.CRAWLER_PROXY_URL;

  let attempt = 0;
  let lastError: string | undefined;

  while (attempt <= maxRetries) {
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      const browser = await getBrowser();
      const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

      // Configure stealth context
      context = await browser.newContext({
        userAgent: randomUserAgent,
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        locale: 'en-US',
        timezoneId: 'Europe/London',
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Sec-Ch-Ua': '"Chromium";v="127", "Not)A;Brand";v="99"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        },
        proxy: proxyUrl ? { server: proxyUrl } : undefined
      });

      page = await context.newPage();
      page.setDefaultTimeout(timeoutMs);

      // 🛡️ Stealth Injections: Mask automation fingerprints
      await page.addInitScript(() => {
        // Overwrite navigator.webdriver
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        
        // Mock plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        // Mock window.chrome
        (window as any).chrome = {
          app: { isInstalled: false },
          runtime: {},
          loadTimes: () => {},
          csi: () => {}
        };

        // Mock languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en', 'en-GB'],
        });
      });

      // 🚀 Performance Optimization: Intercept & abort heavy non-essential assets
      if (blockResources) {
        await page.route('**/*', (route) => {
          const request = route.request();
          const reqUrl = request.url().toLowerCase();
          const resourceType = request.resourceType();

          // Block tracking domains
          if (BLOCKED_DOMAINS.some(domain => reqUrl.includes(domain))) {
            return route.abort();
          }

          // Block heavy media/images/fonts
          if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
            return route.abort();
          }

          return route.continue();
        });
      }

      // Navigate and wait for DOM Content Loaded
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: timeoutMs
      });

      // Allow SPA client-side hydration (e.g. React / Next.js mount)
      if (options.waitForSelector) {
        try {
          await page.waitForSelector(options.waitForSelector, { timeout: 4000 });
        } catch {
          // Continue if selector timeout reached
        }
      } else {
        // Brief hydration buffer
        await page.waitForTimeout(1000);
      }

      // If data URI or no network response, status is 200
      const status = response ? response.status() : (url.startsWith('data:') ? 200 : 0);
      const finalUrl = page.url();
      const title = await page.title();
      const html = await page.content();
      const textContent = await page.evaluate(() => document.body?.innerText || '');

      // Check anti-bot block
      const isBlocked = checkIsBlocked(status, html);

      // Extract all links
      const links: ExtractedLink[] = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        return anchors.map(a => ({
          href: (a as HTMLAnchorElement).href,
          text: (a.textContent || '').trim()
        })).filter(item => item.href.startsWith('http'));
      });

      const sanitizedLinks = links
        .map(l => ({ href: sanitizeUrl(l.href) || l.href, text: l.text }))
        .filter(l => Boolean(l.href));

      await context.close();

      if (isBlocked && attempt < maxRetries) {
        attempt++;
        const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(`⚠️ [CRAWLER] Blocked by anti-bot on ${url} (status: ${status}). Retrying in ${Math.round(backoffMs)}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise(res => setTimeout(res, backoffMs));
        continue;
      }

      return {
        success: !isBlocked && status < 400,
        url,
        finalUrl,
        status,
        html,
        textContent,
        title,
        links: sanitizedLinks,
        isSpaRendered: true,
        isBlocked,
        error: isBlocked ? `Anti-bot protection challenge detected (${status})` : undefined,
        durationMs: Date.now() - startTime
      };

    } catch (err: any) {
      lastError = err.message || String(err);
      if (context) {
        await context.close().catch(() => {});
      }

      if (attempt < maxRetries) {
        attempt++;
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`⚠️ [CRAWLER] Scrape failed for ${url}: ${lastError}. Retrying in ${backoffMs}ms...`);
        await new Promise(res => setTimeout(res, backoffMs));
      } else {
        break;
      }
    }
  }

  return {
    success: false,
    url,
    finalUrl: url,
    status: 0,
    html: '',
    textContent: '',
    title: '',
    links: [],
    isSpaRendered: false,
    isBlocked: false,
    error: lastError || 'Scrape execution failed after retries',
    durationMs: Date.now() - startTime
  };
}

/**
 * Gracefully shuts down shared browser instance.
 */
export async function closeScraperEngine(): Promise<void> {
  if (browserInstance && browserInstance.isConnected()) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
}

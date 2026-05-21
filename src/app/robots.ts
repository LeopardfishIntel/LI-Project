import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: [
          'CCBot',
          'anthropic-ai',
          'ClaudeBot',
          'Omgilibot',
          'FacebookBot',
          'cohere-ai'
        ],
        disallow: '/',
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/private/',
          '/staging-preview/',
          '/decide/',
          '/financial-forecaster/',
          '/prepare/',
          '/profile/'
        ],
      },
    ],
    sitemap: 'https://leopardfishintel.com/sitemap.xml',
  };
}

import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/admin", "/staging-preview"],
      },
      {
        userAgent: [
          "Googlebot",
          "Google-Extended",
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Anthropic-ai",
          "PerplexityBot",
          "CCBot",
          "cohere-ai",
          "Meta-ExternalAgent",
          "Applebot",
          "Bingbot",
        ],
        allow: "/",
        disallow: ["/admin", "/api/admin", "/staging-preview"],
      },
    ],
    sitemap: "https://leopardfishintel.com/sitemap.xml",
  };
}

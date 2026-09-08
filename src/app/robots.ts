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
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/admin", "/api/admin", "/staging-preview"],
      },
    ],
    sitemap: "https://leopardfishintel.com/sitemap.xml",
  };
}

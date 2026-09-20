import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/staging-preview",
        "/auth",
      ],
    },
    sitemap: "https://leopardfishintel.com/sitemap.xml",
  };
}

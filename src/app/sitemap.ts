import { MetadataRoute } from "next";
import schoolsData from "../../complete_school_fields_export.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://leopardfishintel.com";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/financial-forecaster`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/featured-jobs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/schools`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/discover`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/prepare`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/churn-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/find-your-fit`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const regionRoutes: MetadataRoute.Sitemap = [
    "middle-east",
    "europe",
    "southeast-asia",
    "east-asia",
    "latin-america",
    "africa"
  ].map((region) => ({
    url: `${baseUrl}/discover/${region}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const schoolRoutes: MetadataRoute.Sitemap = (schoolsData as any[])
    .filter((s) => s.id)
    .map((s) => ({
      url: `${baseUrl}/schools/${s.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  return [...staticRoutes, ...regionRoutes, ...schoolRoutes];
}

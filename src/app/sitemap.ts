import { MetadataRoute } from 'next';
import { SCHOOLS } from '@/data/schools';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://leopardfishintel.com';

  // Static core routes (aligned with trailingSlash: true in next.config.ts)
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/schools/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/financial-forecaster/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/featured-jobs/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/discover/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/prepare/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/methodology/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy/`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms/`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ];

  // Dynamic regional discovery routes
  const regions = [
    'middle-east',
    'europe',
    'southeast-asia',
    'east-asia',
    'latin-america',
    'africa',
    'asia',
  ];

  const regionalRoutes: MetadataRoute.Sitemap = regions.map((region) => ({
    url: `${baseUrl}/discover/${region}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Dynamic school dossier routes (490+ verified international schools)
  const schoolRoutes: MetadataRoute.Sitemap = (SCHOOLS || []).map((school) => ({
    url: `${baseUrl}/schools/${school.id}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...regionalRoutes, ...schoolRoutes];
}

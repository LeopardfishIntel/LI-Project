import { Metadata } from 'next';
import { SCHOOLS } from '@/data/schools';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const school = SCHOOLS.find((s) => s.id === id);

  if (!school) {
    return {
      title: 'School Profile Not Found | Leopardfish Intel',
      description: 'The requested international school profile could not be found.',
    };
  }

  const schoolName = school.name;
  const location = [school.city, school.country].filter(Boolean).join(', ');
  const title = `${schoolName} Teacher Salary, Benefits & Package (${location}) | Leopardfish Intel`;
  const description = `View verified teacher salary scales, tax tiers, housing allowances, and dependent tuition coverage for ${schoolName} in ${location}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://leopardfishintel.com/schools/${id}/`,
    },
    openGraph: {
      title,
      description,
      url: `https://leopardfishintel.com/schools/${id}/`,
      type: 'article',
      siteName: 'Leopardfish Intel',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function SchoolLayout({ params, children }: Props) {
  const { id } = await params;
  const school = SCHOOLS.find((s) => s.id === id);

  const jsonLd = school
    ? {
        '@context': 'https://schema.org',
        '@type': 'EducationalOrganization',
        name: school.name,
        address: {
          '@type': 'PostalAddress',
          addressLocality: school.city || undefined,
          addressCountry: school.country,
        },
        description: `Verified compensation scales, benefits, and contract intelligence for educators at ${school.name}.`,
        url: `https://leopardfishintel.com/schools/${id}/`,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}

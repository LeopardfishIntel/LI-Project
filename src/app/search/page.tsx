import { SchoolCard } from '@/components/school-card';
import { searchSchools } from '@/lib/mock-data';
import { Frown } from 'lucide-react';

export default function SearchPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const query = typeof searchParams?.q === 'string' ? searchParams.q : '';
  const results = searchSchools(query);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
        Search Results
      </h1>
      <p className="text-muted-foreground mb-8">
        {query ? `Showing results for "${query}"` : 'Showing all schools'}
      </p>

      {results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {results.map((school) => (
            <SchoolCard key={school.id} school={school} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-card/50 rounded-lg">
            <Frown className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No schools found</h2>
          <p className="mt-2 text-muted-foreground">
            Try adjusting your search terms or browse all schools.
          </p>
        </div>
      )}
    </div>
  );
}

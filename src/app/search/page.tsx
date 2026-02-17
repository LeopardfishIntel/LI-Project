
'use client';

import { useSearchParams } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { SchoolCard } from '@/components/school-card';
import type { School } from '@/lib/types';
import { Frown, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function SearchSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const firestore = useFirestore();
  const schoolsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'schools') : null),
    [firestore]
  );
  const { data: schools, isLoading } = useCollection<School>(schoolsQuery);

  const results = useMemo(() => {
    if (!schools) return [];
    if (!query) return schools;
    const lowerCaseQuery = query.toLowerCase();
    return schools.filter(
      school =>
        school.name.toLowerCase().includes(lowerCaseQuery) ||
        school.location.toLowerCase().includes(lowerCaseQuery) ||
        school.country.toLowerCase().includes(lowerCaseQuery)
    );
  }, [schools, query]);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
        Search Results
      </h1>
      <p className="text-muted-foreground mb-8">
        {query ? `Showing results for "${query}"` : 'Showing all schools'}
      </p>

      {isLoading && <SearchSkeleton />}

      {!isLoading && results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {results.map(school => (
            <SchoolCard key={school.id} school={school} />
          ))}
        </div>
      ) : null}

      {!isLoading && results.length === 0 && (
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

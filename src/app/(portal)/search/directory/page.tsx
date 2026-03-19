'use client';

import { SchoolCard } from '@/components/school-card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { School } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function DirectorySkeleton() {
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

export default function DirectoryPage() {
  const firestore = useFirestore();
  const schoolsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'schools') : null),
    [firestore]
  );
  const { data: schools, isLoading } = useCollection<School>(schoolsQuery);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-center">
        School Directory
      </h1>
      <p className="text-muted-foreground mb-12 text-center">
        Browse our complete directory of international schools.
      </p>
      {isLoading && <DirectorySkeleton />}
      {!isLoading && schools && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {schools.map(school => (
            <SchoolCard key={school.id} school={school} />
          ))}
        </div>
      )}
    </div>
  );
}

import { SchoolCard } from '@/components/school-card';
import { spotlightSchools } from '@/lib/mock-data';
import { Users } from 'lucide-react';

export default function ForumPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="flex flex-col items-center text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Users className="h-8 w-8 text-primary" />
          Community Forum
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
          Discuss, share, and learn about international schools. Here are some of the most talked-about schools in the community.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {spotlightSchools.map((school) => (
          <SchoolCard key={school.id} school={school} />
        ))}
      </div>
    </div>
  );
}

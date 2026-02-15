import { SchoolCard } from '@/components/school-card';
import { schools } from '@/lib/mock-data';

export default function DirectoryPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-center">
        School Directory
      </h1>
      <p className="text-muted-foreground mb-12 text-center">
        Browse our complete directory of international schools.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {schools.map((school) => (
          <SchoolCard key={school.id} school={school} />
        ))}
      </div>
    </div>
  );
}

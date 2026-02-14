import Image from 'next/image';
import Link from 'next/link';
import { Star, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { School } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SchoolCardProps {
  school: School;
}

const scoreColorClasses = {
  good: 'bg-green-500/20 text-green-400 border-green-500/30',
  neutral: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  bad: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function SchoolCard({ school }: SchoolCardProps) {
  return (
    <Card className="bg-card/70 backdrop-blur-sm border-border overflow-hidden flex flex-col h-full shadow-lg hover:shadow-primary/20 transition-shadow duration-300">
      <CardHeader className="p-0">
        <div className="relative">
          <Image
            src={school.imageUrl}
            alt={`Campus of ${school.name}`}
            width={600}
            height={400}
            data-ai-hint={school.imageHint}
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 px-2 py-1 rounded-full text-sm">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="font-bold">{school.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({school.reviewsCount})</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-xl mb-2 tracking-tight normal-case">
          <Link href={`/schools/${school.id}`} className="hover:text-primary transition-colors">
            {school.name}
          </Link>
        </CardTitle>
        <div className="flex items-center text-muted-foreground text-sm">
          <MapPin className="w-4 h-4 mr-1" />
          <span>{school.location}, {school.country}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline" className={cn(scoreColorClasses[school.intel.salary.score])}>
            Salary: {school.intel.salary.value}
          </Badge>
          <Badge variant="outline" className={cn(scoreColorClasses[school.intel.savingsPotential.score])}>
            Savings: {school.intel.savingsPotential.value}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Link href={`/schools/${school.id}`} className="w-full">
          <Button className="w-full" variant="outline">
            View Profile
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

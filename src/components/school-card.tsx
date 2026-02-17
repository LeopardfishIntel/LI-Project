
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Briefcase, UserCheck, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { School } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

interface SchoolCardProps {
  school: School;
}

const scoreColorClasses = {
  good: 'bg-green-500/20 text-green-400 border-green-500/30',
  neutral: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  bad: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const InfoRow = ({ icon, text }: { icon: React.ReactNode, text?: string }) => {
    if (!text) return null;
    return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {icon}
            <span>{text}</span>
        </div>
    );
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
           <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 px-2 py-1 rounded-full text-sm font-bold">
            {school.intel.accreditation}
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
        <Separator className="my-4" />
         <div className="space-y-2">
            <InfoRow icon={<Briefcase className="w-4 h-4 text-primary" />} text={school.intel.jobsPortal} />
            <InfoRow icon={<UserCheck className="w-4 h-4 text-green-400" />} text={school.intel.minQualifications} />
            <InfoRow icon={<Ban className="w-4 h-4 text-red-400" />} text={school.intel.visaRestrictions} />
        </div>

      </CardContent>
      <CardFooter className="p-4 pt-0 mt-auto">
        <Link href={`/schools/${school.id}`} className="w-full">
          <Button className="w-full" variant="outline">
            View Profile
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

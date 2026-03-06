
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Briefcase, UserCheck, Ban, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { School } from '@/lib/types';
import { cn, getTacticalColor } from '@/lib/utils';
import { Separator } from './ui/separator';

interface SchoolCardProps {
  school: School;
}

export function SchoolCard({ school }: SchoolCardProps) {
  // Prefer User's Google Sheet fields, fallback to legacy intel
  const displaySummary = school.summary || school.description;
  const displayCurriculum = school.curriculum || school.intel.curriculum;
  const displayApprovals = school.approvals || school.intel.accreditation;
  const displayCity = school.city || school.location;
  const displayRatingColor = getTacticalColor(school.numericalRating || school.intel.salary.score);

  return (
    <Card className="bg-card/70 backdrop-blur-sm border-border overflow-hidden flex flex-col h-full shadow-lg hover:shadow-primary/20 transition-all duration-300 group">
      <CardHeader className="p-0">
        <div className="relative">
          <Image
            src={school.imageUrl}
            alt={`Campus of ${school.name}`}
            width={600}
            height={400}
            data-ai-hint={school.imageHint}
            className="w-full h-48 object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
           <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/90 px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest border border-white/10 text-white">
            {displayApprovals}
          </div>
          {school.score && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-primary px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
              <ShieldCheck className="size-3" /> Score: {school.score}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-5 flex-grow space-y-4">
        <div>
            <CardTitle className="text-xl mb-1.5 tracking-tight normal-case text-white leading-tight">
            <Link href={`/schools/${school.id}`} className="hover:text-primary transition-colors">
                {school.name}
            </Link>
            </CardTitle>
            <div className="flex items-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
            <MapPin className="w-3 h-3 mr-1.5 text-primary" />
            <span>{displayCity}, {school.country}</span>
            </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed font-medium">{displaySummary}</p>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={cn("text-[9px] font-black uppercase rounded-sm bg-white/5", displayRatingColor)}>
            Rating: {school.numericalRating || school.intel.salary.score}
          </Badge>
          <Badge variant="outline" className="text-[9px] font-black uppercase rounded-sm bg-white/5 text-primary">
            {displayCurriculum}
          </Badge>
        </div>

        <Separator className="bg-white/5" />
        
        <div className="grid grid-cols-2 gap-y-2">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Class size: <span className="text-white">{school.classSize || school.intel.classSize}</span></div>
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">NC Time: <span className="text-white">{school.ncTime || school.intel.nonContactTime}%</span></div>
        </div>

      </CardContent>
      <CardFooter className="p-5 pt-0 mt-auto">
        <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs h-11 rounded-sm" asChild>
            <Link href={`/schools/${school.id}`}>
                View dossier
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

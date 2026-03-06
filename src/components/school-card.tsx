
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, ShieldCheck } from 'lucide-react';
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
  // Defensive field mapping to support flat JSON from Google Sheets
  const name = school.schoolname || school.name || 'Unknown School';
  const summary = school.summary || school.description || '';
  const curriculum = school.curriculum || (school.intel && school.intel.curriculum) || 'N/A';
  const approvals = school.approvals || (school.intel && school.intel.accreditation) || 'N/A';
  const city = school.city || school.location || '';
  const country = school.country || '';
  const rating = school.rating || school.numericalrating || (school.intel && school.intel.salary.score) || 'neutral';
  const score = school.totalscore || school.score || '';
  const ncTime = school.noncontacttime || (school.intel && school.intel.nonContactTime) || '';
  const classSize = school.classsize || (school.intel && school.intel.classSize) || '';

  return (
    <Card className="bg-card/70 backdrop-blur-sm border-border overflow-hidden flex flex-col h-full shadow-lg hover:shadow-primary/20 transition-all duration-300 group">
      <CardHeader className="p-0">
        <div className="relative">
          <Image
            src={school.imageUrl || 'https://picsum.photos/seed/school/600/400'}
            alt={`Campus of ${name}`}
            width={600}
            height={400}
            data-ai-hint={school.imageHint || 'school campus'}
            className="w-full h-48 object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
           <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/90 px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest border border-white/10 text-white">
            {approvals}
          </div>
          {score && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-primary px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
              <ShieldCheck className="size-3" /> Score: {score}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-5 flex-grow space-y-4">
        <div>
            <CardTitle className="text-xl mb-1.5 tracking-tight normal-case text-white leading-tight">
            <Link href={`/schools/${school.id}`} className="hover:text-primary transition-colors">
                {name}
            </Link>
            </CardTitle>
            <div className="flex items-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
            <MapPin className="w-3 h-3 mr-1.5 text-primary" />
            <span>{city}, {country}</span>
            </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed font-medium">{summary}</p>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={cn("text-[9px] font-black uppercase rounded-sm bg-white/5", getTacticalColor(rating as string))}>
            Rating: {rating}
          </Badge>
          <Badge variant="outline" className="text-[9px] font-black uppercase rounded-sm bg-white/5 text-primary">
            {curriculum}
          </Badge>
        </div>

        <Separator className="bg-white/5" />
        
        <div className="grid grid-cols-2 gap-y-2">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Class size: <span className="text-white">{classSize}</span></div>
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">NC Time: <span className="text-white">{ncTime}{typeof ncTime === 'number' ? '%' : ''}</span></div>
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

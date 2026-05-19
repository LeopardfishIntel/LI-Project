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
  const schoolId = school.id || (school as any).ID;
  
  const name = school.schoolname || school.name || 'Unknown school';
  const summary = school.summary || school.description || '';
  const curriculum = school.curriculum || school.intel?.curriculum || '—';
  const approvals = school.approvals || school.intel?.accreditation || '—';
  const city = school.city || school.location || '—';
  const country = school.country || '—';
  const rating = school.rating || school.numericalrating || school.intel?.salary?.score || 'neutral';
  const score = school.totalscore || school.score || '';
  const salaryVal = school.intel?.salary?.value ?? '—';
  const savingsVal = school.intel?.savingsPotential?.value ?? '—';

  const dossierUrl = `/schools/${schoolId}`;

  return (
    <Card className="glass bg-[#1f2937]/70 border-white/5 overflow-hidden flex flex-col h-full shadow-lg hover:shadow-[#d95f02]/20 transition-all duration-300 group rounded-sm">
      <CardHeader className="p-0">
        <Link href={dossierUrl} prefetch={false} className="block relative overflow-hidden">
          <Image
            src={school.imageUrl || 'https://picsum.photos/seed/school/600/400'}
            alt={`Campus of ${name}`}
            width={600}
            height={400}
            data-ai-hint={school.imageHint || 'school campus'}
            className="w-full h-48 object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
          />
           <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#020617]/90 px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest border border-white/10 text-white">
            {approvals}
          </div>
          {score && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-[#d95f02] px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
              <ShieldCheck className="size-3" /> Score: {score}
            </div>
          )}
        </Link>
      </CardHeader>
      <CardContent className="p-5 flex-grow space-y-4">
        <div>
            <CardTitle className="text-xl mb-1.5 font-black tracking-tighter normal-case text-white leading-tight uppercase">
            <Link href={dossierUrl} prefetch={false} className="hover:text-[#d95f02] transition-colors">
                {name}
            </Link>
            </CardTitle>
            <div className="flex items-center text-[#94a3b8] text-[10px] font-black uppercase tracking-widest">
            <MapPin className="w-3 h-3 mr-1.5 text-[#d95f02]" />
            <span>{city}, {country}</span>
            </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed font-medium">{summary}</p>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={cn("text-[9px] font-black uppercase rounded-sm bg-white/5 border-white/10", getTacticalColor(rating as string))}>
            Rating: {rating}
          </Badge>
          <Badge variant="outline" className={cn("text-[9px] font-black uppercase rounded-sm bg-white/5 border-white/10", curriculum !== '—' ? "text-[#d95f02]" : "text-muted-foreground")}>
            {curriculum}
          </Badge>
        </div>

        <Separator className="bg-white/5" />
        
        <div className="space-y-1.5">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Finance: <span className="text-white">{salaryVal}</span></p>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Savings: <span className="text-white">{savingsVal}</span></p>
        </div>

      </CardContent>
      <CardFooter className="p-5 pt-0 mt-auto">
        <Button className="w-full bg-[#d95f02] hover:bg-[#d95f02]/90 text-white font-black uppercase tracking-widest text-[10px] h-11 rounded-sm border-0" asChild>
            <Link href={dossierUrl} prefetch={false}>
                View dossier
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

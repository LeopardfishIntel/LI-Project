 "use client";

import { useCollection, useFirestore } from '@/firebase';
import type { School } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";

const scoreColorClasses: Record<string, string> = {
  good: "bg-green-500/10 text-green-400 border-green-500/20",
  neutral: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  bad: "bg-red-500/10 text-red-400 border-red-500/20",
  unknown: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function AdminDataTable() {
  // Protocol: Direct string path for hook stability
  const { data: schools, isLoading } = useCollection<School>('schools');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tighter uppercase italic">Registry Database</h1>
        <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Raw Intel Feed</p>
      </div>

      <div className="rounded-md border border-white/10 bg-card">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow>
              <TableHead className="font-black uppercase text-[10px]">School Name</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Country</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Curriculum</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Salary Intel</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Savings Potential</TableHead>
              <TableHead className="text-right font-black uppercase text-[10px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.map((school) => (
              <TableRow key={school.id} className="hover:bg-white/5 border-white/5">
                <TableCell className="font-bold">{school.name}</TableCell>
                <TableCell className="text-muted-foreground">{school.country}</TableCell>
                <TableCell>{school.intel?.curriculum || school.curriculum || '—'}</TableCell>
                <TableCell>
                  {school.intel?.salary ? (
                    <Badge variant="outline" className={cn(scoreColorClasses[school.intel.salary.score || 'neutral'])}>
                      {school.intel.salary.value}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">No Data</span>
                  )}
                </TableCell>
                <TableCell>
                  {school.intel?.savingsPotential ? (
                    <Badge variant="outline" className={cn(scoreColorClasses[school.intel.savingsPotential.score || 'neutral'])}>
                      {school.intel.savingsPotential.value}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">No Data</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/schools/${school.id}`} className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 font-black text-[10px] uppercase">
                    View <ExternalLink className="h-3 w-3" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
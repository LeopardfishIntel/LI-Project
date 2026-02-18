'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { School } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const scoreColorClasses = {
  good: 'bg-green-500/20 text-green-400 border-green-500/30',
  neutral: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  bad: 'bg-red-500/20 text-red-400 border-red-500/30',
};


export default function DataTablePage() {
  const firestore = useFirestore();
  const schoolsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'schools') : null),
    [firestore]
  );
  const { data: schools, isLoading } = useCollection<School>(schoolsQuery);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-center">
        School Data Table
      </h1>
      <p className="text-muted-foreground mb-12 text-center">
        View and verify all school data from the Firestore database.
      </p>
      {isLoading && (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )}
      {!isLoading && schools && (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>School Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Curriculum</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>Savings Potential</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {schools.map(school => (
                        <TableRow key={school.id}>
                            <TableCell className="font-medium">
                                <Link href={`/schools/${school.id}`} className="hover:underline text-primary">
                                    {school.name}
                                </Link>
                            </TableCell>
                            <TableCell>{school.location}</TableCell>
                            <TableCell>{school.country}</TableCell>
                            <TableCell>{school.intel.curriculum}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className={cn(scoreColorClasses[school.intel.salary.score])}>
                                    {school.intel.salary.value}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={cn(scoreColorClasses[school.intel.savingsPotential.score])}>
                                    {school.intel.savingsPotential.value}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      )}
    </div>
  );
}
